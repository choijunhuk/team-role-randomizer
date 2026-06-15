import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const storage = new Map()

beforeEach(() => {
  storage.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  })
})

describe('App role-based workspace', () => {
  it('lets non-admin members use the workspace while hiding the roster picker', () => {
    const markup = renderToStaticMarkup(
      <App
        currentUser={{ role: 'MEMBER', studentId: '20250000', name: '일반회원' }}
        logoutError=""
        logoutPending={false}
        onLogout={() => {}}
      />,
    )

    expect(markup).toContain('방 만들기')
    expect(markup).toContain('새 방 이름')
    expect(markup).toContain('받은 초대')
    expect(markup).toContain('초대 대상')
    expect(markup).toContain('TEAM ROOM')
    expect(markup).toContain('랜덤 팀 배정하기')
    expect(markup).toContain('참가자 입력')
    expect(markup).not.toContain('명단 0명')
    expect(markup).not.toContain('명단 새로고침')
    expect(markup).not.toContain('STEP 01')
    expect(markup).not.toContain('STEP 02')
    expect(markup).not.toContain('초대 전용')
    expect(markup).not.toContain('기본 방')
  })
})
