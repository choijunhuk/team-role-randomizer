import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import TeamSettings from './TeamSettings'

describe('TeamSettings presets', () => {
  it('renders practical assignment preset controls', () => {
    const markup = renderToStaticMarkup(
      <TeamSettings
        mode="count"
        setMode={() => {}}
        value="2"
        setValue={() => {}}
        fairness={{ fixedTeams: {}, avoidPairs: [], preferPairs: [], repeatWeight: 8, balanceFields: [] }}
        setFairness={() => {}}
        participants={['민수', '지수']}
        constraintReport={{ errors: [], warnings: [] }}
      />,
    )

    expect(markup).toContain('배정 기준 프리셋')
    expect(markup).toContain('균형 우선')
    expect(markup).toContain('중복 최소')
    expect(markup).toContain('친한 사람 같이')
    expect(markup).toContain('빠른 랜덤')
  })
})

