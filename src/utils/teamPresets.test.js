import { describe, expect, it } from 'vitest'
import { applyTeamPreset, TEAM_PRESETS } from './teamPresets'

const fairness = {
  fixedTeams: { 민수: '1' },
  avoidPairs: [['민수', '지수']],
  preferPairs: [['도윤', '서연']],
  repeatWeight: 8,
  balanceFields: [],
}

describe('teamPresets', () => {
  it('exposes practical Korean presets', () => {
    expect(TEAM_PRESETS.map((preset) => preset.label)).toEqual(['균형 우선', '중복 최소', '친한 사람 같이', '빠른 랜덤'])
  })

  it('applies presets without discarding explicit pair and fixed-team rules', () => {
    const next = applyTeamPreset(fairness, 'balanced')

    expect(next.fixedTeams).toEqual(fairness.fixedTeams)
    expect(next.avoidPairs).toEqual(fairness.avoidPairs)
    expect(next.preferPairs).toEqual(fairness.preferPairs)
    expect(next.repeatWeight).toBe(8)
    expect(next.balanceFields).toEqual(['grade', 'major', 'level'])
  })

  it('supports a fast random preset through existing fairness fields', () => {
    const next = applyTeamPreset(fairness, 'fast')

    expect(next).toMatchObject({
      fixedTeams: fairness.fixedTeams,
      avoidPairs: fairness.avoidPairs,
      preferPairs: fairness.preferPairs,
      repeatWeight: 0,
      balanceFields: [],
    })
  })
})

