import { normalizePreference } from './participants'

export function shuffle(items) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

const hasPair = (pairs, first, second) => pairs.some((pair) => pair.includes(first) && pair.includes(second))
const pairKey = (first, second) => [first, second].sort().join('|')

export function evaluateTeams(teams, fairness = {}, histories = [], profiles = {}) {
  const avoidPairs = fairness.avoidPairs ?? []
  const preferPairs = fairness.preferPairs ?? []
  const priorPairs = new Map()
  histories.forEach((history) => history.teams?.forEach((team) => team.members?.forEach((member, index, members) => {
    members.slice(index + 1).forEach((other) => {
      const key = pairKey(member.name, other.name)
      priorPairs.set(key, (priorPairs.get(key) ?? 0) + 1)
    })
  })))

  let score = 0
  const violations = []
  const breakdown = { avoidViolations: 0, preferMatches: 0, repeatPenalty: 0, balancePenalty: 0, score: 0 }
  const details = { preferMatches: [], repeatedPairs: [], balanceClusters: [] }
  teams.forEach((team) => {
    team.forEach((person, index) => team.slice(index + 1).forEach((other) => {
      if (hasPair(avoidPairs, person, other)) {
        score += 1000
        breakdown.avoidViolations += 1
        violations.push(`${person}님과 ${other}님이 같은 팀 금지 조건을 위반했습니다.`)
      }
      if (hasPair(preferPairs, person, other)) {
        score -= 30
        breakdown.preferMatches += 1
        details.preferMatches.push({ pair: [person, other].sort(), bonus: 30 })
      }
      const repeatCount = priorPairs.get(pairKey(person, other)) ?? 0
      const repeatPenalty = repeatCount * Number(fairness.repeatWeight ?? 8)
      if (repeatPenalty > 0) {
        score += repeatPenalty
        breakdown.repeatPenalty += repeatPenalty
        details.repeatedPairs.push({ pair: [person, other].sort(), count: repeatCount, penalty: repeatPenalty })
      }
    }))

    ;(fairness.balanceFields ?? []).forEach((field) => {
      const counts = {}
      team.forEach((name) => {
        const value = profiles[name]?.[field]?.trim()
        if (value) counts[value] = (counts[value] ?? 0) + 1
      })
      Object.entries(counts).forEach(([value, count]) => {
        const penalty = Math.max(0, count - 1) * 6
        if (penalty > 0) {
          score += penalty
          breakdown.balancePenalty += penalty
          details.balanceClusters.push({ field, value, count, penalty })
        }
      })
    })
  })

  breakdown.score = score
  return { score, violations: [...new Set(violations)], breakdown, details }
}

export function preferenceFor(name, profiles = {}, roleRules = {}) {
  const profile = normalizePreference(profiles[name]?.preference)
  const fixedRole = normalizePreference(roleRules[name]?.fixed)
  return profile && profile !== 'any' ? profile : fixedRole || profile || 'any'
}

export function profilesWithAssignedCategories(teams, profiles = {}, roleRules = {}) {
  const effective = { ...profiles }
  for (const member of teams.flatMap((team) => team.members ?? [])) {
    const category = normalizePreference(member.role)
    if (preferenceFor(member.name, profiles, roleRules) === 'any' && (category === 'hard' || category === 'soft')) {
      effective[member.name] = { ...profiles[member.name], preference: category }
    }
  }
  return effective
}

export function preferenceBuckets(participants, capacities, fixedTeams = {}, profiles = {}, roleRules = {}) {
  const hard = participants.filter((name) => preferenceFor(name, profiles, roleRules) === 'hard')
  const soft = participants.filter((name) => preferenceFor(name, profiles, roleRules) === 'soft')
  if (!hard.length || !soft.length) return null
  const fixed = capacities.map(() => [])
  for (const [name, number] of Object.entries(fixedTeams)) {
    const index = Number(number) - 1
    if (participants.includes(name) && Number.isInteger(index) && index >= 0 && index < fixed.length) fixed[index].push(name)
  }
  const choices = capacities.map((capacity, index) => {
    const sides = new Set(fixed[index].map((name) => preferenceFor(name, profiles, roleRules)).filter((side) => side !== 'any'))
    if (fixed[index].length > capacity || sides.size > 1) return []
    return sides.size ? [...sides] : ['hard', 'soft']
  })
  const freeSeats = capacities.map((capacity, index) => capacity - fixed[index].length)
  const fixedNames = new Set(fixed.flat())
  const freeHard = hard.filter((name) => !fixedNames.has(name)).length
  const freeSoft = soft.filter((name) => !fixedNames.has(name)).length
  const totalFree = freeSeats.reduce((total, seats) => total + seats, 0)
  let possible = new Map([[0, []]])
  freeSeats.forEach((seats, index) => {
    const next = new Map()
    for (const [used, selected] of shuffle([...possible])) {
      for (const side of shuffle(choices[index])) {
        const size = used + (side === 'hard' ? seats : 0)
        if (!next.has(size)) next.set(size, [...selected, side])
      }
    }
    possible = next
  })
  const valid = [...possible].filter(([hardSeats]) => hardSeats >= freeHard && totalFree - hardSeats >= freeSoft)
  if (!valid.length) return null
  const sides = shuffle(valid)[0][1]
  const teams = fixed.map((names) => [...names])
  const assigned = new Set(teams.flat())
  for (const [group, side] of [[hard, 'hard'], [soft, 'soft'], [participants.filter((name) => preferenceFor(name, profiles, roleRules) === 'any'), 'any']]) {
    for (const name of shuffle(group.filter((person) => !assigned.has(person)))) {
      const available = teams.map((team, index) => ({ team, index })).filter(({ team, index }) => team.length < capacities[index] && (side === 'any' || sides[index] === side))
      const smallest = Math.min(...available.map(({ team }) => team.length))
      shuffle(available.filter(({ team }) => team.length === smallest))[0].team.push(name)
    }
  }
  return teams
}

export function validateTeamConstraints(participants, teamCount, fairness = {}, profiles = {}, roleRules = {}) {
  const count = Math.max(1, Math.min(Number(teamCount) || 1, participants.length || 1))
  const capacities = Array.from({ length: count }, (_, index) =>
    Math.floor(participants.length / count) + (index < participants.length % count ? 1 : 0),
  )
  const fixedByTeam = new Map()
  const errors = []
  const blockingErrors = []
  const block = (message) => { errors.push(message); blockingErrors.push(message) }
  Object.entries(fairness.fixedTeams ?? {}).forEach(([name, teamNumber]) => {
    const teamIndex = Number(teamNumber) - 1
    if (!participants.includes(name) || !teamNumber) return
    if (!Number.isInteger(teamIndex) || teamIndex < 0 || teamIndex >= count) {
      block(`${name}님의 고정 팀 번호를 확인해주세요.`)
      return
    }
    const list = fixedByTeam.get(teamIndex) ?? []
    list.push(name)
    fixedByTeam.set(teamIndex, list)
  })

  fixedByTeam.forEach((names, teamIndex) => {
    if (names.length > capacities[teamIndex]) {
      block(`${teamIndex + 1}팀에 고정된 참가자가 정원 ${capacities[teamIndex]}명을 초과했습니다.`)
    }
  })

  ;(fairness.avoidPairs ?? []).forEach(([first, second]) => {
    const firstTeam = Number(fairness.fixedTeams?.[first])
    const secondTeam = Number(fairness.fixedTeams?.[second])
    if (firstTeam && firstTeam === secondTeam && participants.includes(first) && participants.includes(second)) {
      errors.push(`${first}님과 ${second}님은 같은 ${firstTeam}팀에 고정되어 같은 팀 금지 조건을 만족할 수 없습니다.`)
    }
  })

  for (const name of participants) {
    const preferred = normalizePreference(profiles[name]?.preference)
    const fixed = normalizePreference(roleRules[name]?.fixed)
    if (preferred && preferred !== 'any' && fixed && fixed !== 'any' && preferred !== fixed) {
      block(`${name}님의 희망 분야와 고정 역할이 서로 다릅니다.`)
    }
  }
  const hard = participants.some((name) => preferenceFor(name, profiles, roleRules) === 'hard')
  const soft = participants.some((name) => preferenceFor(name, profiles, roleRules) === 'soft')
  if (hard && soft && !preferenceBuckets(participants, capacities, fairness.fixedTeams, profiles, roleRules)) {
    block('하드와 소프트를 분리할 수 없습니다. 팀 개수와 고정 팀 배정을 확인해주세요.')
  }

  const warnings = []
  if ((fairness.avoidPairs ?? []).length) {
    warnings.push(`금지 조건 ${(fairness.avoidPairs ?? []).length}개가 있어 무작위 시도 후에도 위반이 남을 수 있습니다.`)
  }
  if ((fairness.balanceFields ?? []).length) {
    warnings.push('속성 균형은 입력된 참가자 속성만 기준으로 계산됩니다.')
  }

  return { errors, blockingErrors, warnings }
}

function makeCandidate(participants, teamCount, fairness, profiles, roleRules) {
  const capacities = Array.from({ length: teamCount }, (_, index) =>
    Math.floor(participants.length / teamCount) + (index < participants.length % teamCount ? 1 : 0),
  )
  const separated = preferenceBuckets(participants, capacities, fairness.fixedTeams, profiles, roleRules)
  if (separated) return separated
  const teams = Array.from({ length: teamCount }, () => [])
  const fixedNames = new Set()

  shuffle(Object.entries(fairness.fixedTeams ?? {})).forEach(([name, teamNumber]) => {
    const teamIndex = Number(teamNumber) - 1
    if (participants.includes(name) && teamIndex >= 0 && teamIndex < teamCount && teams[teamIndex].length < capacities[teamIndex]) {
      teams[teamIndex].push(name)
      fixedNames.add(name)
    }
  })

  shuffle(participants.filter((name) => !fixedNames.has(name))).forEach((person) => {
    const available = teams.map((team, index) => ({ team, index })).filter(({ team, index }) => team.length < capacities[index])
    const minSize = Math.min(...available.map(({ team }) => team.length))
    const balanced = available.filter(({ team }) => team.length <= minSize + 1)
    shuffle(balanced)[0].team.push(person)
  })
  return teams
}

export function createTeams(participants, teamCount, fairness = {}, histories = [], profiles = {}, roleRules = {}) {
  const count = Math.max(1, Math.min(teamCount, participants.length))
  const errors = validateTeamConstraints(participants, count, fairness, profiles, roleRules).blockingErrors
  if (errors.length) throw new Error(errors[0])
  let bestTeams = null
  let bestEvaluation = null
  const attempts = Math.min(300, Math.max(60, participants.length * 12))

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const candidate = makeCandidate(participants, count, fairness, profiles, roleRules)
    const evaluation = evaluateTeams(candidate, fairness, histories, profiles)
    if (!bestEvaluation || evaluation.score < bestEvaluation.score) {
      bestTeams = candidate
      bestEvaluation = evaluation
    }
  }

  return {
    teams: bestTeams.map((members, index) => ({
      id: crypto.randomUUID(),
      name: `${index + 1}팀`,
      members: members.map((name) => ({ name, role: '' })),
    })),
    evaluation: bestEvaluation,
  }
}

// Distribute a flat list of names into `count` balanced buckets (shuffled).
// Used by the "lock teams and reroll the rest" feature.
export function balancedBuckets(names, count) {
  const total = Math.max(1, count)
  const capacities = Array.from({ length: total }, (_, index) =>
    Math.floor(names.length / total) + (index < names.length % total ? 1 : 0),
  )
  const buckets = Array.from({ length: total }, () => [])
  shuffle(names).forEach((name) => {
    const available = buckets
      .map((bucket, index) => ({ bucket, index }))
      .filter(({ bucket, index }) => bucket.length < capacities[index])
    const minSize = Math.min(...available.map(({ bucket }) => bucket.length))
    const balanced = available.filter(({ bucket }) => bucket.length <= minSize)
    shuffle(balanced)[0].bucket.push(name)
  })
  return buckets
}

export function assignRoles(team, roles, roleRules = {}, profiles = {}) {
  const available = shuffle(roles)
  const used = new Set()
  const sides = new Set(team.members.map((member) => preferenceFor(member.name, profiles, roleRules)))
  const configured = shuffle(['hard', 'soft'].filter((category) => roles.some((role) => normalizePreference(role) === category && team.members.some((member) => !(roleRules[member.name]?.excluded ?? []).includes(role)))))
  const side = sides.has('hard') && !sides.has('soft') ? 'hard' : sides.has('soft') && !sides.has('hard') ? 'soft' : configured[0] ?? ''
  const members = team.members.map((member) => {
    const fixed = roleRules[member.name]?.fixed
    if (fixed && roles.includes(fixed) && !used.has(fixed) && (!side || !['hard', 'soft'].includes(normalizePreference(fixed)) || normalizePreference(fixed) === side)) {
      used.add(fixed)
      return { ...member, role: fixed }
    }
    return { ...member, role: '' }
  })

  members.forEach((member) => {
    if (member.role) return
    const excluded = roleRules[member.name]?.excluded ?? []
    const role = available.find((item) => !used.has(item) && !excluded.includes(item) && (!side || !['hard', 'soft'].includes(normalizePreference(item)) || normalizePreference(item) === side))
    if (role) used.add(role)
    member.role = role ?? ''
  })
  return { ...team, members }
}

export function resultToText(teams, title = '랜덤 팀 배정 결과') {
  const lines = [`[${title}]`, '']
  teams.forEach((team) => {
    lines.push(team.name)
    team.members.forEach(({ name, role }) => lines.push(`- ${name}${role ? `: ${role}` : ''}`))
    lines.push('')
  })
  return lines.join('\n').trim()
}

export function encodeShareData(data) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))))
}

export function decodeShareData(value) {
  return JSON.parse(decodeURIComponent(escape(atob(value))))
}
