import { describe, expect, it } from 'vitest'
import { getWorkspaceInsights } from './workspaceInsights'

const base = {
  roomName: '정기 스터디',
  participantsCount: 6,
  expectedTeams: 2,
  rolesCount: 8,
  inboxCount: 0,
  sentInviteCount: 0,
  isAdmin: false,
  constraintReport: { errors: [], warnings: [] },
}

describe('workspaceInsights', () => {
  it('asks users to create or accept a room when no room exists', () => {
    const insights = getWorkspaceInsights({ ...base, roomName: '' })

    expect(insights.status).toBe('needs-room')
    expect(insights.nextAction).toContain('방을 만들거나 초대를 수락')
  })

  it('asks for more participants before assignment', () => {
    const insights = getWorkspaceInsights({ ...base, participantsCount: 1 })

    expect(insights.status).toBe('needs-participants')
    expect(insights.nextAction).toContain('참가자 2명 이상')
  })

  it('blocks readiness when constraints have errors', () => {
    const insights = getWorkspaceInsights({
      ...base,
      constraintReport: { errors: ['고정 팀 번호를 확인해주세요.'], warnings: [] },
    })

    expect(insights.status).toBe('blocked')
    expect(insights.nextAction).toContain('고정 팀 번호')
  })

  it('reports readiness and invite activity', () => {
    const insights = getWorkspaceInsights({ ...base, inboxCount: 2, sentInviteCount: 1 })

    expect(insights.status).toBe('ready')
    expect(insights.nextAction).toContain('배정할 수 있습니다')
    expect(insights.stats.find((item) => item.label === '초대 흐름').value).toBe('3건')
  })

  it('keeps roster capability admin-only', () => {
    expect(getWorkspaceInsights(base).capabilityNote).not.toContain('명단')
    expect(getWorkspaceInsights({ ...base, isAdmin: true }).capabilityNote).toContain('명단')
  })
})

