import { getAccountLabel, getStableAccountId } from './account'

const KEYS = {
  participants: 'team-randomizer-participants',
  roles: 'team-randomizer-roles',
  histories: 'team-randomizer-histories',
  theme: 'team-randomizer-theme',
  fairness: 'team-randomizer-fairness',
  profiles: 'team-randomizer-profiles',
  roleRules: 'team-randomizer-role-rules',
  settings: 'team-randomizer-settings',
  inbox: 'team-randomizer-inbox',
  sentInvites: 'team-randomizer-sent-invites',
}

const ROOM_LIST_KEY = 'team-randomizer-rooms'
const ACTIVE_ROOM_KEY = 'team-randomizer-active-room'
export const DEFAULT_ROOM = { id: 'default', name: '기본 방', createdAt: 0 }

export function getUserWorkspace(user) {
  const id = getStableAccountId(user)
  if (!id) return null
  const label = getAccountLabel(user)
  return { id, label, prefix: `team-randomizer:${id}` }
}

const metaKey = (key, workspace) => workspace?.prefix ? `${workspace.prefix}:${key}` : key

const storageKey = (key, workspace) => {
  const baseKey = KEYS[key]
  return workspace?.prefix ? `${workspace.prefix}:${baseKey}` : baseKey
}

function normalizeRoom(raw) {
  const id = String(raw?.id ?? '').trim()
  const name = String(raw?.name ?? '').trim()
  if (!id || !name) return null
  return { id, name, createdAt: Number(raw?.createdAt ?? Date.now()) }
}

export function createRoomRecord(name, now = Date.now(), random = Math.random) {
  const cleanName = String(name ?? '').trim() || '새 방'
  const timePart = Number(now).toString(36)
  const randomPart = Math.floor(random() * 36 ** 4).toString(36).padStart(4, '0')
  return { id: `room-${timePart}-${randomPart}`, name: cleanName.slice(0, 30), createdAt: Number(now) }
}

export function loadRooms(accountWorkspace) {
  try {
    const raw = localStorage.getItem(metaKey(ROOM_LIST_KEY, accountWorkspace))
    const rooms = raw ? JSON.parse(raw).map(normalizeRoom).filter(Boolean) : []
    const withoutDefault = rooms.filter((room) => room.id !== DEFAULT_ROOM.id)
    return [DEFAULT_ROOM, ...withoutDefault]
  } catch {
    return [DEFAULT_ROOM]
  }
}

export function saveRooms(accountWorkspace, rooms) {
  const normalized = rooms.map(normalizeRoom).filter(Boolean)
  const withoutDefault = normalized.filter((room) => room.id !== DEFAULT_ROOM.id)
  localStorage.setItem(metaKey(ROOM_LIST_KEY, accountWorkspace), JSON.stringify([DEFAULT_ROOM, ...withoutDefault]))
}

export function loadActiveRoomId(accountWorkspace) {
  const activeRoomId = localStorage.getItem(metaKey(ACTIVE_ROOM_KEY, accountWorkspace))
  return activeRoomId || DEFAULT_ROOM.id
}

export function saveActiveRoomId(accountWorkspace, roomId) {
  localStorage.setItem(metaKey(ACTIVE_ROOM_KEY, accountWorkspace), String(roomId || DEFAULT_ROOM.id))
}

export function getRoomWorkspace(accountWorkspace, room = DEFAULT_ROOM) {
  const normalized = normalizeRoom(room) ?? DEFAULT_ROOM
  const prefix = normalized.id === DEFAULT_ROOM.id
    ? accountWorkspace.prefix
    : `${accountWorkspace.prefix}:room:${normalized.id}`
  return {
    ...accountWorkspace,
    room: normalized,
    label: `${accountWorkspace.label} · ${normalized.name}`,
    prefix,
  }
}

export function loadData(key, fallback, workspace) {
  try {
    const value = localStorage.getItem(storageKey(key, workspace))
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

export function saveData(key, value, workspace) {
  localStorage.setItem(storageKey(key, workspace), JSON.stringify(value))
}

export function clearAllData(workspace) {
  Object.keys(KEYS).forEach((key) => localStorage.removeItem(storageKey(key, workspace)))
}

export function deleteRoom(accountWorkspace, roomId) {
  if (!roomId || roomId === DEFAULT_ROOM.id) return loadRooms(accountWorkspace)
  const rooms = loadRooms(accountWorkspace).filter((room) => room.id !== roomId)
  const targetWorkspace = getRoomWorkspace(accountWorkspace, { id: roomId, name: roomId })
  clearAllData(targetWorkspace)
  saveRooms(accountWorkspace, rooms)
  if (loadActiveRoomId(accountWorkspace) === roomId) saveActiveRoomId(accountWorkspace, DEFAULT_ROOM.id)
  return rooms
}

export function hasLegacyData() {
  return Object.values(KEYS).some((key) => localStorage.getItem(key) !== null)
}

export function importLegacyData(workspace) {
  if (!workspace?.prefix) return
  Object.keys(KEYS).forEach((key) => {
    const legacyValue = localStorage.getItem(KEYS[key])
    if (legacyValue !== null) localStorage.setItem(storageKey(key, workspace), legacyValue)
  })
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key))
}
