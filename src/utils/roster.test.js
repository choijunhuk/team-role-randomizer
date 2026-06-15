import { describe, expect, it, vi } from 'vitest'
import { ROSTER_ENDPOINT, dedupeAgainst, fetchRoster, filterRoster, filterRosterByStatus, formatRosterIdentifier, formatRosterParticipant, getRosterGenerationOptions, isAdminUser, rosterToCsv, searchRoster, summarizeRoster } from './roster'

describe('roster utilities', () => {
  it('fetches eligible members and normalizes fields', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ([
        { id: 1, studentId: '20251234', name: '김민수', generation: '23기', admissionYear: 2025, phone: '010-0000-0000' },
        { id: 2, studentId: '', name: '졸업생', generation: '10기', admissionYear: 2012 },
      ]),
    })
    const result = await fetchRoster(fetcher)
    expect(fetcher).toHaveBeenCalledWith(ROSTER_ENDPOINT, {
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
    expect(result.ok).toBe(true)
    expect(result.members).toHaveLength(2)
    expect(result.members[0]).toEqual({ id: '1', studentId: '20251234', name: '김민수', generation: '23기', admissionYear: 2025 })
    expect(result.members[0]).not.toHaveProperty('phone')
    expect(result.members[1].studentId).toBe('')
  })

  it('drops roster entries with no name', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ([{ id: 9, name: '   ' }, { id: 10, name: '정상' }]),
    })
    const result = await fetchRoster(fetcher)
    expect(result.members).toEqual([{ id: '10', studentId: '', name: '정상', generation: '', admissionYear: null }])
  })

  it('maps 401 to unauthorized', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 401 })
    const result = await fetchRoster(fetcher)
    expect(result).toEqual({ ok: false, status: 401, reason: 'unauthorized', members: [] })
  })

  it('maps 403 to forbidden so non-admin users see a friendly message', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 403 })
    const result = await fetchRoster(fetcher)
    expect(result).toEqual({ ok: false, status: 403, reason: 'forbidden', members: [] })
  })

  it('maps 404 to endpoint-missing', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 404 })
    const result = await fetchRoster(fetcher)
    expect(result).toEqual({ ok: false, status: 404, reason: 'endpoint-missing', members: [] })
  })

  it('reports network failures without throwing', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('boom'))
    const result = await fetchRoster(fetcher)
    expect(result).toEqual({ ok: false, status: 0, reason: 'network', members: [] })
  })

  it('searchRoster matches across name, studentId and generation case-insensitively', () => {
    const members = [
      { id: '1', studentId: '20251234', name: '김민수', generation: '23기', admissionYear: 2025 },
      { id: '2', studentId: '20240001', name: '이서연', generation: '22기', admissionYear: 2024 },
      { id: '3', studentId: '20230009', name: '박지훈', generation: '21기', admissionYear: 2023 },
      { id: '4', studentId: '', name: '졸업생', generation: '53기', admissionYear: 2019 },
    ]
    expect(searchRoster(members, '민수')).toHaveLength(1)
    expect(searchRoster(members, '2024')).toHaveLength(1)
    expect(searchRoster(members, '22기')).toHaveLength(1)
    expect(searchRoster(members, '19')).toEqual([members[3]])
    expect(searchRoster(members, '')).toHaveLength(4)
  })

  it('dedupeAgainst removes roster entries whose name is already in participants', () => {
    const members = [
      { id: '1', name: '김민수' },
      { id: '2', name: '이서연' },
    ]
    expect(dedupeAgainst(members, ['이서연'])).toEqual([{ id: '1', name: '김민수' }])
  })

  it('dedupeAgainst uses roster participant labels so duplicate names can coexist', () => {
    const members = [
      { id: '1', name: '김민수', studentId: '20251234' },
      { id: '2', name: '김민수', studentId: '20261234' },
      { id: '3', name: '졸업생', generation: '58기' },
    ]
    expect(dedupeAgainst(members, ['김민수 (20251234)', '졸업생 (58기)'])).toEqual([members[1]])
  })

  it('isAdminUser is case-insensitive', () => {
    expect(isAdminUser({ role: 'ADMIN' })).toBe(true)
    expect(isAdminUser({ role: 'admin' })).toBe(true)
    expect(isAdminUser({ role: 'MEMBER' })).toBe(false)
    expect(isAdminUser(null)).toBe(false)
  })

  it('treats the TeamMate owner student account as an admin', () => {
    expect(isAdminUser({ role: 'MEMBER', studentId: '2026402040' })).toBe(true)
    expect(isAdminUser({ role: 'MEMBER', studentId: ' 2026402040 ' })).toBe(true)
  })

  it('summarizes roster availability and generation counts for admin tools', () => {
    const members = [
      { id: '1', studentId: '20251234', name: '김민수', generation: '23기' },
      { id: '2', studentId: '20240001', name: '이서연', generation: '22기' },
      { id: '3', studentId: '', name: '졸업생', generation: '17' },
    ]

    expect(summarizeRoster(members, ['이서연 (20240001)'])).toEqual({
      total: 3,
      added: 1,
      available: 2,
      withStudentId: 2,
      generationOnly: 1,
      duplicateNames: 0,
      generations: [
        { label: '17기', count: 1 },
        { label: '22기', count: 1 },
        { label: '23기', count: 1 },
      ],
    })
  })

  it('filters roster by query and generation for bulk admin actions', () => {
    const members = [
      { id: '1', studentId: '20251234', name: '김민수', generation: '23기' },
      { id: '2', studentId: '20240001', name: '이서연', generation: '22기' },
      { id: '3', studentId: '20259999', name: '김도윤', generation: '22기' },
    ]

    expect(getRosterGenerationOptions([...members, { id: '4', studentId: '', name: '졸업생', generation: '17' }])).toEqual([
      { value: '17', label: '17기' },
      { value: '22', label: '22기' },
      { value: '23', label: '23기' },
    ])
    expect(filterRoster(members, { query: '김', generation: '22기' })).toEqual([members[2]])
    expect(filterRoster(members, { query: '2025', generation: '' })).toEqual([members[0], members[2]])
  })

  it('filters roster by admin summary status buttons', () => {
    const members = [
      { id: '1', studentId: '20251234', name: '김민수', generation: '23기' },
      { id: '2', studentId: '20261234', name: '김민수', generation: '24기' },
      { id: '3', studentId: '', name: '졸업생', generation: '17' },
    ]

    expect(filterRosterByStatus(members, ['김민수 (20251234)'], 'all')).toEqual(members)
    expect(filterRosterByStatus(members, ['김민수 (20251234)'], 'available')).toEqual([members[1], members[2]])
    expect(filterRosterByStatus(members, ['김민수 (20251234)'], 'added')).toEqual([members[0]])
    expect(filterRosterByStatus(members, [], 'student-id')).toEqual([members[0], members[1]])
    expect(filterRosterByStatus(members, [], 'generation-only')).toEqual([members[2]])
    expect(filterRosterByStatus(members, [], 'duplicate-name')).toEqual([members[0], members[1]])
  })

  it('exports roster rows as safe CSV', () => {
    const members = [
      { studentId: '20251234', name: '김,민수', generation: '23기', admissionYear: 2025 },
      { studentId: '', name: '따옴표"학생', generation: '', admissionYear: null },
    ]

    expect(rosterToCsv(members)).toBe([
      'participantLabel,name,studentId,generation,admissionYear',
      '"김,민수 (20251234)","김,민수",20251234,23기,2025',
      '"따옴표""학생","따옴표""학생",,,',
    ].join('\n'))
  })

  it('counts duplicate names for admin review', () => {
    const members = [
      { id: '1', studentId: '20251234', name: '김민수', generation: '23기' },
      { id: '2', studentId: '20261234', name: '김민수', generation: '24기' },
      { id: '3', studentId: '', name: '졸업생', generation: '58기' },
    ]

    expect(summarizeRoster(members).duplicateNames).toBe(1)
  })

  it('formats roster participants with the best available identifier', () => {
    expect(formatRosterParticipant({ name: '김민수', studentId: '20251234', generation: '23기' })).toBe('김민수 (20251234)')
    expect(formatRosterParticipant({ name: '졸업생', studentId: '', generation: '58' })).toBe('졸업생 (58기)')
    expect(formatRosterParticipant({ name: '기수미상', studentId: '', generation: '' })).toBe('기수미상')
  })

  it('formats roster identity metadata by student id or generation', () => {
    expect(formatRosterIdentifier({ studentId: '20251234', generation: '23기' })).toBe('학번 20251234')
    expect(formatRosterIdentifier({ studentId: '', generation: '17' })).toBe('기수 17기')
    expect(formatRosterIdentifier({ studentId: '', generation: '' })).toBe('식별자 없음')
  })
})
