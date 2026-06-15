import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import InviteInboxSection from './InviteInboxSection'

describe('InviteInboxSection', () => {
  it('labels received invite removal as delete', () => {
    const markup = renderToStaticMarkup(
      <InviteInboxSection
        currentUser={{ studentId: '20250001' }}
        invites={[{
          token: 'invite-a',
          displayName: '홍길동',
          message: '팀플 같이해요',
          issuedAt: Date.now(),
          inviteUrl: 'https://example.test/team-randomizer/#invite=abc',
        }]}
        onRefresh={() => {}}
        onJoin={() => {}}
        onDismiss={() => {}}
      />,
    )

    expect(markup).toContain('받은 초대 삭제')
    expect(markup).toContain('삭제')
    expect(markup).not.toContain('숨기기')
  })
})
