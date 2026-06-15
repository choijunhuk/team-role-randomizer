import { describe, expect, it } from 'vitest'
import { formatParticipantIdentifier, parseParticipantInput } from './participants'

describe('participant input parsing', () => {
  it('normalizes numeric generation labels with the 기 suffix', () => {
    const result = parseParticipantInput('홍길동 (17기)\n김졸업 (58 기)')

    expect(result.names).toEqual(['홍길동 (17기)', '김졸업 (58기)'])
    expect(result.items.map((item) => item.identifierType)).toEqual(['generation', 'generation'])
    expect(result.errors).toEqual([])
  })

  it('treats a numeric parenthesized value as a student id, not a generation', () => {
    const result = parseParticipantInput('김민수 (2026402040), 박지훈 (17)')

    expect(result.names).toEqual(['김민수 (2026402040)', '박지훈 (17)'])
    expect(result.items.map(formatParticipantIdentifier)).toEqual(['학번 2026402040', '학번 17'])
    expect(result.errors).toEqual([])
  })

  it('reports invalid parenthesized identifiers and keeps name-only entries explicit', () => {
    const result = parseParticipantInput('이름만\n오류학생 (abc)')

    expect(result.names).toEqual(['이름만'])
    expect(result.nameOnlyCount).toBe(1)
    expect(result.errors).toEqual(['오류학생 (abc): 학번은 숫자만, 기수는 17기처럼 입력해주세요.'])
  })
})
