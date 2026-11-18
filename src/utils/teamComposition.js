import { parseParticipantLabel } from './participants'

// Deterministic palette for per-team color coding. Hue spread around the
// color wheel keeps adjacent teams visually distinct while staying tasteful.
const TEAM_HUES = [211, 145, 28, 280, 0, 188, 50, 330, 95, 255]

export function teamAccent(index) {
  const hue = TEAM_HUES[((index % TEAM_HUES.length) + TEAM_HUES.length) % TEAM_HUES.length]
  return {
    hue,
    color: `hsl(${hue} 70% 45%)`,
    soft: `hsl(${hue} 70% 45% / 0.12)`,
    border: `hsl(${hue} 70% 45% / 0.42)`,
  }
}

const FIELD_LABELS = {
  grade: '학년',
  major: '전공',
  level: '수준',
  preference: '희망 분야',
  generation: '기수',
  studentId: '학번',
}

export function fieldLabel(field) {
  return FIELD_LABELS[field] ?? field
}

// Resolve a profile value for a member, falling back to the identifier parsed
// from the participant label (so generation/student-id work without a profile).
function resolveValue(name, field, profiles = {}) {
  const profile = profiles[name] ?? {}
  const direct = profile[field]
  if (direct != null && String(direct).trim()) return field === 'preference' ? ({ hard: '하드', soft: '소프트', any: '상관없음' }[direct] ?? String(direct).trim()) : String(direct).trim()
  if (field === 'generation' || field === 'studentId') {
    const parsed = parseParticipantLabel(name)
    if (field === 'generation' && parsed.identifierType === 'generation') return parsed.identifier
    if (field === 'studentId' && parsed.identifierType === 'student-id') return parsed.identifier
  }
  return ''
}

// Build a distribution (value -> count) for one field across a member list.
export function distributionForField(members, field, profiles = {}) {
  const counts = new Map()
  members.forEach((member) => {
    const value = resolveValue(member.name, field, profiles)
    const key = value || '미입력'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  })
  const total = members.length || 1
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count, ratio: count / total }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'ko'))
}

// Returns true if a field has at least one real (non-empty) value among members.
function fieldHasData(allMembers, field, profiles) {
  return allMembers.some((member) => resolveValue(member.name, field, profiles))
}

// Summarise team composition for the balance-visualization panel. Only fields
// with at least some real data are included so empty bars never clutter the UI.
export function getTeamComposition(teams, profiles = {}, candidateFields = ['grade', 'major', 'level', 'generation', 'preference']) {
  if (!Array.isArray(teams) || teams.length === 0) return { fields: [], teams: [] }
  const allMembers = teams.flatMap((team) => team.members ?? [])
  const fields = candidateFields.filter((field) => fieldHasData(allMembers, field, profiles))

  const teamSummaries = teams.map((team, index) => {
    const members = team.members ?? []
    return {
      id: team.id ?? index,
      name: team.name ?? `${index + 1}팀`,
      size: members.length,
      accent: teamAccent(index),
      distributions: fields.map((field) => ({
        field,
        label: fieldLabel(field),
        segments: distributionForField(members, field, profiles),
      })),
    }
  })

  return { fields, teams: teamSummaries }
}

// Lock a set of team ids and re-shuffle only the remaining members across the
// unlocked teams, preserving locked rosters exactly. Pure: relies on injected
// rng/builder so it stays deterministic in tests.
export function rerollUnlockedTeams(teams, lockedIds, builder) {
  const locked = new Set(lockedIds ?? [])
  const lockedTeams = teams.filter((team) => locked.has(team.id))
  const unlockedTeams = teams.filter((team) => !locked.has(team.id))
  if (unlockedTeams.length === 0) return teams

  const lockedNames = new Set(lockedTeams.flatMap((team) => (team.members ?? []).map((m) => m.name)))
  const freeMembers = unlockedTeams.flatMap((team) => team.members ?? []).filter((m) => !lockedNames.has(m.name))
  const freeNames = freeMembers.map((m) => m.name)

  // builder(names, count) -> array of name arrays (one per unlocked team)
  const distributed = builder(freeNames, unlockedTeams.length, unlockedTeams)
  const byName = new Map(freeMembers.map((m) => [m.name, m]))

  let cursor = 0
  return teams.map((team) => {
    if (locked.has(team.id)) return team
    const names = distributed[cursor] ?? []
    cursor += 1
    return { ...team, members: names.map((name) => byName.get(name) ?? { name, role: '' }) }
  })
}
