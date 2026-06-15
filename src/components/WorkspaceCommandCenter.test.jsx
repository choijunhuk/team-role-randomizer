import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import WorkspaceCommandCenter from './WorkspaceCommandCenter'
import { getWorkspaceInsights } from '../utils/workspaceInsights'

describe('WorkspaceCommandCenter', () => {
  it('renders readiness, next action, and compact status cards', () => {
    const insights = getWorkspaceInsights({
      roomName: '정기 스터디',
      participantsCount: 6,
      expectedTeams: 2,
      rolesCount: 8,
      inboxCount: 1,
      sentInviteCount: 1,
      isAdmin: false,
      constraintReport: { errors: [], warnings: [] },
    })
    const markup = renderToStaticMarkup(<WorkspaceCommandCenter insights={insights} />)

    expect(markup).toContain('오늘의 작업판')
    expect(markup).toContain('정기 스터디')
    expect(markup).toContain('바로 배정할 수 있습니다')
    expect(markup).toContain('초대 흐름')
    expect(markup).not.toContain('명단')
  })

  it('renders roster capability only for admins', () => {
    const insights = getWorkspaceInsights({
      roomName: '운영진 회의',
      participantsCount: 6,
      expectedTeams: 2,
      rolesCount: 8,
      inboxCount: 0,
      sentInviteCount: 0,
      isAdmin: true,
      constraintReport: { errors: [], warnings: [] },
    })
    const markup = renderToStaticMarkup(<WorkspaceCommandCenter insights={insights} />)

    expect(markup).toContain('관리자')
    expect(markup).toContain('명단')
  })
})

