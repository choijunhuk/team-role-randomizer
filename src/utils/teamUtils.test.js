import { describe, expect, it } from 'vitest'
import { assignRoles, createTeams, decodeShareData, encodeShareData, evaluateTeams, validateTeamConstraints } from './teamUtils'

const participants = ['가', '나', '다', '라', '마', '바', '사']
const fairness = { fixedTeams: {}, avoidPairs: [], preferPairs: [], repeatWeight: 8, balanceFields: [] }

describe('team utilities', () => {
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
