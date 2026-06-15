import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import RoomSwitcher from './RoomSwitcher'

describe('RoomSwitcher', () => {
  it('renders the current room, room tabs and creation control', () => {
    const markup = renderToStaticMarkup(
      <RoomSwitcher
        rooms={[
          { id: 'default', name: '기본 방', createdAt: 0 },
          { id: 'room-study', name: '스터디 방', createdAt: 1 },
        ]}
        activeRoomId="room-study"
        participantCount={12}
        onSelectRoom={() => {}}
        onCreateRoom={() => {}}
        onDeleteRoom={() => {}}
      />,
    )

    expect(markup).toContain('현재 방')
    expect(markup).toContain('스터디 방')
    expect(markup).toContain('참가자 12명')
    expect(markup).toContain('새 방 이름')
    expect(markup).toContain('방 만들기')
    expect(markup).toContain('aria-pressed="true"')
  })
})
