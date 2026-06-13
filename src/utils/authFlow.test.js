import { describe, expect, it, vi } from 'vitest'
import { AuthRequestError } from './auth'
import { createAuthActions } from './authFlow'

const deferred = () => {
  let resolve
  const promise = new Promise((done) => { resolve = done })
  return { promise, resolve }
}

function setup(status, api) {
  const dispatch = vi.fn()
  const locks = { restoring: false, login: false, logout: false }
  const getStatus = vi.fn(() => status)
  const actions = createAuthActions({ api, dispatch, getStatus, locks })
  return { actions, dispatch, locks, getStatus }
}

describe('auth flow actions', () => {
  it('restores authenticated, unauthenticated, and retryable error terminal states', async () => {
    const user = { name: '홍길동' }
    const authenticated = setup('restoring', { restoreSession: vi.fn().mockResolvedValue(user) })
    await authenticated.actions.restore()
    expect(authenticated.dispatch).toHaveBeenLastCalledWith({ type: 'AUTHENTICATED', user })

    const unauthenticated = setup('restoring', { restoreSession: vi.fn().mockResolvedValue(null) })
    await unauthenticated.actions.restore()
    expect(unauthenticated.dispatch).toHaveBeenLastCalledWith({ type: 'UNAUTHENTICATED', user: null })

    const failed = setup('restoring', {
      restoreSession: vi.fn().mockRejectedValue(new AuthRequestError('복원 실패', 500)),
    })
    await failed.actions.restore()
    expect(failed.dispatch).toHaveBeenLastCalledWith({ type: 'RESTORE_ERROR', error: '복원 실패' })
  })

  it('logs in with submitted values and blocks duplicate login calls while pending', async () => {
    const pending = deferred()
    const api = { login: vi.fn().mockReturnValue(pending.promise) }
    const { actions, dispatch } = setup('unauthenticated', api)

    const first = actions.login('user', 'secret', true)
    await actions.login('user', 'secret', true)
    expect(api.login).toHaveBeenCalledTimes(1)
    expect(api.login).toHaveBeenCalledWith('user', 'secret', true)

    pending.resolve({ name: '홍길동' })
    await first
    expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'LOGIN_START' })
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'AUTHENTICATED', user: { name: '홍길동' } })
  })

  it('keeps the login form usable after sanitized login failure', async () => {
    const api = { login: vi.fn().mockRejectedValue(new Error('raw stack with secret')) }
    const { actions, dispatch } = setup('unauthenticated', api)

    await actions.login('admin', 'secret', false)
    expect(dispatch).toHaveBeenLastCalledWith({
      type: 'LOGIN_ERROR',
      error: '요청을 처리할 수 없습니다. 잠시 후 다시 시도해주세요.',
    })
  })

  it('preserves authenticated state on logout failure and blocks duplicate logout calls', async () => {
    const pending = deferred()
    const api = { logout: vi.fn().mockReturnValue(pending.promise) }
    const { actions, dispatch } = setup('authenticated', api)

    const first = actions.logout()
    await actions.logout()
    expect(api.logout).toHaveBeenCalledTimes(1)

    pending.resolve()
    await first
    expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'LOGOUT_START' })
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'UNAUTHENTICATED' })

    const failed = setup('authenticated', {
      logout: vi.fn().mockRejectedValue(new AuthRequestError('로그아웃 실패', 500)),
    })
    await failed.actions.logout()
    expect(failed.dispatch).toHaveBeenLastCalledWith({ type: 'LOGOUT_ERROR', error: '로그아웃 실패' })
  })
})
