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
  it('keeps non-admin members on an invite-only workspace without participant entry tools', () => {
    const markup = renderToStaticMarkup(
      <App
        currentUser={{ role: 'MEMBER', studentId: '20250000', name: '일반회원' }}
        logoutError=""
        logoutPending={false}
        onLogout={() => {}}
      />,
    )

    expect(markup).toContain('받은 초대')
    expect(markup).toContain('방이 먼저 필요합니다')
    expect(markup).toContain('방이 생긴 다음 초대할 수 있습니다')
    expect(markup).toContain('TEAM ROOM')
    expect(markup).toContain('초대만으로 참여할 수 있습니다')
    expect(markup).toContain('일반 회원 모드')
    expect(markup).not.toContain('방 만들기')
    expect(markup).not.toContain('새 방 이름')
    expect(markup).not.toContain('현재 방 초기화')
    expect(markup).not.toContain('초대 대상')
    expect(markup).not.toContain('초대 링크 만들기')
    expect(markup).not.toContain('랜덤 팀 배정하기')
    expect(markup).not.toContain('참가자 입력')
    expect(markup).not.toContain('팀 설정')
    expect(markup).not.toContain('역할 설정')
    expect(markup).not.toContain('배정 결과')
    expect(markup).not.toContain('명단')
    expect(markup).not.toContain('명단 0명')
    expect(markup).not.toContain('명단 새로고침')
    expect(markup).not.toContain('STEP 01')
    expect(markup).not.toContain('STEP 02')
    expect(markup).not.toContain('초대 전용')
    expect(markup).not.toContain('기본 방')
  })

  const seedAdminRoom = (studentId, room = { id: 'r1', name: '테스트방', createdAt: 1 }) => {
    const prefix = `team-randomizer:studentId:${studentId}`
    storage.set(`${prefix}:team-randomizer-rooms`, JSON.stringify([room]))
    storage.set(`${prefix}:team-randomizer-active-room`, room.id)
  }

  it('blocks the team surface and asks admins to create a room first when none exists', () => {
    const markup = renderToStaticMarkup(
      <App
        currentUser={{ role: 'ADMIN', studentId: '20250001', name: '관리자' }}
        logoutError=""
        logoutPending={false}
        onLogout={() => {}}
      />,
    )

    // Only room creation (in the switcher) and invite receiving are available.
    expect(markup).toContain('먼저 방을 만들어주세요')
    expect(markup).toContain('방 만들기')
    expect(markup).toContain('받은 초대')
    // The team tools must NOT render until a room exists.
    expect(markup).not.toContain('참가자 입력')
    expect(markup).not.toContain('팀 설정')
    expect(markup).not.toContain('역할 설정')
    expect(markup).not.toContain('랜덤 팀 배정하기')
    expect(markup).not.toContain('초대 링크 만들기')
  })

  it('opens the full team assignment surface once an admin room exists', () => {
    seedAdminRoom('20250001')
    const markup = renderToStaticMarkup(
      <App
        currentUser={{ role: 'ADMIN', studentId: '20250001', name: '관리자' }}
        logoutError=""
        logoutPending={false}
        onLogout={() => {}}
      />,
    )

    expect(markup).toContain('참가자 입력')
    expect(markup).toContain('팀 설정')
    expect(markup).toContain('역할 설정')
    expect(markup).toContain('랜덤 팀 배정하기')
    expect(markup).toContain('명단')
  })
})
