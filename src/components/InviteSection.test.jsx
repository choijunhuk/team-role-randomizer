import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import InviteSection from './InviteSection'

describe('InviteSection', () => {
  it('renders a delete control for each sent invite', () => {
    const markup = renderToStaticMarkup(
      <InviteSection
        currentUser={{ studentId: '20250001', name: '홍길동' }}
        sentInvites={[{
          token: 'sent-a',
          status: 'sent',
          targetCount: 2,
          accepted: 2,
          unknown: [],
          rejected: 0,
          message: '팀플 같이해요',
          targets: [{ label: '김민수 (20251234)' }],
          updatedAt: Date.now(),
        }]}
        onRecordSentInvite={() => {}}
        onDeleteSentInvite={() => {}}
      />,
    )

    expect(markup).toContain('최근 보낸 초대')
    expect(markup).toContain('보낸 초대 삭제')
    expect(markup).toContain('삭제')
  })

  it('shows a useful reason when a sent invite delivery failed', () => {
    const markup = renderToStaticMarkup(
      <InviteSection
        currentUser={{ studentId: '20250001', name: '홍길동' }}
        sentInvites={[{
          token: 'failed-a',
          status: 'failed',
          reason: 'unauthorized',
          targetCount: 1,
          message: '초대합니다',
          targets: [{ label: '김민수 (20251234)' }],
          updatedAt: Date.now(),
        }]}
        onRecordSentInvite={() => {}}
        onDeleteSentInvite={() => {}}
      />,
    )

    expect(markup).toContain('전송 실패')
    expect(markup).toContain('로그인이 만료되어 COMS 알림함에 보내지 못했습니다.')
    expect(markup).toContain('초대 링크는 그대로 사용할 수 있습니다.')
  })
})
