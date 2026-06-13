import { describe, expect, it } from 'vitest'
import { appIsMounted, authReducer, initialAuthState } from './authState'

describe('auth state', () => {
  const user = { studentId: '2026123456', name: '홍길동' }

  it('mounts the app only for authenticated and logout states', () => {
    expect(['restoring', 'restore-error', 'unauthenticated', 'login-pending'].some(appIsMounted)).toBe(false)
    expect(['authenticated', 'logout-pending', 'logout-error'].every(appIsMounted)).toBe(true)
  })

  it('blocks duplicate pending transitions', () => {
    const pending = authReducer({ status: 'unauthenticated', user: null, error: '' }, { type: 'LOGIN_START' })
    expect(authReducer(pending, { type: 'LOGIN_START' })).toBe(pending)
  })

  it('preserves the user when logout fails', () => {
    const authenticated = authReducer(initialAuthState, { type: 'AUTHENTICATED', user })
    const pending = authReducer(authenticated, { type: 'LOGOUT_START' })
    const failed = authReducer(pending, { type: 'LOGOUT_ERROR', error: '실패' })
    expect(failed).toEqual({ status: 'logout-error', user, error: '실패' })
  })
})

