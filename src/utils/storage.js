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
}

export function getUserWorkspace(user) {
  const id = getStableAccountId(user)
  if (!id) return null
  const label = getAccountLabel(user)
  return { id, label, prefix: `team-randomizer:${id}` }
}

const storageKey = (key, workspace) => {
  const baseKey = KEYS[key]
  return workspace?.prefix ? `${workspace.prefix}:${baseKey}` : baseKey
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
