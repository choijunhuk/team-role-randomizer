export const initialAuthState = {
  status: 'restoring',
  user: null,
  error: '',
}

export function authReducer(state, action) {
  switch (action.type) {
    case 'RESTORE':
      return { ...initialAuthState }
    case 'AUTHENTICATED':
      return { status: 'authenticated', user: action.user, error: '' }
    case 'UNAUTHENTICATED':
      return { status: 'unauthenticated', user: null, error: '' }
    case 'RESTORE_ERROR':
      return { status: 'restore-error', user: null, error: action.error }
    case 'LOGIN_START':
      return state.status === 'unauthenticated'
        ? { status: 'login-pending', user: null, error: '' }
        : state
    case 'LOGIN_ERROR':
      return { status: 'unauthenticated', user: null, error: action.error }
    case 'LOGOUT_START':
      return ['authenticated', 'logout-error'].includes(state.status)
        ? { status: 'logout-pending', user: state.user, error: '' }
        : state
    case 'LOGOUT_ERROR':
      return { status: 'logout-error', user: state.user, error: action.error }
    default:
      return state
  }
}

export const appIsMounted = (status) => ['authenticated', 'logout-pending', 'logout-error'].includes(status)

