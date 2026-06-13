const encodePart = (value) => encodeURIComponent(String(value).trim())

function stableField(user) {
  const candidates = [
    ['studentId', user?.studentId],
    ['id', user?.id],
    ['email', user?.email],
  ]
  return candidates.find(([, value]) => String(value || '').trim())
    || null
}

export function getStableAccountId(user) {
  const field = stableField(user)
  return field ? `${field[0]}:${encodePart(field[1])}` : ''
}

export function getAccountLabel(user) {
  return user?.name || user?.studentId || user?.email || 'COMS 사용자'
}
