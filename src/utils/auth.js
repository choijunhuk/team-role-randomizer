import { getStableAccountId } from './account'

const AUTH_PATHS = {
  login: '/api/auth/login',
  logout: '/api/auth/logout',
  me: '/api/auth/me',
  refresh: '/api/auth/refresh',
}

export class AuthRequestError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'AuthRequestError'
    this.status = status
  }
}

const isUnauthenticated = (status) => status === 401 || status === 403
export const authErrorMessage = (error) => error instanceof AuthRequestError
  ? error.message
  : '요청을 처리할 수 없습니다. 잠시 후 다시 시도해주세요.'

async function request(path, options = {}, fetcher = fetch) {
  let response
  try {
    response = await fetcher(path, { credentials: 'same-origin', ...options })
  } catch {
    throw new AuthRequestError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.')
  }
  return response
}

async function readJson(response) {
  try {
    return await response.json()
  } catch {
    throw new AuthRequestError('서버 응답을 확인할 수 없습니다.', response.status)
  }
}

function failedRequest(response, action) {
  if (action === 'login' && isUnauthenticated(response.status)) {
    return new AuthRequestError('아이디 또는 비밀번호를 확인해주세요.', response.status)
  }
  if (response.status === 429) {
    return new AuthRequestError('로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.', response.status)
  }
  return new AuthRequestError('요청을 처리할 수 없습니다. 잠시 후 다시 시도해주세요.', response.status)
}

function requireStableUser(user) {
  if (!getStableAccountId(user)) {
    throw new AuthRequestError('COMS 계정 식별자를 확인할 수 없습니다. 관리자에게 문의해주세요.')
  }
  return user
}

export async function login(identifier, password, rememberMe, fetcher = fetch) {
  const response = await request(AUTH_PATHS.login, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password, rememberMe }),
  }, fetcher)
  if (!response.ok) throw failedRequest(response, 'login')
  return requireStableUser(await readJson(response))
}

export async function logout(fetcher = fetch) {
  const response = await request(AUTH_PATHS.logout, { method: 'POST' }, fetcher)
  if (!response.ok) throw failedRequest(response, 'logout')
}

async function getMe(fetcher) {
  const response = await request(AUTH_PATHS.me, {}, fetcher)
  if (response.ok) return { kind: 'authenticated', user: requireStableUser(await readJson(response)) }
  if (isUnauthenticated(response.status)) return { kind: 'unauthenticated' }
  throw failedRequest(response, 'restore')
}

export async function restoreSession(fetcher = fetch) {
  const initial = await getMe(fetcher)
  if (initial.kind === 'authenticated') return initial.user

  const refresh = await request(AUTH_PATHS.refresh, { method: 'POST' }, fetcher)
  if (isUnauthenticated(refresh.status)) return null
  if (!refresh.ok) throw failedRequest(refresh, 'restore')

  const retried = await getMe(fetcher)
  return retried.kind === 'authenticated' ? retried.user : null
}
