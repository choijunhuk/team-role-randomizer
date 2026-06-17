import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import QuickStartPanel from './QuickStartPanel'

describe('QuickStartPanel', () => {
  it('renders room creation shortcuts before a room exists', () => {
    const markup = renderToStaticMarkup(
      <QuickStartPanel
        roomReady={false}
        onCreateRoom={() => {}}
        onAddCurrentUser={() => {}}
        onAddSampleParticipants={() => {}}
      />,
    )

    expect(markup).toContain('빠른 시작')
    expect(markup).toContain('팀플 방 만들기')
    expect(markup).toContain('스터디 방 만들기')
  })

  it('renders starter participant shortcuts once a room exists', () => {
    const markup = renderToStaticMarkup(
      <QuickStartPanel
        roomReady
        currentUser={{ name: '홍길동', studentId: '20250001' }}
        onCreateRoom={() => {}}
        onAddCurrentUser={() => {}}
        onAddSampleParticipants={() => {}}
      />,
    )

    expect(markup).toContain('내 정보 추가')
    expect(markup).toContain('예시 8명 추가')
    expect(markup).toContain('홍길동')
  })
})
