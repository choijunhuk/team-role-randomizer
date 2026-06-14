import { useState } from 'react'
import BrandLogo from './BrandLogo'

export default function LoginScreen({ error, pending, onLogin }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  const submit = (event) => {
    event.preventDefault()
    if (pending || !identifier.trim() || !password) return
    onLogin(identifier.trim(), password, rememberMe)
  }

  return <main className="auth-page">
    <section className="auth-card">
      <BrandLogo className="auth-brand" />
      <div>
        <span className="hero-chip">COMS ACCOUNT</span>
        <h1>로그인하고<br />팀 배정을 시작하세요.</h1>
        <p>기존 COMS 홈페이지 계정으로 로그인합니다. 비밀번호와 인증 토큰은 팀메이트에 저장되지 않습니다.</p>
      </div>
      <form onSubmit={submit}>
        <label>아이디<input autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="학번, 이메일 또는 관리자 아이디" /></label>
        <label>비밀번호<input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="비밀번호" /></label>
        <label className="remember-row"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /> 로그인 상태 유지</label>
        {error && <div className="notice error" role="alert">{error}</div>}
        <button className="button primary large" disabled={pending || !identifier.trim() || !password}>
          {pending ? '로그인 중...' : 'COMS 계정으로 로그인'}
        </button>
      </form>
      <p className="auth-note">로그인 후 팀 배정 데이터는 이 브라우저의 COMS 계정별 작업공간에 저장됩니다.</p>
    </section>
  </main>
}
