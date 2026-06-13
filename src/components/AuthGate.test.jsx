import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import AuthGate from './AuthGate'

describe('AuthGate', () => {
  it('does not render the app before authentication is confirmed', () => {
    const AppSentinel = () => <div>APP_SENTINEL</div>
    const markup = renderToStaticMarkup(<AuthGate AppComponent={AppSentinel} />)
    expect(markup).toContain('로그인 상태를 확인하고 있습니다')
    expect(markup).not.toContain('APP_SENTINEL')
  })
})

