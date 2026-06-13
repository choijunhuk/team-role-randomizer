import { authErrorMessage } from './auth'

const canLogin = (status) => status === 'unauthenticated'
const canLogout = (status) => ['authenticated', 'logout-error'].includes(status)

export function createAuthActions({ api, dispatch, getStatus, locks }) {
  const restore = async () => {
    if (locks.restoring) return
    locks.restoring = true
    dispatch({ type: 'RESTORE' })
    try {
      const user = await api.restoreSession()
      dispatch({ type: user ? 'AUTHENTICATED' : 'UNAUTHENTICATED', user })
    } catch (error) {
      dispatch({ type: 'RESTORE_ERROR', error: authErrorMessage(error) })
    } finally {
      locks.restoring = false
    }
  }

  const login = async (identifier, password, rememberMe) => {
    if (!canLogin(getStatus()) || locks.login) return
    locks.login = true
    dispatch({ type: 'LOGIN_START' })
    try {
      const user = await api.login(identifier, password, rememberMe)
      dispatch({ type: 'AUTHENTICATED', user })
    } catch (error) {
      dispatch({ type: 'LOGIN_ERROR', error: authErrorMessage(error) })
    } finally {
      locks.login = false
    }
  }

  const logout = async () => {
    if (!canLogout(getStatus()) || locks.logout) return
    locks.logout = true
    dispatch({ type: 'LOGOUT_START' })
    try {
      await api.logout()
      dispatch({ type: 'UNAUTHENTICATED' })
    } catch (error) {
      dispatch({ type: 'LOGOUT_ERROR', error: authErrorMessage(error) })
    } finally {
      locks.logout = false
    }
  }

  return { restore, login, logout }
}
