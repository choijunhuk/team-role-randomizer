import { useEffect, useReducer, useRef } from 'react'
import App from '../App'
import { login, logout, restoreSession } from '../utils/auth'
import { getStableAccountId } from '../utils/account'
import { createAuthActions } from '../utils/authFlow'
import { appIsMounted, authReducer, initialAuthState } from '../utils/authState'
import LoginScreen from './LoginScreen'

const defaultApi = { login, logout, restoreSession }

export default function AuthGate({ AppComponent = App, api = defaultApi }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState)
  const stateRef = useRef(state)
  const locksRef = useRef({ restoring: false, login: false, logout: false })
  stateRef.current = state

  const actions = createAuthActions({
    api,
    dispatch,
    getStatus: () => stateRef.current.status,
    locks: locksRef.current,
  })

  useEffect(() => { actions.restore() }, [])

  if (state.status === 'restoring') {
    return <main className="auth-page"><section className="auth-card auth-status"><span className="loading-dot" /><h1>로그인 상태를 확인하고 있습니다.</h1><p>잠시만 기다려주세요.</p></section></main>
  }

  if (state.status === 'restore-error') {
    return <main className="auth-page"><section className="auth-card auth-status"><h1>로그인 상태를 확인하지 못했습니다.</h1><p>{state.error}</p><button className="button primary" onClick={actions.restore}>다시 시도</button></section></main>
  }

  if (!appIsMounted(state.status)) {
    return <LoginScreen error={state.error} pending={state.status === 'login-pending'} onLogin={actions.login} />
  }

  return <AppComponent
    key={getStableAccountId(state.user)}
    currentUser={state.user}
    logoutError={state.status === 'logout-error' ? state.error : ''}
    logoutPending={state.status === 'logout-pending'}
    onLogout={actions.logout}
  />
}
