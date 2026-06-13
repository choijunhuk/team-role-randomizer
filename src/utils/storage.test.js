import { beforeEach, describe, expect, it } from 'vitest'
import { clearAllData, getUserWorkspace, hasLegacyData, importLegacyData, loadData, saveData } from './storage'

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
})
