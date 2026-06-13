import { describe, expect, it, vi } from 'vitest'
import { authErrorMessage, login, logout, restoreSession } from './auth'

const response = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
})

describe('auth API', () => {
  it('logs in with the COMS request contract and same-origin credentials', async () => {
    const fetcher = vi.fn().mockResolvedValue(response(200, { studentId: '2026123456', name: '홍길동' }))

    await expect(login('2026123456', 'secret', true, fetcher)).resolves.toMatchObject({ name: '홍길동' })
    expect(fetcher).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
      method: 'POST',
      credentials: 'same-origin',
      body: JSON.stringify({ identifier: '2026123456', password: 'secret', rememberMe: true }),
    }))
  })

  it('restores a valid session directly', async () => {
    const fetcher = vi.fn().mockResolvedValue(response(200, { studentId: '2026123456', name: '홍길동' }))
    await expect(restoreSession(fetcher)).resolves.toMatchObject({ name: '홍길동' })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('refreshes once and retries me after an expired access cookie', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response(401))
      .mockResolvedValueOnce(response(204))
      .mockResolvedValueOnce(response(200, { studentId: '2026123456', name: '홍길동' }))

    await expect(restoreSession(fetcher)).resolves.toMatchObject({ name: '홍길동' })
    expect(fetcher.mock.calls.map(([path]) => path)).toEqual(['/api/auth/me', '/api/auth/refresh', '/api/auth/me'])
  })

  it('returns unauthenticated after refresh rejection or retried me rejection', async () => {
    const rejectedRefresh = vi.fn().mockResolvedValueOnce(response(401)).mockResolvedValueOnce(response(401))
    await expect(restoreSession(rejectedRefresh)).resolves.toBeNull()

    const rejectedRetry = vi.fn()
      .mockResolvedValueOnce(response(401))
      .mockResolvedValueOnce(response(204))
      .mockResolvedValueOnce(response(403))
    await expect(restoreSession(rejectedRetry)).resolves.toBeNull()
  })

  it('uses sanitized errors without echoing credentials or raw payloads', async () => {
    const fetcher = vi.fn().mockResolvedValue(response(500, { password: 'secret', detail: 'internal stack' }))
    await expect(login('admin', 'secret', false, fetcher)).rejects.toThrow('요청을 처리할 수 없습니다')
    await expect(logout(fetcher)).rejects.not.toThrow('internal stack')
    expect(authErrorMessage(new Error('internal stack'))).not.toContain('internal stack')
  })

  it('rejects authenticated responses without a stable COMS account id', async () => {
    const fetcher = vi.fn().mockResolvedValue(response(200, { name: '동명이인' }))
    await expect(restoreSession(fetcher)).rejects.toThrow('COMS 계정 식별자')
  })
})
