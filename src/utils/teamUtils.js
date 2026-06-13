export function shuffle(items) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

const hasPair = (pairs, first, second) => pairs.some((pair) => pair.includes(first) && pair.includes(second))

export function evaluateTeams(teams, fairness = {}, histories = [], profiles = {}) {
  const avoidPairs = fairness.avoidPairs ?? []
  const preferPairs = fairness.preferPairs ?? []
  const priorPairs = new Map()
  histories.forEach((history) => history.teams?.forEach((team) => team.members?.forEach((member, index, members) => {
    members.slice(index + 1).forEach((other) => {
      const key = [member.name, other.name].sort().join('|')
      priorPairs.set(key, (priorPairs.get(key) ?? 0) + 1)
    })
  })))

  let score = 0
  const violations = []
  teams.forEach((team) => {
    team.forEach((person, index) => team.slice(index + 1).forEach((other) => {
      if (hasPair(avoidPairs, person, other)) {
        score += 1000
        violations.push(`${person}님과 ${other}님이 같은 팀 금지 조건을 위반했습니다.`)
      }
      if (hasPair(preferPairs, person, other)) score -= 30
      score += (priorPairs.get([person, other].sort().join('|')) ?? 0) * Number(fairness.repeatWeight ?? 8)
    }))

    ;(fairness.balanceFields ?? []).forEach((field) => {
      const counts = {}
      team.forEach((name) => {
        const value = profiles[name]?.[field]?.trim()
        if (value) counts[value] = (counts[value] ?? 0) + 1
      })
      score += Object.values(counts).reduce((sum, count) => sum + Math.max(0, count - 1) * 6, 0)
    })
  })

  return { score, violations: [...new Set(violations)] }
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
