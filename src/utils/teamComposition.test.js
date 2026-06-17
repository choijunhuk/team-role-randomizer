import { describe, expect, it } from 'vitest'
import {
  distributionForField,
  fieldLabel,
  getTeamComposition,
  rerollUnlockedTeams,
  teamAccent,
} from './teamComposition'

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
