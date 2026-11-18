import { describe, expect, it } from 'vitest'
import { assignRoles, balancedBuckets, createTeams, decodeShareData, encodeShareData, evaluateTeams, profilesWithAssignedCategories, validateTeamConstraints } from './teamUtils'

describe('balancedBuckets', () => {
  it('distributes names as evenly as possible', () => {
    const buckets = balancedBuckets(['a', 'b', 'c', 'd', 'e'], 2)
    expect(buckets).toHaveLength(2)
    const sizes = buckets.map((b) => b.length).sort()
    expect(sizes).toEqual([2, 3])
    expect(buckets.flat().sort()).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
  it('handles more buckets than names', () => {
    const buckets = balancedBuckets(['a'], 3)
    expect(buckets.flat()).toEqual(['a'])
    expect(buckets).toHaveLength(3)
  })
  it('treats a zero count as a single bucket', () => {
    expect(balancedBuckets(['a', 'b'], 0).flat().sort()).toEqual(['a', 'b'])
  })
})

const participants = ['가', '나', '다', '라', '마', '바', '사']
const fairness = { fixedTeams: {}, avoidPairs: [], preferPairs: [], repeatWeight: 8, balanceFields: [] }

describe('team utilities', () => {
  it('keeps hard and software teams separate while distributing flexible people', () => {
    const names = Array.from({ length: 10 }, (_, index) => `person${index}`)
    const profiles = Object.fromEntries(names.map((name, index) => [name, { preference: index < 4 ? 'hard' : index < 7 ? 'soft' : 'any' }]))
    for (let run = 0; run < 50; run++) {
      const { teams } = createTeams(names, 3, fairness, [], profiles)
      expect(teams.flatMap(team => team.members.map(member => member.name)).sort()).toEqual([...names].sort())
      expect(Math.max(...teams.map(team => team.members.length)) - Math.min(...teams.map(team => team.members.length))).toBeLessThanOrEqual(1)
      for (const team of teams) {
        const sides = team.members.map(member => profiles[member.name].preference)
        expect(sides.includes('hard') && sides.includes('soft')).toBe(false)
      }
    }
  })

  it('rejects one mixed team or conflicting fixed teams before changing results', () => {
    const names = ['hard1', 'soft1', 'any1', 'any2']
    const profiles = { hard1: { preference: 'hard' }, soft1: { preference: 'soft' } }
    expect(validateTeamConstraints(names, 1, fairness, profiles).errors[0]).toMatch(/하드.*소프트/)
    const fixed = { ...fairness, fixedTeams: { hard1: 1, soft1: 1 } }
    expect(validateTeamConstraints(names, 2, fixed, profiles).errors[0]).toMatch(/하드.*소프트.*고정/)
    expect(() => createTeams(names, 2, fixed, [], profiles)).toThrow()
  })

  it('accounts for fixed flexible people occupying the only hard seats', () => {
    const names = ['hard1', 'hard2', 'soft1', 'soft2', 'any1', 'any2']
    const profiles = { hard1: { preference: 'hard' }, hard2: { preference: 'hard' }, soft1: { preference: 'soft' }, soft2: { preference: 'soft' } }
    const fixed = { ...fairness, fixedTeams: { any1: 1, any2: 1 } }
    expect(validateTeamConstraints(names, 2, fixed, profiles).errors[0]).toMatch(/하드.*소프트/)
    expect(() => createTeams(names, 2, fixed, [], profiles)).toThrow()
  })

  it('never gives the opposite category role to a separated team', () => {
    const team = { members: [{ name: 'hard1' }, { name: 'any1' }] }
    const profiles = { hard1: { preference: 'hard' } }
    for (let run = 0; run < 20; run++) {
      expect(assignRoles(team, ['하드', '소프트', '발표자'], {}, profiles).members.map(({ role }) => role)).not.toContain('소프트')
    }
  })

  it('chooses one category for an all-flexible team when category roles are available', () => {
    const team = { members: [{ name: 'any1' }, { name: 'any2' }, { name: 'any3' }] }
    for (let run = 0; run < 50; run++) {
      const assigned = assignRoles(team, ['하드', '소프트', '발표자'])
      const categories = assigned.members.map(({ role }) => role).filter((role) => role === '하드' || role === '소프트')
      expect(new Set(categories).size).toBeLessThanOrEqual(1)
    }
    const excluded = { any1: { excluded: ['하드'] }, any2: { excluded: ['하드'] }, any3: { excluded: ['하드'] } }
    expect(assignRoles(team, ['하드', '소프트', '발표자'], excluded).members.map(({ role }) => role)).not.toContain('하드')
  })

  it('rejects overflowing and invalid fixed team numbers while preserving soft avoid-pair reporting', () => {
    const names = ['a', 'b', 'c', 'd']
    expect(validateTeamConstraints(names, 2, { fixedTeams: { a: 1, b: 1, c: 1 } }).blockingErrors).toHaveLength(1)
    expect(() => createTeams(names, 2, { fixedTeams: { a: 1, b: 1, c: 1 } })).toThrow(/정원/)
    expect(() => createTeams(names, 2, { fixedTeams: { a: '1.5' } })).toThrow(/고정 팀 번호/)
    const soft = validateTeamConstraints(names, 2, { fixedTeams: { a: 1, b: 1 }, avoidPairs: [['a', 'b']] })
    expect(soft.blockingErrors).toEqual([])
    expect(soft.errors).toHaveLength(1)
  })

  it('treats assigned category roles as transient reroll preferences without altering saved profiles', () => {
    const profiles = { any1: { preference: 'any' }, any2: { preference: 'any' } }
    const teams = [{ members: [{ name: 'any1', role: '하드' }, { name: 'any2', role: '소프트' }, { name: 'hard1', role: '' }, { name: 'soft1', role: '' }] }]
    const effective = profilesWithAssignedCategories(teams, profiles)
    expect(profiles).toEqual({ any1: { preference: 'any' }, any2: { preference: 'any' } })
    expect(effective.any1.preference).toBe('hard')
    expect(effective.any2.preference).toBe('soft')
    for (let run = 0; run < 20; run++) {
      const result = createTeams(['any1', 'any2', 'hard1', 'soft1'], 2, fairness, [], effective)
      for (const team of result.teams) {
        const sides = team.members.map(({ name }) => effective[name]?.preference)
        expect(sides.includes('hard') && sides.includes('soft')).toBe(false)
      }
    }
  })

  it('uses a hard or software fixed role as a preference only when one is defined', () => {
    const names = ['hard1', 'soft1', 'any1', 'any2']
    const rules = { hard1: { fixed: '하드' }, soft1: { fixed: '소프트' }, any1: { fixed: '발표자' } }
    for (let run = 0; run < 15; run++) {
      const result = createTeams(names, 2, fairness, [], {}, rules)
      for (const team of result.teams) expect(team.members.map(member => rules[member.name]?.fixed)).not.toEqual(expect.arrayContaining(['하드', '소프트']))
    }
  })
  it('creates balanced teams', () => {
    const { teams } = createTeams(participants, 3, fairness)
    const sizes = teams.map((team) => team.members.length)
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
    expect(teams.flatMap((team) => team.members.map((member) => member.name)).sort()).toEqual([...participants].sort())
  })

  it('respects fixed teams and reports impossible avoid rules', () => {
    const configured = { ...fairness, fixedTeams: { 가: 1, 나: 1 }, avoidPairs: [['가', '나']] }
    const { teams, evaluation } = createTeams(participants, 3, configured)
    expect(teams[0].members.map((member) => member.name)).toEqual(expect.arrayContaining(['가', '나']))
    expect(evaluation.violations).toHaveLength(1)
  })

  it('assigns unique roles and respects exclusions', () => {
    const team = { members: [{ name: '가' }, { name: '나' }, { name: '다' }] }
    const assigned = assignRoles(team, ['발표', '서기', '리뷰'], { 가: { fixed: '발표' }, 나: { excluded: ['서기'] } })
    expect(new Set(assigned.members.map((member) => member.role)).size).toBe(3)
    expect(assigned.members.find((member) => member.name === '가').role).toBe('발표')
    expect(assigned.members.find((member) => member.name === '나').role).not.toBe('서기')
  })

  it('round-trips shared data', () => {
    const data = { teams: [{ name: '1팀', members: [{ name: '김민수', role: '발표' }] }] }
    expect(decodeShareData(encodeShareData(data))).toEqual(data)
  })

  it('penalizes repeated team combinations', () => {
    const history = [{ teams: [{ members: [{ name: '가' }, { name: '나' }] }] }]
    expect(evaluateTeams([['가', '나']], fairness, history).score).toBeGreaterThan(evaluateTeams([['가'], ['나']], fairness, history).score)
  })

  it('explains fairness scoring with a breakdown', () => {
    const configured = {
      ...fairness,
      preferPairs: [['가', '나']],
      repeatWeight: 8,
      balanceFields: ['major'],
    }
    const history = [{ teams: [{ members: [{ name: '가' }, { name: '나' }] }] }]
    const profiles = { 가: { major: '컴공' }, 나: { major: '컴공' }, 다: { major: '수학' } }

    const evaluation = evaluateTeams([['가', '나'], ['다']], configured, history, profiles)

    expect(evaluation.breakdown).toMatchObject({
      avoidViolations: 0,
      preferMatches: 1,
      repeatPenalty: 8,
      balancePenalty: 6,
      score: -16,
    })
    expect(evaluation.details.preferMatches).toEqual([{ pair: ['가', '나'], bonus: 30 }])
    expect(evaluation.details.repeatedPairs).toEqual([{ pair: ['가', '나'], count: 1, penalty: 8 }])
  })

  it('preflights impossible team constraints before random assignment', () => {
    const configured = {
      ...fairness,
      fixedTeams: { 가: 1, 나: 1, 다: 1 },
      avoidPairs: [['가', '나']],
    }

    const result = validateTeamConstraints(['가', '나', '다', '라'], 2, configured)

    expect(result.errors).toContain('1팀에 고정된 참가자가 정원 2명을 초과했습니다.')
    expect(result.errors).toContain('가님과 나님은 같은 1팀에 고정되어 같은 팀 금지 조건을 만족할 수 없습니다.')
    expect(result.warnings).toContain('금지 조건 1개가 있어 무작위 시도 후에도 위반이 남을 수 있습니다.')
  })
})
