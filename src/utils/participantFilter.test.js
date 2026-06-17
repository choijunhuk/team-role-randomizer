import { describe, expect, it } from 'vitest'
import { filterParticipants } from './participantFilter'

const people = ['김민수 (20251234)', '이서연 (24기)', '박지훈']

describe('filterParticipants', () => {
  it('returns all participants for an empty query', () => {
    expect(filterParticipants(people, '')).toEqual(people)
    expect(filterParticipants(people, '   ')).toEqual(people)
  })
  it('matches by name', () => {
    expect(filterParticipants(people, '서연')).toEqual(['이서연 (24기)'])
  })
  it('matches by identifier', () => {
    expect(filterParticipants(people, '2025')).toEqual(['김민수 (20251234)'])
    expect(filterParticipants(people, '24기')).toEqual(['이서연 (24기)'])
  })
  it('matches by profile field values', () => {
    const profiles = { 박지훈: { major: '컴퓨터공학' } }
    expect(filterParticipants(people, '컴퓨터', profiles)).toEqual(['박지훈'])
  })
  it('is case-insensitive', () => {
    const profiles = { 박지훈: { level: 'Advanced' } }
    expect(filterParticipants(people, 'advanced', profiles)).toEqual(['박지훈'])
  })
  it('returns empty when nothing matches', () => {
    expect(filterParticipants(people, 'zzz')).toEqual([])
  })
})
