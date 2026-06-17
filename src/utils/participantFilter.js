import { parseParticipantLabel } from './participants'

// Filter participant labels by a free-text query. Matches against the display
// name, the identifier (student-id / generation), and any profile field values
// (grade, major, level). Case-insensitive, whitespace-tolerant.
export function filterParticipants(participants, query, profiles = {}) {
  const term = String(query ?? '').trim().toLowerCase()
  if (!term) return participants
  return participants.filter((name) => {
    const parsed = parseParticipantLabel(name)
    const haystacks = [
      name,
      parsed.name,
      parsed.identifier,
      ...Object.values(profiles[name] ?? {}),
    ]
    return haystacks.some((value) => String(value ?? '').toLowerCase().includes(term))
  })
}
