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

export function encodeInvite(payload) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
}

export function decodeInvite(value) {
  return JSON.parse(decodeURIComponent(escape(atob(value))))
}

export function buildInviteUrl({ studentIds, message, host, displayName }) {
  const payload = {
    v: 1,
    studentIds: studentIds.map(normalizeStudentId).filter(Boolean),
    message: String(message ?? '').slice(0, 280),
    host: host ? String(host).slice(0, 60) : '',
    displayName: displayName ? String(displayName).slice(0, 60) : '',
    issuedAt: Date.now(),
  }
  const base = `${location.origin}${location.pathname}`
  return `${base}#invite=${encodeURIComponent(encodeInvite(payload))}`
}

export function readInviteFromLocation(hash = location.hash) {
  const params = new URLSearchParams(hash.slice(1))
  const raw = params.get('invite')
  if (!raw) return null
  try {
    const payload = decodeInvite(raw)
    if (!Array.isArray(payload?.studentIds)) return null
    return payload
  } catch {
    return null
  }
}

export function matchesStudentId(payload, user) {
  const target = normalizeStudentId(user?.studentId)
  if (!target) return false
  return payload.studentIds.some((value) => normalizeStudentId(value) === target)
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
      headers: { 'Content-Type': 'application/json' },
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
  const seed = `${invite?.host ?? ''}|${invite?.issuedAt ?? ''}|${(invite?.studentIds ?? []).join(',')}|${invite?.message ?? ''}`
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0
  }
  return `local-${(hash >>> 0).toString(36)}`
}

function parseIssuedAt(value) {
  if (value == null) return Date.now()
  if (typeof value === 'number') return value
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? Date.now() : parsed
}

function normalizeInvite(raw) {
  if (!raw) return null
  const studentIds = (raw.studentIds ?? raw.targets ?? []).map(normalizeStudentId).filter(Boolean)
  const remoteId = raw.id ?? raw.notificationId
  const invite = {
    studentIds,
    message: String(raw.message ?? '').slice(0, 300),
    host: String(raw.host ?? raw.from ?? '').slice(0, 60),
    displayName: String(raw.displayName ?? raw.actorLabel ?? raw.hostName ?? '').slice(0, 60),
    issuedAt: parseIssuedAt(raw.issuedAt ?? raw.createdAt),
    inviteUrl: String(raw.inviteUrl ?? raw.acceptUrl ?? ''),
    seenAt: raw.seenAt ? Number(raw.seenAt) : raw.read ? Date.now() : null,
    remoteId: remoteId == null ? null : String(remoteId),
  }
  if (!studentIds.length && !invite.remoteId) return null
  invite.token = raw.token
    ? String(raw.token)
    : invite.remoteId
      ? `coms-${invite.remoteId}`
      : inviteToken(invite)
  return invite
}

export async function fetchInviteInbox(fetcher = fetch) {
  try {
    const response = await fetcher(INBOX_PATH, { credentials: 'same-origin' })
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

export async function markInviteRead(remoteId, fetcher = fetch) {
  if (!remoteId) return { ok: false, status: 0, reason: 'no-id' }
  try {
    const response = await fetcher(`${INBOX_PATH}/${encodeURIComponent(remoteId)}/read`, {
      method: 'PATCH',
      credentials: 'same-origin',
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
