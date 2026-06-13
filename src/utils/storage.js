const KEYS = {
  participants: 'team-randomizer-participants',
  roles: 'team-randomizer-roles',
  histories: 'team-randomizer-histories',
  theme: 'team-randomizer-theme',
  fairness: 'team-randomizer-fairness',
  profiles: 'team-randomizer-profiles',
  roleRules: 'team-randomizer-role-rules',
  settings: 'team-randomizer-settings',
}

export function loadData(key, fallback) {
  try {
    const value = localStorage.getItem(KEYS[key])
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

export function saveData(key, value) {
  localStorage.setItem(KEYS[key], JSON.stringify(value))
}

export function clearAllData() {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key))
}
