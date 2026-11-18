export const normalizePreference = (value) => {
  const text = String(value ?? '').replace(/\s/g, '').toLowerCase()
  if (text === '하드' || text === 'hard') return 'hard'
  if (text === '소프트' || text === 'soft' || text === 'software') return 'soft'
  if (text === '상관x' || text === '상관없음' || text === 'any') return 'any'
  return ''
}

const splitInput = (raw) => String(raw ?? '').split('\n').flatMap((line) => {
  const columns = line.split('\t').map((value) => value.trim())
  const preference = columns.length === 2 ? normalizePreference(columns[1]) : ''
  if (preference) return [{ value: columns[0], preference }]
  return line.split(/[\t,]+/).map((value) => ({ value: value.trim(), preference: '' })).filter(({ value }) => value)
})

const normalizeGeneration = (value) => {
  const match = String(value ?? '').trim().match(/^(\d+)\s*기$/)
  return match ? `${match[1]}기` : ''
}

export function parseParticipantLabel(label) {
  const text = String(label ?? '').trim()
  const match = text.match(/^(.*?)\s*\((.*?)\)\s*$/)
  if (!match) {
    return { label: text, name: text, identifier: '', identifierType: 'none', valid: Boolean(text), error: '' }
  }

  const name = match[1].trim()
  const rawIdentifier = match[2].trim()
  if (!name) {
    return { label: text, name: '', identifier: rawIdentifier, identifierType: 'invalid', valid: false, error: `${text}: 이름을 입력해주세요.` }
  }
  if (/^\d+$/.test(rawIdentifier)) {
    return { label: `${name} (${rawIdentifier})`, name, identifier: rawIdentifier, identifierType: 'student-id', valid: true, error: '' }
  }

  const generation = normalizeGeneration(rawIdentifier)
  if (generation) {
    return { label: `${name} (${generation})`, name, identifier: generation, identifierType: 'generation', valid: true, error: '' }
  }

  return {
    label: text,
    name,
    identifier: rawIdentifier,
    identifierType: 'invalid',
    valid: false,
    error: `${text}: 학번은 숫자만, 기수는 17기처럼 입력해주세요.`,
  }
}

export function formatParticipantIdentifier(itemOrLabel) {
  const item = typeof itemOrLabel === 'string' ? parseParticipantLabel(itemOrLabel) : itemOrLabel
  if (item.identifierType === 'student-id') return `학번 ${item.identifier}`
  if (item.identifierType === 'generation') return `기수 ${item.identifier}`
  return '식별자 없음'
}

export function parseParticipantInput(raw) {
  const items = []
  const errors = []
  const preferences = {}
  splitInput(raw).forEach(({ value, preference }) => {
    const item = parseParticipantLabel(value)
    if (item.valid) {
      items.push(item)
      if (preference) preferences[item.label] = preference
    }
    else if (item.error) errors.push(item.error)
  })

  return {
    items,
    names: items.map((item) => item.label),
    preferences,
    errors,
    nameOnlyCount: items.filter((item) => item.identifierType === 'none').length,
  }
}
