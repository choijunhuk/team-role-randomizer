import { describe, expect, it } from 'vitest'
import {
  distributionForField,
  fieldLabel,
  getTeamComposition,
  rerollUnlockedTeams,
  teamAccent,
} from './teamComposition'
import { createTeams, profilesWithAssignedCategories } from './teamUtils'

const team = (id, names) => ({ id, name: `${id}팀`, members: names.map((name) => ({ name, role: '' })) })

describe('teamAccent', () => {
  it('returns a stable hue for the same index', () => {
    expect(teamAccent(0)).toEqual(teamAccent(0))
  })
  it('wraps around the palette and handles negative indices', () => {
    expect(teamAccent(10)).toEqual(teamAccent(0))
    expect(teamAccent(-1).hue).toBeTypeOf('number')
  })
})

describe('fieldLabel', () => {
  it('maps known fields to Korean labels', () => {
    expect(fieldLabel('grade')).toBe('학년')
    expect(fieldLabel('generation')).toBe('기수')
  })
  it('falls back to the raw field name', () => {
    expect(fieldLabel('unknown')).toBe('unknown')
  })
})

describe('distributionForField', () => {
  it('shows stored preference values in Korean', () => {
    const result = distributionForField([{ name: 'a' }, { name: 'b' }], 'preference', { a: { preference: 'hard' }, b: { preference: 'soft' } })
    expect(result.map(({ value }) => value).sort()).toEqual(['소프트', '하드'])
  })
  it('counts profile values and computes ratios', () => {
    const members = [{ name: 'a' }, { name: 'b' }, { name: 'c' }]
    const profiles = { a: { grade: '1학년' }, b: { grade: '1학년' }, c: { grade: '3학년' } }
    const dist = distributionForField(members, 'grade', profiles)
    expect(dist[0]).toEqual({ value: '1학년', count: 2, ratio: 2 / 3 })
    expect(dist.find((d) => d.value === '3학년').count).toBe(1)
  })
  it('labels missing values as 미입력', () => {
    const dist = distributionForField([{ name: 'x' }], 'major', {})
    expect(dist[0].value).toBe('미입력')
  })
  it('derives generation from the participant label when no profile is set', () => {
    const dist = distributionForField([{ name: '정하은 (24기)' }], 'generation', {})
    expect(dist[0].value).toBe('24기')
  })
})

describe('getTeamComposition', () => {
  it('returns empty result for no teams', () => {
    expect(getTeamComposition([])).toEqual({ fields: [], teams: [] })
  })
  it('only includes fields that have real data', () => {
    const teams = [team('1', ['a', 'b']), team('2', ['c'])]
    const profiles = { a: { grade: '1학년' } }
    const result = getTeamComposition(teams, profiles)
    expect(result.fields).toContain('grade')
    expect(result.fields).not.toContain('major')
    expect(result.teams).toHaveLength(2)
    expect(result.teams[0].size).toBe(2)
    expect(result.teams[0].accent.hue).toBeTypeOf('number')
  })
})

describe('rerollUnlockedTeams', () => {
  it('keeps a locked team and separates preferences in every unlocked team', () => {
    const teams = [team('1', ['hard1', 'any1']), team('2', ['hard2', 'hard3']), team('3', ['soft1', 'soft2']), team('4', ['soft3', 'any2'])]
    teams[3].members[1].role = '소프트'
    const profiles = Object.fromEntries(['hard1', 'hard2', 'hard3', 'soft1', 'soft2', 'soft3'].map((name) => [name, { preference: name.startsWith('hard') ? 'hard' : 'soft' }]))
    const effective = profilesWithAssignedCategories(teams, profiles)
    for (let run = 0; run < 20; run++) {
      const result = rerollUnlockedTeams(teams, ['1'], (names, count) => createTeams(names, count, {}, [], effective).teams.map((item) => item.members.map((member) => member.name)))
      expect(result[0]).toBe(teams[0])
      expect(result.flatMap((item) => item.members.map((member) => member.name)).sort()).toEqual(teams.flatMap((item) => item.members.map((member) => member.name)).sort())
      expect(result.flatMap((item) => item.members).find((member) => member.name === 'any2').role).toBe('소프트')
      result.forEach((item) => {
        const preferences = item.members.map((member) => effective[member.name]?.preference)
        expect(preferences.includes('hard') && preferences.includes('soft')).toBe(false)
      })
    }
  })
  // Deterministic builder: round-robin assignment, no randomness.
  const roundRobin = (names, count) => {
    const out = Array.from({ length: count }, () => [])
    names.forEach((name, i) => out[i % count].push(name))
    return out
  }

  it('keeps locked teams untouched and redistributes the rest', () => {
    const teams = [team('1', ['a', 'b']), team('2', ['c', 'd']), team('3', ['e', 'f'])]
    const result = rerollUnlockedTeams(teams, ['1'], roundRobin)
    expect(result[0]).toBe(teams[0]) // locked team identity preserved
    const lockedNames = result[0].members.map((m) => m.name)
    expect(lockedNames).toEqual(['a', 'b'])
    const redistributed = result.slice(1).flatMap((t) => t.members.map((m) => m.name)).sort()
    expect(redistributed).toEqual(['c', 'd', 'e', 'f'])
  })

  it('returns input unchanged when every team is locked', () => {
    const teams = [team('1', ['a']), team('2', ['b'])]
    expect(rerollUnlockedTeams(teams, ['1', '2'], roundRobin)).toBe(teams)
  })

  it('preserves member objects (roles) when redistributing', () => {
    const teams = [
      { id: '1', name: '1팀', members: [{ name: 'a', role: '발표자' }] },
      { id: '2', name: '2팀', members: [{ name: 'b', role: '서기' }] },
    ]
    const result = rerollUnlockedTeams(teams, [], roundRobin)
    const all = result.flatMap((t) => t.members)
    expect(all.find((m) => m.name === 'a').role).toBe('발표자')
    expect(all.find((m) => m.name === 'b').role).toBe('서기')
  })
})
