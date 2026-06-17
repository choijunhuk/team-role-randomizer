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

export function validateTeamConstraints(participants, teamCount, fairness = {}) {
  const count = Math.max(1, Math.min(Number(teamCount) || 1, participants.length || 1))
  const capacities = Array.from({ length: count }, (_, index) =>
    Math.floor(participants.length / count) + (index < participants.length % count ? 1 : 0),
  )
  const fixedByTeam = new Map()
  Object.entries(fairness.fixedTeams ?? {}).forEach(([name, teamNumber]) => {
    const teamIndex = Number(teamNumber) - 1
    if (!participants.includes(name) || teamIndex < 0 || teamIndex >= count) return
    const list = fixedByTeam.get(teamIndex) ?? []
    list.push(name)
    fixedByTeam.set(teamIndex, list)
  })

  const errors = []
  fixedByTeam.forEach((names, teamIndex) => {
    if (names.length > capacities[teamIndex]) {
      errors.push(`${teamIndex + 1}팀에 고정된 참가자가 정원 ${capacities[teamIndex]}명을 초과했습니다.`)
    }
  })

  ;(fairness.avoidPairs ?? []).forEach(([first, second]) => {
    const firstTeam = Number(fairness.fixedTeams?.[first])
    const secondTeam = Number(fairness.fixedTeams?.[second])
    if (firstTeam && firstTeam === secondTeam && participants.includes(first) && participants.includes(second)) {
      errors.push(`${first}님과 ${second}님은 같은 ${firstTeam}팀에 고정되어 같은 팀 금지 조건을 만족할 수 없습니다.`)
    }
  })

  const warnings = []
  if ((fairness.avoidPairs ?? []).length) {
    warnings.push(`금지 조건 ${(fairness.avoidPairs ?? []).length}개가 있어 무작위 시도 후에도 위반이 남을 수 있습니다.`)
  }
  if ((fairness.balanceFields ?? []).length) {
    warnings.push('속성 균형은 입력된 참가자 속성만 기준으로 계산됩니다.')
  }

  return { errors, warnings }
}

function makeCandidate(participants, teamCount, fairness) {
  const capacities = Array.from({ length: teamCount }, (_, index) =>
    Math.floor(participants.length / teamCount) + (index < participants.length % teamCount ? 1 : 0),
  )
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

export function createTeams(participants, teamCount, fairness = {}, histories = [], profiles = {}) {
  const count = Math.max(1, Math.min(teamCount, participants.length))
  let bestTeams = null
  let bestEvaluation = null
  const attempts = Math.min(300, Math.max(60, participants.length * 12))

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const candidate = makeCandidate(participants, count, fairness)
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

export function assignRoles(team, roles, roleRules = {}) {
  const available = shuffle(roles)
  const used = new Set()
  const members = team.members.map((member) => {
    const fixed = roleRules[member.name]?.fixed
    if (fixed && roles.includes(fixed) && !used.has(fixed)) {
      used.add(fixed)
      return { ...member, role: fixed }
    }
    return { ...member, role: '' }
  })

  members.forEach((member) => {
    if (member.role) return
    const excluded = roleRules[member.name]?.excluded ?? []
    const role = available.find((item) => !used.has(item) && !excluded.includes(item))
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
