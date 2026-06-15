import { describe, expect, it, vi } from 'vitest'
import {
  INVITE_INBOX_PATH,
  INVITE_NOTIFY_PATH,
  decodeInvite,
  encodeInvite,
  fetchAllNotifications,
  fetchInviteInbox,
  findAmbiguousGenerationTargets,
  formatAmbiguousInviteTargetMessage,
  inviteToken,
  markAllNotificationsRead,
  matchesStudentId,
  mergeInvites,
  mergeSentInvites,
  normalizeStudentId,
  parseInviteTargets,
  parseStudentIds,
  postInviteNotification,
  readInviteFromLocation,
  removeInviteByToken,
} from './invite'

const buildResponse = (status, body, extra = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  ...extra,
})

describe('invite utilities', () => {
  it('normalizes student ids by stripping non-alphanumerics', () => {
    expect(normalizeStudentId(' 2025-1234 ')).toBe('20251234')
    expect(normalizeStudentId('20259999\n')).toBe('20259999')
    expect(normalizeStudentId(undefined)).toBe('')
  })

  it('parses mixed-delimiter input into a unique student id list', () => {
    const ids = parseStudentIds('20251234, 2025-1234\n20259999;20240001\t20240001')
    expect(ids).toEqual(['20251234', '20259999', '20240001'])
  })

  it('parses invite targets written as name plus student id or generation', () => {
    const result = parseInviteTargets('김민수 (2025-1234)\n이정원 (17기)\n20259999')
    expect(result.errors).toEqual([])
    expect(result.studentIds).toEqual(['20251234', '20259999'])
    expect(result.targets).toEqual([
      { label: '김민수 (20251234)', name: '김민수', identifier: '20251234', identifierType: 'studentId', studentId: '20251234' },
      { label: '이정원 (17기)', name: '이정원', identifier: '17기', identifierType: 'generation', generation: '17기' },
      { label: '20259999', name: '', identifier: '20259999', identifierType: 'studentId', studentId: '20259999' },
    ])
  })

  it('treats bare numeric identifiers in parentheses as student ids, not generations', () => {
    const result = parseInviteTargets('최준혁 (2026402040)')
    expect(result.errors).toEqual([])
    expect(result.studentIds).toEqual(['2026402040'])
    expect(result.targets).toEqual([
      { label: '최준혁 (2026402040)', name: '최준혁', identifier: '2026402040', identifierType: 'studentId', studentId: '2026402040' },
    ])
  })

  it('detects same-name same-generation invite targets from the roster', () => {
    const result = parseInviteTargets('이정원 (17기)')
    const ambiguous = findAmbiguousGenerationTargets(result.targets, [
      { name: '이정원', generation: '17', studentId: '20170001' },
      { name: '이정원', generation: '17기', studentId: '20170002' },
      { name: '이정원', generation: '18기', studentId: '20180001' },
    ])
    expect(ambiguous).toEqual([{ name: '이정원', generation: '17기', count: 2 }])
  })

  it('explains same-name same-generation ambiguity with the exact target label', () => {
    expect(formatAmbiguousInviteTargetMessage({ name: '김민수', generation: '17기', count: 2 }))
      .toBe('김민수 (17기)는 같은 이름/같은 기수 사람이 있을 수 있어서 COMS 계정을 특정할 수 없습니다. 학번으로 입력해주세요.')
  })

  it('round-trips invite payloads through encode/decode', () => {
    const payload = { v: 1, studentIds: ['20251234'], message: '한글 메시지', host: '20240001', displayName: '홍길동', issuedAt: 1 }
    expect(decodeInvite(encodeInvite(payload))).toEqual(payload)
  })

  it('reads an invite from a location hash and rejects malformed values', () => {
    const payload = { v: 1, studentIds: ['20251234'], message: '', host: '', displayName: '', issuedAt: 1 }
    const hash = `#invite=${encodeURIComponent(encodeInvite(payload))}`
    expect(readInviteFromLocation(hash)).toEqual(payload)
    expect(readInviteFromLocation('#invite=not-base64')).toBeNull()
    expect(readInviteFromLocation('#share=abc')).toBeNull()
  })

  it('matches the current user only when their studentId is in the invite', () => {
    const payload = { studentIds: ['2025-1234', '20259999'] }
    expect(matchesStudentId(payload, { studentId: '20251234' })).toBe(true)
    expect(matchesStudentId(payload, { studentId: '20240001' })).toBe(false)
    expect(matchesStudentId(payload, {})).toBe(false)
  })

  it('posts the COMS member-invite contract with recipientStudentIds, actorLabel and X-Requested-With', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 404 })
    const result = await postInviteNotification({
      studentIds: ['2025-1234', '20259999'],
      message: 'hi',
      host: '20240001',
      displayName: '홍길동',
      inviteUrl: 'https://example.test/#invite=abc',
    }, fetcher)
    expect(fetcher).toHaveBeenCalledWith(INVITE_NOTIFY_PATH, expect.objectContaining({
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({
        recipientStudentIds: ['20251234', '20259999'],
        actorLabel: '홍길동',
        message: 'hi',
        acceptUrl: 'https://example.test/#invite=abc',
      }),
    }))
    expect(result).toEqual({ ok: false, status: 404, reason: 'endpoint-missing' })
  })

  it('maps 429 to request-failed so the UI can show the rate-limit warning', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 429 })
    const result = await postInviteNotification({ studentIds: ['20251234'] }, fetcher)
    expect(result).toEqual({ ok: false, status: 429, reason: 'request-failed' })
  })

  it('skips network calls when no targets remain after normalization', async () => {
    const fetcher = vi.fn()
    const result = await postInviteNotification({ studentIds: ['', '!!'] }, fetcher)
    expect(fetcher).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: false, status: 0, reason: 'no-targets' })
  })

  it('returns accepted/unknown/rejected counts when the COMS endpoint succeeds', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ accepted: 2, unknown: ['99'], rejected: 1 }),
    })
    const result = await postInviteNotification({ studentIds: ['20251234'] }, fetcher)
    expect(result).toEqual({ ok: true, status: 200, accepted: 2, unknown: ['99'], rejected: 1 })
  })

  it('maps 401 to unauthorized so the UI can prompt the COMS login', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 401 })
    const result = await postInviteNotification({ studentIds: ['20251234'] }, fetcher)
    expect(result).toEqual({ ok: false, status: 401, reason: 'unauthorized' })
  })

  it('reports a network failure when fetch throws', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('boom'))
    const result = await postInviteNotification({ studentIds: ['20251234'] }, fetcher)
    expect(result).toEqual({ ok: false, status: 0, reason: 'network' })
  })

  it('derives stable invite tokens from invite content', () => {
    const a = inviteToken({ host: '20240001', issuedAt: 1, studentIds: ['20251234'], message: 'hi' })
    const b = inviteToken({ host: '20240001', issuedAt: 1, studentIds: ['20251234'], message: 'hi' })
    const c = inviteToken({ host: '20240001', issuedAt: 2, studentIds: ['20251234'], message: 'hi' })
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })

  it('fetches /api/notifications and keeps only EXTERNAL_INVITE rows', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ([
        { id: 11, type: 'EXTERNAL_INVITE', acceptUrl: 'https://example.test/#invite=abc', actorLabel: '홍길동', message: '같이해요', read: false, createdAt: '2026-06-14T05:00:00' },
        { id: 12, type: 'COMMENT_ON_POST', message: '댓글', read: true, createdAt: '2026-06-13T00:00:00' },
      ]),
    })
    const result = await fetchInviteInbox(fetcher)
    expect(fetcher).toHaveBeenCalledWith(INVITE_INBOX_PATH, {
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
    expect(result.ok).toBe(true)
    expect(result.invites).toHaveLength(1)
    expect(result.invites[0]).toMatchObject({
      remoteId: '11',
      displayName: '홍길동',
      inviteUrl: 'https://example.test/#invite=abc',
      token: 'coms-11',
    })
  })

  it('returns endpoint-missing on inbox 404 without throwing', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) })
    const result = await fetchInviteInbox(fetcher)
    expect(result).toEqual({ ok: false, status: 404, reason: 'endpoint-missing', invites: [] })
  })

  it('returns unauthorized when COMS rejects the inbox request', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) })
    const result = await fetchInviteInbox(fetcher)
    expect(result).toEqual({ ok: false, status: 401, reason: 'unauthorized', invites: [] })
  })

  it('merges invites by token and preserves prior seenAt timestamps', () => {
    const base = { studentIds: ['20251234'], host: '20240001', message: 'hi', issuedAt: 1 }
    const seen = mergeInvites([], [base])[0]
    expect(seen.seenAt).toBeNull()
    const merged = mergeInvites([{ ...seen, seenAt: 99 }], [base])
    expect(merged).toHaveLength(1)
    expect(merged[0].seenAt).toBe(99)
  })

  it('prefers COMS remote ids over content hashes when merging', () => {
    const incoming = { id: 42, type: 'EXTERNAL_INVITE', actorLabel: '홍길동', message: 'hi', createdAt: '2026-06-14T00:00:00', acceptUrl: 'https://example.test/' }
    const merged = mergeInvites([], [incoming])
    expect(merged).toHaveLength(1)
    expect(merged[0].token).toBe('coms-42')
  })

  it('hydrates host from actorStudentId on EXTERNAL_INVITE notifications', () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ([
        { id: 99, type: 'EXTERNAL_INVITE', actorLabel: '홍길동', actorStudentId: '20240001', message: 'hi', read: false, createdAt: '2026-06-14T00:00:00', acceptUrl: 'https://example.test/' },
      ]),
    })
    return fetchInviteInbox(fetcher).then((result) => {
      expect(result.invites[0].host).toBe('20240001')
    })
  })

  it('allows invite hash payloads with generation targets even when student ids are absent', () => {
    const generationOnly = encodeInvite({
      v: 1,
      studentIds: [],
      targets: [{ label: '이정원 (17기)', name: '이정원', identifier: '17기', identifierType: 'generation', generation: '17기' }],
      message: '',
      host: '',
      displayName: '',
      issuedAt: 1,
    })
    expect(readInviteFromLocation(`#invite=${encodeURIComponent(generationOnly)}`)).toMatchObject({
      studentIds: [],
      targets: [{ label: '이정원 (17기)', name: '이정원', identifierType: 'generation', generation: '17기' }],
    })
  })

  it('exposes buildResponse helper without breaking inbox tests', () => {
    expect(typeof buildResponse).toBe('function')
  })

  it('fetches all notification types for the bell, normalizing fields', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ([
        { id: 7, type: 'EXTERNAL_INVITE', actorLabel: '홍길동', actorStudentId: '20240001', message: '같이해요', acceptUrl: 'https://example.test/', read: false, createdAt: '2026-06-14T05:00:00' },
        { id: 8, type: 'NOTICE_CREATED', message: '새 공지', read: true, createdAt: '2026-06-13T00:00:00' },
        { type: 'IGNORED_BECAUSE_NO_ID', message: 'skip' },
      ]),
    })
    const result = await fetchAllNotifications(fetcher)
    expect(fetcher).toHaveBeenCalledWith(INVITE_INBOX_PATH, {
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
    expect(result.ok).toBe(true)
    expect(result.items).toHaveLength(2)
    expect(result.items[0]).toMatchObject({ id: '7', type: 'EXTERNAL_INVITE', actorStudentId: '20240001', read: false })
    expect(result.items[1]).toMatchObject({ id: '8', type: 'NOTICE_CREATED', read: true })
  })

  it('marks all notifications read via PATCH /api/notifications/read-all', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 204 })
    const result = await markAllNotificationsRead(fetcher)
    expect(fetcher).toHaveBeenCalledWith(`${INVITE_INBOX_PATH}/read-all`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
    expect(result).toEqual({ ok: true, status: 204 })
  })

  it('merges sent invites by token while preserving normalized recipients', () => {
    const generated = mergeSentInvites([], [{
      studentIds: ['2025-1234', '20251234', '20259999'],
      message: '같이해요',
      inviteUrl: 'https://example.test/#invite=abc',
      status: 'generated',
      createdAt: 10,
    }])
    const sent = mergeSentInvites(generated, [{
      studentIds: ['20251234', '20259999'],
      message: '같이해요',
      inviteUrl: 'https://example.test/#invite=abc',
      status: 'sent',
      accepted: 1,
      unknown: ['20259999'],
      rejected: 0,
      updatedAt: 20,
    }])

    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({
      studentIds: ['20251234', '20259999'],
      targetCount: 2,
      status: 'sent',
      accepted: 1,
      unknown: ['20259999'],
      rejected: 0,
      createdAt: 10,
      updatedAt: 20,
    })
  })

  it('removes invites by stable token without mutating other invites', () => {
    const first = { token: 'sent-a', message: '삭제할 초대' }
    const second = { token: 'sent-b', message: '남길 초대' }

    expect(removeInviteByToken([first, second], first)).toEqual([second])
    expect(removeInviteByToken([first, second], 'sent-b')).toEqual([first])
  })
})
