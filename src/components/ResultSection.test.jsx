import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ResultSection from './ResultSection'

describe('ResultSection operations', () => {
  it('labels current hard and software groups after assignments', () => {
    const markup = renderToStaticMarkup(<ResultSection teams={[{ id: 'h', name: '1팀', members: [{ name: 'hard1', role: '' }, { name: 'any1', role: '' }] }, { id: 's', name: '2팀', members: [{ name: 'soft1', role: '' }] }]} roles={[]} profiles={{ hard1: { preference: 'hard' }, soft1: { preference: 'soft' } }} evaluation={null} composition={{ fields: [] }} onChange={() => {}} />)
    expect(markup).toContain('하드 조')
    expect(markup).toContain('소프트 조')
  })
  it('renders meeting operations for assigned teams', () => {
    const markup = renderToStaticMarkup(
      <ResultSection
        teams={[{ id: 't1', name: '1팀', members: [{ name: '김민수', role: '' }, { name: '이서연', role: '서기' }] }]}
        roles={['서기']}
        evaluation={null}
        composition={{ fields: [] }}
        lockedTeamIds={[]}
        onChange={() => {}}
        onAssignAll={() => {}}
        onAssignTeam={() => {}}
        onCopy={() => {}}
        onShare={() => {}}
        onQr={() => {}}
        onDownload={() => {}}
        onReroll={() => {}}
      />,
    )

    expect(markup).toContain('회의 운영')
    expect(markup).toContain('발표 순서')
    expect(markup).toContain('역할 미배정')
    expect(markup).toContain('체크리스트 복사')
    expect(markup).toContain('김민수')
  })
})
