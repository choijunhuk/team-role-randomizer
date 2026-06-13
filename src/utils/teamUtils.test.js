import { describe, expect, it } from 'vitest'
import { assignRoles, createTeams, decodeShareData, encodeShareData, evaluateTeams } from './teamUtils'

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
})
