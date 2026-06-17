import { describe, expect, it } from 'vitest'
import {
  buildPresentationQueue,
  getInviteProgress,
  getUnassignedRoleMembers,
  resultToChecklistText,
} from './workflowSummaries'

describe('workflow summaries', () => {
  it('summarizes invite progress across sent invites and joined inbox items', () => {
    const progress = getInviteProgress([
      { status: 'sent', accepted: 2, rejected: 1, targetCount: 3 },
      { status: 'failed', targetCount: 1 },
      { status: 'generated', targetCount: 2, studentIds: [], targets: [{ identifierType: 'generation' }] },
    ], [
      { seenAt: 100 },
      { seenAt: null },
    ])

    expect(progress).toMatchObject({
      targetTotal: 6,
      sentTotal: 3,
      failedTotal: 1,
      linkOnlyTotal: 2,
      joinedTotal: 1,
      pendingInboxTotal: 1,
    })
    expect(progress.nextAction).toContain('실패한 초대')
  })

  it('builds a stable presentation queue by team order then member order', () => {
    const queue = buildPresentationQueue([
      { name: '1팀', members: [{ name: '김민수', role: '발표자' }, { name: '이서연', role: '' }] },
      { name: '2팀', members: [{ name: '박지훈', role: '서기' }] },
    ])

    expect(queue).toEqual([
      { order: 1, teamName: '1팀', memberName: '김민수', role: '발표자' },
      { order: 2, teamName: '1팀', memberName: '이서연', role: '미배정' },
      { order: 3, teamName: '2팀', memberName: '박지훈', role: '서기' },
    ])
  })

  it('finds members without roles and creates checklist copy text', () => {
    const teams = [
      { name: '1팀', members: [{ name: '김민수', role: '' }, { name: '이서연', role: '서기' }] },
    ]

    expect(getUnassignedRoleMembers(teams)).toEqual([{ teamName: '1팀', memberName: '김민수' }])
    expect(resultToChecklistText(teams)).toContain('[팀메이트 진행 체크리스트]')
    expect(resultToChecklistText(teams)).toContain('- [ ] 1팀 참석 확인')
    expect(resultToChecklistText(teams)).toContain('- [ ] 김민수 역할 확정')
  })
})
