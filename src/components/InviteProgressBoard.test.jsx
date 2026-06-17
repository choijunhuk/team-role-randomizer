import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import InviteProgressBoard from './InviteProgressBoard'

describe('InviteProgressBoard', () => {
  it('renders invite progress counts and next action', () => {
    const markup = renderToStaticMarkup(
      <InviteProgressBoard
        progress={{
          targetTotal: 4,
          sentTotal: 2,
          failedTotal: 1,
          linkOnlyTotal: 1,
          joinedTotal: 1,
          pendingInboxTotal: 0,
          nextAction: '실패한 초대 1건을 링크로 다시 공유하세요.',
        }}
      />,
    )

    expect(markup).toContain('초대 진행')
    expect(markup).toContain('전체 대상')
    expect(markup).toContain('4명')
    expect(markup).toContain('합류 확인')
    expect(markup).toContain('실패한 초대 1건')
  })
})
