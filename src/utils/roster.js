const ROSTER_PATH = '/api/admin/eligible-members'

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
  ))
}

export function dedupeAgainst(members, existingNames = []) {
  const taken = new Set(existingNames.map((name) => String(name).trim()))
  return members.filter((member) => !taken.has(String(member.name).trim()))
}

export function isAdminUser(user) {
  const role = String(user?.role ?? '').toUpperCase()
  return role === 'ADMIN'
}
