import { describe, expect, it, vi } from 'vitest'
import {
  SHARED_ROOM_PATH,
  buildRoomSnapshot,
  fetchRoomSnapshot,
  getSharedRoomMode,
  publishRoomSnapshot,
} from './sharedRooms'

const okJson = (body, status = 200) => ({
  ok: true,
  status,
  json: async () => body,
})

describe('shared room utilities', () => {
  it('builds a server-ready room snapshot without mutating local workspace data', () => {
    const snapshot = buildRoomSnapshot({
      room: { id: 'room-a', name: '캡스톤 팀', createdAt: 10 },
      currentUser: { studentId: '20250001', name: '홍길동' },
      participants: ['홍길동 (20250001)', '김민수'],
      profiles: { 김민수: { major: '컴퓨터공학' } },
      roles: ['발표자'],
      roleRules: { 김민수: { fixed: '발표자' } },
      fairness: { avoidPairs: [['홍길동 (20250001)', '김민수']] },
      histories: [{ id: 'h1', teams: [] }],
    }, 100)

    expect(snapshot).toMatchObject({
      roomId: 'room-a',
      roomName: '캡스톤 팀',
      ownerStudentId: '20250001',
      ownerName: '홍길동',
      participants: ['홍길동 (20250001)', '김민수'],
      roles: ['발표자'],
      updatedAt: 100,
      version: 1,
    })
    expect(snapshot.profiles.김민수.major).toBe('컴퓨터공학')
    expect(snapshot.histories).toHaveLength(1)
  })

  it('skips publish when no room exists yet', async () => {
    const fetcher = vi.fn()
    const result = await publishRoomSnapshot(null, fetcher)

    expect(fetcher).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: false, status: 0, reason: 'no-room', mode: 'local' })
  })

  it('publishes snapshots to the shared-room endpoint and maps 404 to local mode', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) })
    const snapshot = buildRoomSnapshot({ room: { id: 'room-a', name: '캡스톤 팀' }, participants: ['김민수'] }, 100)
    const result = await publishRoomSnapshot(snapshot, fetcher)

    expect(fetcher).toHaveBeenCalledWith(`${SHARED_ROOM_PATH}/room-a`, expect.objectContaining({
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify(snapshot),
    }))
    expect(result).toEqual({ ok: false, status: 404, reason: 'endpoint-missing', mode: 'local' })
    expect(getSharedRoomMode(result)).toBe('로컬 모드')
  })

  it('fetches and normalizes a remote room snapshot', async () => {
    const fetcher = vi.fn().mockResolvedValue(okJson({
      roomId: 'room-a',
      roomName: '캡스톤 팀',
      participants: ['김민수'],
      roles: ['발표자'],
      updatedAt: 200,
    }))
    const result = await fetchRoomSnapshot('room-a', fetcher)

    expect(fetcher).toHaveBeenCalledWith(`${SHARED_ROOM_PATH}/room-a`, {
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
    expect(result.ok).toBe(true)
    expect(result.mode).toBe('shared')
    expect(result.snapshot).toMatchObject({
      roomId: 'room-a',
      roomName: '캡스톤 팀',
      participants: ['김민수'],
      roles: ['발표자'],
    })
  })
})
