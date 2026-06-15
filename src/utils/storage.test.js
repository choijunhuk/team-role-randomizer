import { beforeEach, describe, expect, it } from 'vitest'
import {
  createRoomRecord,
  createRoomFromInvite,
  deleteRoom,
  getRoomWorkspace,
  getUserWorkspace,
  hasLegacyData,
  importLegacyData,
  loadData,
  loadRooms,
  saveData,
  clearAllData,
  saveRooms,
} from './storage'

function installLocalStorage() {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (key) => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  }
}

describe('workspace storage', () => {
  beforeEach(() => installLocalStorage())

  it('separates saved app data by COMS user workspace', () => {
    const first = getUserWorkspace({ studentId: '2026123456', name: '김컴스' })
    const second = getUserWorkspace({ studentId: '2026123999', name: '박컴스' })

    saveData('participants', ['김컴스'], first)
    saveData('participants', ['박컴스'], second)

    expect(loadData('participants', [], first)).toEqual(['김컴스'])
    expect(loadData('participants', [], second)).toEqual(['박컴스'])
  })

  it('clears only the active workspace', () => {
    const first = getUserWorkspace({ email: 'first@example.com', name: '첫 계정' })
    const second = getUserWorkspace({ email: 'second@example.com', name: '둘째 계정' })

    saveData('roles', ['리더'], first)
    saveData('roles', ['발표자'], second)
    clearAllData(first)

    expect(loadData('roles', [], first)).toEqual([])
    expect(loadData('roles', [], second)).toEqual(['발표자'])
  })

  it('does not create a workspace from display-only user fields', () => {
    expect(getUserWorkspace({ name: '동명이인' })).toBeNull()
  })

  it('rejects whitespace-only account identifiers', () => {
    expect(getUserWorkspace({ studentId: '   ', name: '공백 학번' })).toBeNull()
    expect(getUserWorkspace({ id: '   ', name: '공백 ID' })).toBeNull()
    expect(getUserWorkspace({ email: '   ', name: '공백 이메일' })).toBeNull()
  })

  it('keeps collision-prone identifiers in separate workspaces', () => {
    const plusEmail = getUserWorkspace({ email: 'user+tag@example.com' })
    const dashEmail = getUserWorkspace({ email: 'user-tag@example.com' })

    saveData('participants', ['plus'], plusEmail)
    saveData('participants', ['dash'], dashEmail)

    expect(plusEmail.id).not.toBe(dashEmail.id)
    expect(loadData('participants', [], plusEmail)).toEqual(['plus'])
    expect(loadData('participants', [], dashEmail)).toEqual(['dash'])
  })

  it('imports legacy browser data only when explicitly requested', () => {
    const workspace = getUserWorkspace({ studentId: '2026123456', name: '김컴스' })
    saveData('participants', ['공용 데이터'])

    expect(hasLegacyData()).toBe(true)
    expect(loadData('participants', [], workspace)).toEqual([])

    importLegacyData(workspace)
    expect(loadData('participants', [], workspace)).toEqual(['공용 데이터'])
    expect(hasLegacyData()).toBe(false)
  })

  it('creates room workspaces under the same COMS account without mixing participants', () => {
    const account = getUserWorkspace({ studentId: '2026123456', name: '김컴스' })
    const firstRoom = { id: 'room-first', name: '첫 방' }
    const secondRoom = { id: 'room-study', name: '스터디 방' }
    const firstWorkspace = getRoomWorkspace(account, firstRoom)
    const secondWorkspace = getRoomWorkspace(account, secondRoom)

    saveData('participants', ['1번 방'], firstWorkspace)
    saveData('participants', ['2번 방'], secondWorkspace)

    expect(loadData('participants', [], firstWorkspace)).toEqual(['1번 방'])
    expect(loadData('participants', [], secondWorkspace)).toEqual(['2번 방'])
    expect(firstWorkspace.label).toBe('김컴스 · 첫 방')
    expect(secondWorkspace.label).toBe('김컴스 · 스터디 방')
  })

  it('stores the room list at account scope without adding a default room', () => {
    const account = getUserWorkspace({ studentId: '2026123456', name: '김컴스' })
    const studyRoom = createRoomRecord('  스터디 방  ', 1000, () => 0.1234)

    saveRooms(account, [studyRoom])

    expect(studyRoom).toMatchObject({ id: 'room-rs-4fxc', name: '스터디 방' })
    expect(loadRooms(account)).toEqual([studyRoom])
  })

  it('loads an empty room list when the account has no rooms yet', () => {
    const account = getUserWorkspace({ studentId: '2026123456', name: '김컴스' })

    expect(loadRooms(account)).toEqual([])
  })

  it('deletes only the selected non-default room data', () => {
    const account = getUserWorkspace({ studentId: '2026123456', name: '김컴스' })
    const firstRoom = { id: 'room-first', name: '첫 방', createdAt: 0 }
    const studyRoom = { id: 'room-study', name: '스터디 방' }
    saveRooms(account, [firstRoom, studyRoom])
    saveData('participants', ['첫 방'], getRoomWorkspace(account, firstRoom))
    saveData('participants', ['스터디'], getRoomWorkspace(account, studyRoom))

    deleteRoom(account, 'room-study')

    expect(loadRooms(account)).toEqual([firstRoom])
    expect(loadData('participants', [], getRoomWorkspace(account, firstRoom))).toEqual(['첫 방'])
    expect(loadData('participants', [], getRoomWorkspace(account, studyRoom))).toEqual([])
  })

  it('creates a room name from the invite host when a member joins an invite', () => {
    const room = createRoomFromInvite(
      { displayName: '홍길동', message: '프로젝트 팀플 같이 해요' },
      1000,
      () => 0.1234,
    )

    expect(room).toMatchObject({ id: 'room-rs-4fxc', name: '홍길동 초대방' })
  })
})
