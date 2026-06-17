const ROSTER_PATH = '/api/admin/eligible-members'
const ADMIN_STUDENT_IDS = new Set(['2026402040'])

export const ROSTER_ENDPOINT = ROSTER_PATH

function normalizeMember(raw) {
  const name = String(raw?.name ?? '').trim()
  if (!name) return null
  const studentId = String(raw?.studentId ?? '').trim()
  const generation = String(raw?.generation ?? '').trim()
  const admissionYear = Number.isFinite(Number(raw?.admissionYear)) ? Number(raw.admissionYear) : null
  const id = raw?.id == null ? `${studentId}|${name}` : String(raw.id)
  return { id, studentId, name, generation, admissionYear }
}

function hasStudentId(member) {
  return Boolean(String(member?.studentId ?? '').trim())
}

function normalizeGenerationValue(value) {
  const text = String(value ?? '').trim()
  if (!text) return ''
  const numeric = text.match(/^(\d+)\s*기?$/)
  return numeric ? numeric[1] : text.replace(/\s+/g, ' ')
}

export function formatGeneration(value) {
  const normalized = normalizeGenerationValue(value)
  if (!normalized) return ''
  return /^\d+$/.test(normalized) ? `${normalized}기` : normalized
}

function duplicateNameSet(members) {
  const counts = new Map()
  members.forEach((member) => {
    const name = String(member.name ?? '').trim()
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1)
  })
  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name))
}

export async function fetchRoster(fetcher = fetch) {
  let response
  try {
    response = await fetcher(ROSTER_PATH, {
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
  } catch {
    return { ok: false, status: 0, reason: 'network', members: [] }
  }
  if (response.status === 401) return { ok: false, status: 401, reason: 'unauthorized', members: [] }
  if (response.status === 403) return { ok: false, status: 403, reason: 'forbidden', members: [] }
  if (response.status === 404) return { ok: false, status: 404, reason: 'endpoint-missing', members: [] }
  if (!response.ok) return { ok: false, status: response.status, reason: 'request-failed', members: [] }
  const data = await response.json().catch(() => null)
  const list = Array.isArray(data) ? data : []
  const members = list.map(normalizeMember).filter(Boolean)
  return { ok: true, status: response.status, members }
}

export function searchRoster(members, query) {
  const term = String(query ?? '').trim().toLowerCase()
  if (!term) return members
  return members.filter((member) => (
    member.name.toLowerCase().includes(term)
    || member.studentId.toLowerCase().includes(term)
    || member.generation.toLowerCase().includes(term)
    || formatGeneration(member.generation).toLowerCase().includes(term)
    || String(member.admissionYear ?? '').includes(term)
    || String(member.admissionYear ?? '').slice(-2).includes(term)
  ))
}

export function getRosterGenerationOptions(members) {
  return [...new Set(members.map((member) => normalizeGenerationValue(member.generation)).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'ko-KR', { numeric: true }))
    .map((value) => ({ value, label: formatGeneration(value) }))
}

export function filterRoster(members, { query = '', generation = '' } = {}) {
  const generationFilter = normalizeGenerationValue(generation)
  const byGeneration = generationFilter
    ? members.filter((member) => normalizeGenerationValue(member.generation) === generationFilter)
    : members
  return searchRoster(byGeneration, query)
}

export function formatRosterIdentifier(member) {
  const studentId = String(member?.studentId ?? '').trim()
  const generation = formatGeneration(member?.generation)
  if (studentId) return `학번 ${studentId}`
  if (generation) return `기수 ${generation}`
  return '식별자 없음'
}

export function formatRosterParticipant(member) {
  const name = String(member?.name ?? '').trim()
  const studentId = String(member?.studentId ?? '').trim()
  const generation = formatGeneration(member?.generation)
  if (studentId) return `${name} (${studentId})`
  if (generation) return `${name} (${generation})`
  return name
}

export function dedupeAgainst(members, existingNames = []) {
  const taken = new Set(existingNames.map((name) => String(name).trim()))
  return members.filter((member) => !taken.has(formatRosterParticipant(member)))
}

export function filterRosterByStatus(members, existingNames = [], status = 'available') {
  if (status === 'all') return members
  if (status === 'available') return dedupeAgainst(members, existingNames)
  if (status === 'added') {
    const available = new Set(dedupeAgainst(members, existingNames).map((member) => member.id))
    return members.filter((member) => !available.has(member.id))
  }
  if (status === 'student-id') return members.filter(hasStudentId)
  if (status === 'generation-only') return members.filter((member) => !hasStudentId(member))
  if (status === 'duplicate-name') {
    const duplicateNames = duplicateNameSet(members)
    return members.filter((member) => duplicateNames.has(String(member.name ?? '').trim()))
  }
  return dedupeAgainst(members, existingNames)
}

export function summarizeRoster(members, existingNames = []) {
  const added = members.length - dedupeAgainst(members, existingNames).length
  const counts = new Map()
  members.forEach((member) => {
    const generation = formatGeneration(member.generation) || '기수 미상'
    counts.set(generation, (counts.get(generation) ?? 0) + 1)
  })
  const generations = [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ko-KR', { numeric: true }))
  const duplicateNames = duplicateNameSet(members).size
  return {
    total: members.length,
    added,
    available: members.length - added,
    withStudentId: members.filter(hasStudentId).length,
    generationOnly: members.filter((member) => !hasStudentId(member)).length,
    duplicateNames,
    generations,
  }
}

const csvCell = (value) => {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function rosterToCsv(members) {
  const rows = members.map((member) => [
    formatRosterParticipant(member),
    member.name,
    member.studentId,
    member.generation,
    member.admissionYear ?? '',
  ].map(csvCell).join(','))
  return ['participantLabel,name,studentId,generation,admissionYear', ...rows].join('\n')
}

export function isAdminUser(user) {
  const role = String(user?.role ?? '').toUpperCase()
  const studentId = String(user?.studentId ?? '').trim()
  return role === 'ADMIN' || ADMIN_STUDENT_IDS.has(studentId)
}

// Adding participants from the club roster is restricted to the listed
// student IDs only — the generic ADMIN role does not grant roster access.
export function isRosterManager(user) {
  const studentId = String(user?.studentId ?? '').trim()
  return ADMIN_STUDENT_IDS.has(studentId)
}
