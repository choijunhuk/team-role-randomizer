export const SHARED_ROOM_PATH = '/api/team-randomizer/rooms'

const cloneJson = (value, fallback) => {
  try {
    return JSON.parse(JSON.stringify(value ?? fallback))
  } catch {
    return fallback
  }
}

const normalizeList = (items) => Array.isArray(items)
  ? items.map((item) => String(item ?? '').trim()).filter(Boolean)
  : []

function normalizeSnapshot(raw) {
  if (!raw) return null
  const roomId = String(raw.roomId ?? raw.id ?? '').trim()
  const roomName = String(raw.roomName ?? raw.name ?? '').trim()
  if (!roomId || !roomName) return null
  return {
    version: Number(raw.version ?? 1),
    roomId,
    roomName,
    ownerStudentId: String(raw.ownerStudentId ?? '').trim(),
    ownerName: String(raw.ownerName ?? '').trim(),
    participants: normalizeList(raw.participants),
    profiles: cloneJson(raw.profiles, {}),
    roles: normalizeList(raw.roles),
    roleRules: cloneJson(raw.roleRules, {}),
    fairness: cloneJson(raw.fairness, {}),
    histories: Array.isArray(raw.histories) ? cloneJson(raw.histories, []) : [],
    updatedAt: Number(raw.updatedAt ?? Date.now()),
  }
}

export function buildRoomSnapshot({
  room,
  currentUser,
  participants = [],
  profiles = {},
  roles = [],
  roleRules = {},
  fairness = {},
  histories = [],
} = {}, now = Date.now()) {
  const roomId = String(room?.id ?? '').trim()
  const roomName = String(room?.name ?? '').trim()
  if (!roomId || !roomName) return null
  return normalizeSnapshot({
    version: 1,
    roomId,
    roomName,
    ownerStudentId: currentUser?.studentId ?? '',
    ownerName: currentUser?.name ?? '',
    participants,
    profiles,
    roles,
    roleRules,
    fairness,
    histories,
    updatedAt: now,
  })
}

const requestHeaders = { 'X-Requested-With': 'XMLHttpRequest' }
const jsonHeaders = { 'Content-Type': 'application/json', ...requestHeaders }

function mapFailure(status) {
  return status === 401 || status === 403 ? 'unauthorized'
    : status === 404 ? 'endpoint-missing'
      : 'request-failed'
}

function withMode(result) {
  return { ...result, mode: result.ok ? 'shared' : 'local' }
}

export async function publishRoomSnapshot(snapshot, fetcher = fetch) {
  const normalized = normalizeSnapshot(snapshot)
  if (!normalized) return { ok: false, status: 0, reason: 'no-room', mode: 'local' }
  try {
    const response = await fetcher(`${SHARED_ROOM_PATH}/${encodeURIComponent(normalized.roomId)}`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: jsonHeaders,
      body: JSON.stringify(normalized),
    })
    if (!response.ok) {
      return withMode({ ok: false, status: response.status, reason: mapFailure(response.status) })
    }
    const data = await response.json().catch(() => normalized)
    return withMode({ ok: true, status: response.status, snapshot: normalizeSnapshot(data) ?? normalized })
  } catch {
    return { ok: false, status: 0, reason: 'network', mode: 'local' }
  }
}

export async function fetchRoomSnapshot(roomId, fetcher = fetch) {
  const id = String(roomId ?? '').trim()
  if (!id) return { ok: false, status: 0, reason: 'no-room', mode: 'local', snapshot: null }
  try {
    const response = await fetcher(`${SHARED_ROOM_PATH}/${encodeURIComponent(id)}`, {
      credentials: 'same-origin',
      headers: requestHeaders,
    })
    if (!response.ok) {
      return { ok: false, status: response.status, reason: mapFailure(response.status), mode: 'local', snapshot: null }
    }
    const data = await response.json().catch(() => null)
    const snapshot = normalizeSnapshot(data)
    return snapshot
      ? { ok: true, status: response.status, mode: 'shared', snapshot }
      : { ok: false, status: response.status, reason: 'invalid-snapshot', mode: 'local', snapshot: null }
  } catch {
    return { ok: false, status: 0, reason: 'network', mode: 'local', snapshot: null }
  }
}

export function getSharedRoomMode(result) {
  if (result?.mode === 'shared') return '공유 모드'
  if (result?.reason === 'unauthorized') return '로그인 확인 필요'
  if (result?.reason === 'network') return '네트워크 확인 필요'
  return '로컬 모드'
}
