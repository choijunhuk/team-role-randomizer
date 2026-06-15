const NOTIFY_PATH = '/api/notifications/external-invite'
const INBOX_PATH = '/api/notifications'
const EXTERNAL_INVITE_TYPE = 'EXTERNAL_INVITE'

export function normalizeStudentId(value) {
  return String(value ?? '').replace(/[^0-9A-Za-z]/g, '').trim()
}

export function parseStudentIds(raw) {
  return [...new Set(
    String(raw ?? '')
      .split(/[\s,;\t]+/)
      .map(normalizeStudentId)
      .filter(Boolean),
  )]
}

function normalizeName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

function normalizeGeneration(value) {
  const text = String(value ?? '').trim().replace(/\s+/g, '')
  const match = text.match(/^(\d+)기?$/)
  return match ? `${match[1]}기` : ''
}

function uniqueBy(items, keyFn) {
  const seen = new Set()
  return items.filter((item) => {
    const key = keyFn(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function normalizeInviteTarget(raw) {
  if (!raw) return null
  const name = normalizeName(raw.name)
  const identifierType = raw.identifierType === 'generation' ? 'generation' : 'studentId'
  if (identifierType === 'generation') {
    const generation = normalizeGeneration(raw.generation ?? raw.identifier)
    if (!name || !generation) return null
    return { label: `${name} (${generation})`, name, identifier: generation, identifierType, generation }
  }
  const studentId = normalizeStudentId(raw.studentId ?? raw.identifier)
  if (!studentId) return null
  return {
    label: name ? `${name} (${studentId})` : studentId,
    name,
    identifier: studentId,
    identifierType,
    studentId,
  }
}

function normalizeInviteTargets(targets = []) {
  return uniqueBy(
    (Array.isArray(targets) ? targets : []).map(normalizeInviteTarget).filter(Boolean),
    (target) => `${target.identifierType}:${target.name}:${target.identifier}`,
  )
}

function splitInviteTargetInput(raw) {
  return String(raw ?? '')
    .split(/[,\n;]+/)
    .flatMap((chunk) => {
      const text = chunk.trim()
      if (!text) return []
      if (/\([^()]+\)$/.test(text)) return [text]
      return text.split(/\s+/).filter(Boolean)
    })
}

export function parseInviteTargets(raw) {
  const targets = []
  const errors = []

  splitInviteTargetInput(raw).forEach((token) => {
    const wrapped = token.match(/^(.+?)\s*\(([^()]+)\)$/)
    if (wrapped) {
      const name = normalizeName(wrapped[1])
      const identifier = String(wrapped[2] ?? '').trim()
      const generation = /기\s*$/.test(identifier) ? normalizeGeneration(identifier) : ''
      const target = generation
        ? normalizeInviteTarget({ name, identifierType: 'generation', generation })
        : normalizeInviteTarget({ name, identifierType: 'studentId', studentId: identifier })
      if (target) targets.push(target)
      else errors.push(`${token} 형식을 확인해주세요. 예: 홍길동 (20251234), 이정원 (17기)`)
      return
    }

    const studentId = normalizeStudentId(token)
    if (studentId) targets.push(normalizeInviteTarget({ studentId }))
    else errors.push(`${token} 형식을 확인해주세요. 이름 (학번) 또는 이름 (17기)로 입력해주세요.`)
  })

  const normalizedTargets = normalizeInviteTargets(targets)
  return {
    targets: normalizedTargets,
    studentIds: normalizedTargets
      .filter((target) => target.identifierType === 'studentId')
      .map((target) => target.studentId),
    errors,
  }
}

export function findAmbiguousGenerationTargets(targets = [], rosterMembers = []) {
  const counts = new Map()
  rosterMembers.forEach((member) => {
    const name = normalizeName(member?.name)
    const generation = normalizeGeneration(member?.generation)
    if (!name || !generation) return
    const key = `${name}::${generation}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  })

  return uniqueBy(
    targets
      .filter((target) => target.identifierType === 'generation')
      .map((target) => {
        const key = `${normalizeName(target.name)}::${normalizeGeneration(target.generation)}`
        const count = counts.get(key) ?? 0
        return count > 1 ? { name: target.name, generation: target.generation, count } : null
      })
      .filter(Boolean),
    (item) => `${item.name}::${item.generation}`,
  )
}

export function formatAmbiguousInviteTargetMessage(target) {
  return `${target.name} (${target.generation})는 같은 이름/같은 기수 사람이 있을 수 있어서 COMS 계정을 특정할 수 없습니다. 학번으로 입력해주세요.`
}

export function encodeInvite(payload) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
}

export function decodeInvite(value) {
  return JSON.parse(decodeURIComponent(escape(atob(value))))
}

export function buildInviteUrl({ studentIds = [], targets = [], message, host, displayName }) {
  const normalizedTargets = normalizeInviteTargets(targets)
  const targetStudentIds = normalizedTargets
    .filter((target) => target.identifierType === 'studentId')
    .map((target) => target.studentId)
  const normalizedStudentIds = [...new Set([...parseStudentIds(Array.isArray(studentIds) ? studentIds.join('\n') : studentIds), ...targetStudentIds])]
  const payload = {
    v: 1,
    studentIds: normalizedStudentIds,
    targets: normalizedTargets,
    message: String(message ?? '').slice(0, 280),
    host: host ? String(host).slice(0, 60) : '',
    displayName: displayName ? String(displayName).slice(0, 60) : '',
    issuedAt: Date.now(),
  }
  const pathname = location.pathname.replace(/index\.html$/, '')
  const base = `${location.origin}${pathname}`
  const params = new URLSearchParams(location.hash.startsWith('#') ? location.hash.slice(1) : '')
  params.set('invite', encodeInvite(payload))
  return `${base}#${params.toString()}`
}

export function readInviteFromLocation(hash = location.hash) {
  const params = new URLSearchParams(hash.slice(1))
  const raw = params.get('invite')
  if (!raw) return null
  try {
    const payload = decodeInvite(raw)
    const studentIds = parseStudentIds(Array.isArray(payload?.studentIds) ? payload.studentIds.join('\n') : payload?.studentIds)
    const targets = normalizeInviteTargets(payload?.targets)
    if (!studentIds.length && !targets.length) return null
    return targets.length ? { ...payload, studentIds, targets } : { ...payload, studentIds }
  } catch {
    return null
  }
}

export function clearInviteHash() {
  if (typeof window === 'undefined' || !window.history?.replaceState) return
  const params = new URLSearchParams(location.hash.startsWith('#') ? location.hash.slice(1) : '')
  if (!params.has('invite')) return
  params.delete('invite')
  const next = params.toString()
  window.history.replaceState(null, '', `${location.pathname}${location.search}${next ? `#${next}` : ''}`)
}

export function matchesStudentId(payload, user) {
  const target = normalizeStudentId(user?.studentId)
  const studentMatch = target && payload.studentIds?.some((value) => normalizeStudentId(value) === target)
  if (studentMatch) return true
  const name = normalizeName(user?.name)
  const generation = normalizeGeneration(user?.generation)
  if (!name) return false
  return normalizeInviteTargets(payload?.targets).some((item) => (
    item.identifierType === 'generation'
    && normalizeName(item.name) === name
    && (!generation || item.generation === generation)
  ))
}

export async function postInviteNotification(payload, fetcher = fetch) {
  const recipientStudentIds = payload.studentIds.map(normalizeStudentId).filter(Boolean)
  if (!recipientStudentIds.length) {
    return { ok: false, status: 0, reason: 'no-targets' }
  }
  const body = {
    recipientStudentIds,
    actorLabel: (payload.displayName || payload.actorLabel || '').slice(0, 100),
    message: String(payload.message ?? '').slice(0, 300) || '팀 초대가 도착했습니다.',
    acceptUrl: payload.inviteUrl ?? '',
  }
  try {
    const response = await fetcher(NOTIFY_PATH, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify(body),
    })
    if (response.ok) {
      const data = await response.json().catch(() => ({}))
      return {
        ok: true,
        status: response.status,
        accepted: Number(data?.accepted ?? recipientStudentIds.length),
        unknown: Array.isArray(data?.unknown) ? data.unknown : [],
        rejected: Number(data?.rejected ?? 0),
      }
    }
    const reason = response.status === 401 ? 'unauthorized'
      : response.status === 403 ? 'forbidden'
      : response.status === 404 ? 'endpoint-missing'
      : 'request-failed'
    return { ok: false, status: response.status, reason }
  } catch {
    return { ok: false, status: 0, reason: 'network' }
  }
}

export const INVITE_NOTIFY_PATH = NOTIFY_PATH
export const INVITE_INBOX_PATH = INBOX_PATH

export function inviteToken(invite) {
  if (invite?.token) return String(invite.token)
  const targetSeed = normalizeInviteTargets(invite?.targets).map((target) => target.label).join(',')
  const seed = `${invite?.host ?? ''}|${invite?.issuedAt ?? ''}|${(invite?.studentIds ?? []).join(',')}|${targetSeed}|${invite?.message ?? ''}`
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0
  }
  return `local-${(hash >>> 0).toString(36)}`
}

function hashSeed(seed) {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0
  }
  return (hash >>> 0).toString(36)
}

function sentInviteToken(invite) {
  if (invite?.token) return String(invite.token)
  const recipients = (invite?.studentIds ?? []).map(normalizeStudentId).filter(Boolean).sort().join(',')
  const targets = normalizeInviteTargets(invite?.targets).map((target) => target.label).sort().join(',')
  return `sent-${hashSeed(`${invite?.inviteUrl ?? ''}|${recipients}|${targets}|${invite?.message ?? ''}`)}`
}

function normalizeSentInvite(raw) {
  if (!raw) return null
  const rawStudentIds = raw.studentIds ?? []
  const targets = normalizeInviteTargets(raw.targets)
  const studentIds = [...new Set([
    ...parseStudentIds(Array.isArray(rawStudentIds) ? rawStudentIds.join('\n') : rawStudentIds),
    ...targets.filter((target) => target.identifierType === 'studentId').map((target) => target.studentId),
  ])]
  if (!studentIds.length && !targets.length) return null
  const createdAt = Number(raw.createdAt ?? raw.issuedAt ?? Date.now())
  const updatedAt = Number(raw.updatedAt ?? Date.now())
  return {
    token: sentInviteToken({ ...raw, studentIds, targets }),
    studentIds,
    targets,
    targetCount: targets.length || studentIds.length,
    message: String(raw.message ?? '').slice(0, 300),
    inviteUrl: String(raw.inviteUrl ?? raw.acceptUrl ?? ''),
    status: ['generated', 'sent', 'failed'].includes(raw.status) ? raw.status : 'generated',
    accepted: Number(raw.accepted ?? 0),
    unknown: Array.isArray(raw.unknown) ? raw.unknown.map(normalizeStudentId).filter(Boolean) : [],
    rejected: Number(raw.rejected ?? 0),
    reason: raw.reason ? String(raw.reason) : '',
    createdAt,
    updatedAt,
  }
}

export function mergeSentInvites(existing = [], incoming = []) {
  const seen = new Map()
  ;[...existing, ...incoming].forEach((raw) => {
    const invite = normalizeSentInvite(raw)
    if (!invite) return
    const prior = seen.get(invite.token)
    seen.set(invite.token, prior ? { ...prior, ...invite, createdAt: prior.createdAt } : invite)
  })
  return [...seen.values()].sort((a, b) => (b.updatedAt ?? b.createdAt ?? 0) - (a.updatedAt ?? a.createdAt ?? 0))
}

export function removeInviteByToken(invites = [], inviteOrToken) {
  const token = typeof inviteOrToken === 'string' ? inviteOrToken : inviteOrToken?.token
  if (!token) return invites
  return invites.filter((invite) => invite?.token !== token)
}

function parseIssuedAt(value) {
  if (value == null) return Date.now()
  if (typeof value === 'number') return value
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? Date.now() : parsed
}

function normalizeInvite(raw) {
  if (!raw) return null
  const targets = normalizeInviteTargets(raw.targets)
  const studentIds = [...new Set([
    ...(raw.studentIds ?? []).map(normalizeStudentId).filter(Boolean),
    ...targets.filter((target) => target.identifierType === 'studentId').map((target) => target.studentId),
  ])]
  const remoteId = raw.id ?? raw.notificationId
  const invite = {
    studentIds,
    targets,
    message: String(raw.message ?? '').slice(0, 300),
    host: String(raw.host ?? raw.actorStudentId ?? raw.from ?? '').slice(0, 60),
    displayName: String(raw.displayName ?? raw.actorLabel ?? raw.hostName ?? '').slice(0, 60),
    issuedAt: parseIssuedAt(raw.issuedAt ?? raw.createdAt),
    inviteUrl: String(raw.inviteUrl ?? raw.acceptUrl ?? ''),
    seenAt: raw.seenAt ? Number(raw.seenAt) : raw.read ? Date.now() : null,
    remoteId: remoteId == null ? null : String(remoteId),
  }
  if (!studentIds.length && !targets.length && !invite.remoteId) return null
  invite.token = raw.token
    ? String(raw.token)
    : invite.remoteId
      ? `coms-${invite.remoteId}`
      : inviteToken(invite)
  return invite
}

export async function fetchInviteInbox(fetcher = fetch) {
  try {
    const response = await fetcher(INBOX_PATH, {
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
    if (response.status === 401 || response.status === 403) {
      return { ok: false, status: response.status, reason: 'unauthorized', invites: [] }
    }
    if (response.status === 404) return { ok: false, status: 404, reason: 'endpoint-missing', invites: [] }
    if (!response.ok) return { ok: false, status: response.status, reason: 'request-failed', invites: [] }
    const data = await response.json().catch(() => null)
    const list = Array.isArray(data) ? data : Array.isArray(data?.invites) ? data.invites : []
    const invites = list
      .filter((item) => !item?.type || item.type === EXTERNAL_INVITE_TYPE)
      .map(normalizeInvite)
      .filter(Boolean)
    return { ok: true, status: response.status, invites }
  } catch {
    return { ok: false, status: 0, reason: 'network', invites: [] }
  }
}

export async function fetchAllNotifications(fetcher = fetch) {
  try {
    const response = await fetcher(INBOX_PATH, {
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
    if (response.status === 401 || response.status === 403) {
      return { ok: false, status: response.status, reason: 'unauthorized', items: [] }
    }
    if (response.status === 404) return { ok: false, status: 404, reason: 'endpoint-missing', items: [] }
    if (!response.ok) return { ok: false, status: response.status, reason: 'request-failed', items: [] }
    const data = await response.json().catch(() => null)
    const list = Array.isArray(data) ? data : Array.isArray(data?.invites) ? data.invites : []
    const items = list.map((raw) => ({
      id: raw?.id == null ? null : String(raw.id),
      type: String(raw?.type ?? ''),
      message: String(raw?.message ?? ''),
      actorLabel: String(raw?.actorLabel ?? ''),
      actorStudentId: String(raw?.actorStudentId ?? ''),
      acceptUrl: String(raw?.acceptUrl ?? ''),
      postId: raw?.postId ?? null,
      commentId: raw?.commentId ?? null,
      noticeId: raw?.noticeId ?? null,
      read: Boolean(raw?.read),
      createdAt: raw?.createdAt ?? null,
    })).filter((item) => item.id)
    return { ok: true, status: response.status, items }
  } catch {
    return { ok: false, status: 0, reason: 'network', items: [] }
  }
}

export async function markAllNotificationsRead(fetcher = fetch) {
  try {
    const response = await fetcher(`${INBOX_PATH}/read-all`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
    return { ok: response.ok, status: response.status }
  } catch {
    return { ok: false, status: 0, reason: 'network' }
  }
}

export async function markInviteRead(remoteId, fetcher = fetch) {
  if (!remoteId) return { ok: false, status: 0, reason: 'no-id' }
  try {
    const response = await fetcher(`${INBOX_PATH}/${encodeURIComponent(remoteId)}/read`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
    return { ok: response.ok, status: response.status }
  } catch {
    return { ok: false, status: 0, reason: 'network' }
  }
}

export function mergeInvites(existing = [], incoming = []) {
  const seen = new Map()
  ;[...existing, ...incoming].forEach((raw) => {
    const invite = normalizeInvite(raw)
    if (!invite) return
    const prior = seen.get(invite.token)
    seen.set(invite.token, prior ? { ...invite, seenAt: prior.seenAt ?? invite.seenAt } : invite)
  })
  return [...seen.values()].sort((a, b) => (b.issuedAt ?? 0) - (a.issuedAt ?? 0))
}

export function inviteForCurrentUser(invite, user) {
  return matchesStudentId(invite, user)
}
