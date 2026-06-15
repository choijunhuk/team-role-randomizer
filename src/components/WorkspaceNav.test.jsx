import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import WorkspaceNav from './WorkspaceNav'

describe('WorkspaceNav', () => {
  it('renders clear workflow anchors and current counts', () => {
    const markup = renderToStaticMarkup(
      <WorkspaceNav
        participants={12}
        teams={4}
        roles={8}
        histories={3}
        invites={2}
      />,
    )

    expect(markup).toContain('작업 흐름')
    expect(markup).toContain('href="#participants"')
    expect(markup).toContain('참가자')
    expect(markup).toContain('href="#team-settings"')
    expect(markup).toContain('팀 설정')
    expect(markup).toContain('href="#invites"')
    expect(markup).toContain('초대')
    expect(markup).toContain('href="#assignment"')
    expect(markup).toContain('배정')
    expect(markup).toContain('12명')
    expect(markup).toContain('4팀')
  })
})
