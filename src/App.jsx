import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import ParticipantSection from './components/ParticipantSection'
import TeamSettings from './components/TeamSettings'
import RoleSection from './components/RoleSection'
import ResultSection from './components/ResultSection'
import HistorySection from './components/HistorySection'
import InviteSection from './components/InviteSection'
import InviteInboxSection from './components/InviteInboxSection'
import { assignRoles, createTeams, decodeShareData, encodeShareData, resultToText } from './utils/teamUtils'
import { clearAllData, getUserWorkspace, hasLegacyData, importLegacyData, loadData, saveData } from './utils/storage'
import { clearInviteHash, fetchInviteInbox, inviteToken, markInviteRead, matchesStudentId, mergeInvites, readInviteFromLocation } from './utils/invite'

const DEFAULT_ROLES = ['발표자', '서기', '자료조사', '발표자료 제작', '코드 작성', '코드 리뷰', '시간 관리', '질문 담당']
const EMPTY_FAIRNESS = { fixedTeams: {}, avoidPairs: [], preferPairs: [], repeatWeight: 8, balanceFields: [] }
const clone = (value) => structuredClone(value)

export default function App({ currentUser, logoutError, logoutPending, onLogout }) {
  const workspace = useMemo(() => getUserWorkspace(currentUser), [currentUser])
  if (!workspace) {
    throw new Error('COMS 계정 식별자를 확인할 수 없습니다.')
  }
  const [participants, setParticipants] = useState(() => loadData('participants', [], workspace))
  const [profiles, setProfiles] = useState(() => loadData('profiles', {}, workspace))
  const [roles, setRoles] = useState(() => loadData('roles', DEFAULT_ROLES, workspace))
  const [roleRules, setRoleRules] = useState(() => loadData('roleRules', {}, workspace))
  const [histories, setHistories] = useState(() => loadData('histories', [], workspace))
  const [fairness, setFairness] = useState(() => ({ ...EMPTY_FAIRNESS, ...loadData('fairness', {}, workspace) }))
  const [inbox, setInbox] = useState(() => loadData('inbox', [], workspace))
  const [theme, setTheme] = useState(() => loadData('theme', 'light', workspace))
  const [mode, setMode] = useState('count')
  const [settingValue, setSettingValue] = useState('2')
  const [teams, setTeams] = useState([])
  const [evaluation, setEvaluation] = useState(null)
  const [undoStack, setUndoStack] = useState([])
  const [message, setMessage] = useState(null)
  const [toast, setToast] = useState('')
  const [legacyDataAvailable, setLegacyDataAvailable] = useState(() => hasLegacyData())
  const [qr, setQr] = useState('')
  const importRef = useRef(null)

  useEffect(() => saveData('participants', participants, workspace), [participants, workspace])
  useEffect(() => saveData('profiles', profiles, workspace), [profiles, workspace])
  useEffect(() => saveData('roles', roles, workspace), [roles, workspace])
  useEffect(() => saveData('roleRules', roleRules, workspace), [roleRules, workspace])
  useEffect(() => saveData('histories', histories, workspace), [histories, workspace])
  useEffect(() => saveData('fairness', fairness, workspace), [fairness, workspace])
  useEffect(() => saveData('inbox', inbox, workspace), [inbox, workspace])
  useEffect(() => { saveData('theme', theme, workspace); document.documentElement.dataset.theme = theme }, [theme, workspace])
  useEffect(() => {
    const hash = new URLSearchParams(location.hash.slice(1)).get('share')
    if (!hash) return
    try {
      const data = decodeShareData(hash)
      if (Array.isArray(data.teams)) setTeams(data.teams)
    } catch { /* Ignore malformed shared links. */ }
  }, [])

  const currentStudentId = currentUser?.studentId
  useEffect(() => {
    const invite = readInviteFromLocation()
    if (!invite) return
    if (!matchesStudentId(invite, currentUser)) {
      notify(`초대 링크 대상이 아닙니다 (대상 ${invite.studentIds.length}명).`)
      clearInviteHash()
      return
    }
    const incoming = { ...invite, token: inviteToken(invite) }
    setInbox((prev) => mergeInvites(prev, [incoming]))
    const hostLabel = invite.displayName || invite.host || '주최자'
    notify(`${hostLabel}님의 초대가 인박스에 도착했습니다.`)
    clearInviteHash()
  }, [currentStudentId])

  useEffect(() => {
    if (!currentStudentId) return
    let cancelled = false
    fetchInviteInbox().then((result) => {
      if (cancelled || !result.ok || !result.invites.length) return
      setInbox((prev) => mergeInvites(prev, result.invites))
    })
    return () => { cancelled = true }
  }, [currentStudentId])

  const expectedTeams = useMemo(() => {
    const value = Number(settingValue)
    return Number.isInteger(value) && value > 0 ? mode === 'count' ? value : Math.ceil(participants.length / value) : 0
  }, [mode, settingValue, participants.length])
  const notify = (text) => { setToast(text); window.setTimeout(() => setToast(''), 2400) }
  const saveSnapshot = () => setUndoStack((stack) => [...stack.slice(-14), clone(teams)])
  const changeTeams = (nextTeams, notice) => { saveSnapshot(); setTeams(nextTeams); if (notice) notify(notice) }

  const addParticipants = (raw) => {
    const names = raw.split(/[\n,\t]+/).map((name) => name.trim()).filter(Boolean)
    const next = [...new Set(names)].filter((name) => !participants.includes(name))
    if (!next.length) { setMessage({ type: 'error', text: names.length ? '이미 등록된 이름입니다.' : '추가할 이름을 입력해주세요.' }); return false }
    setParticipants([...participants, ...next])
    setMessage({ type: next.length < names.length ? 'warning' : 'success', text: `${next.length}명을 추가했습니다${next.length < names.length ? '. 중복 이름은 제외했습니다.' : '.'}` })
    return true
  }
  const addRole = (role) => {
    const value = role.trim()
    if (!value || roles.includes(value)) { notify(value ? '이미 있는 역할입니다.' : '역할 이름을 입력해주세요.'); return false }
    setRoles([...roles, value]); return true
  }
  const validate = () => {
    const value = Number(settingValue)
    if (participants.length < 2) return '참가자는 2명 이상이어야 합니다.'
    if (!Number.isInteger(value) || value < 1) return '팀 설정 값은 1 이상이어야 합니다.'
    if (mode === 'count' && value > participants.length) return '팀 개수는 참가자 수보다 많을 수 없습니다.'
    const invalid = Object.entries(fairness.fixedTeams).find(([name, team]) => participants.includes(name) && team && (Number(team) < 1 || Number(team) > expectedTeams))
    return invalid ? `${invalid[0]}님의 고정 팀 번호를 확인해주세요.` : ''
  }
  const addHistory = (nextTeams) => {
    const title = window.prompt('이 배정 기록의 제목을 입력하세요.', `팀 배정 ${histories.length + 1}`) ?? `팀 배정 ${histories.length + 1}`
    const history = { id: crypto.randomUUID(), title, favorite: false, createdAt: new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date()), teams: clone(nextTeams) }
    setHistories((items) => [history, ...items].slice(0, 50))
  }
  const assignTeams = () => {
    const error = validate()
    if (error) return notify(error)
    const result = createTeams(participants, expectedTeams, fairness, histories, profiles)
    changeTeams(result.teams)
    setEvaluation(result.evaluation)
    addHistory(result.teams)
    notify(`${result.teams.length}개 팀을 배정했습니다.`)
    window.setTimeout(() => document.querySelector('.result-section')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }
  const shareUrl = () => `${location.origin}${location.pathname}#share=${encodeURIComponent(encodeShareData({ teams }))}`
  const copyText = async (text, success) => {
    try { await navigator.clipboard.writeText(text); notify(success) } catch {
      window.prompt('아래 내용을 직접 복사하세요.', text)
    }
  }
  const download = (content, filename, type = 'text/plain;charset=utf-8') => {
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([content], { type })); link.download = filename; link.click(); URL.revokeObjectURL(link.href)
  }
  const exportJson = () => download(JSON.stringify({ participants, profiles, roles, roleRules, fairness, histories }, null, 2), '팀메이트-백업.json', 'application/json')
  const importJson = async (event) => {
    try {
      const data = JSON.parse(await event.target.files[0].text())
      setParticipants(data.participants ?? []); setProfiles(data.profiles ?? {}); setRoles(data.roles ?? DEFAULT_ROLES); setRoleRules(data.roleRules ?? {}); setFairness({ ...EMPTY_FAIRNESS, ...(data.fairness ?? {}) }); setHistories(data.histories ?? []); notify('백업을 불러왔습니다.')
    } catch { notify('올바른 팀메이트 백업 파일이 아닙니다.') }
  }
  const importLegacyWorkspace = () => {
    importLegacyData(workspace)
    setParticipants(loadData('participants', [], workspace))
    setProfiles(loadData('profiles', {}, workspace))
    setRoles(loadData('roles', DEFAULT_ROLES, workspace))
    setRoleRules(loadData('roleRules', {}, workspace))
    setHistories(loadData('histories', [], workspace))
    setFairness({ ...EMPTY_FAIRNESS, ...loadData('fairness', {}, workspace) })
    setTheme(loadData('theme', theme, workspace))
    setLegacyDataAvailable(false)
    notify('이전 공용 데이터를 현재 계정 작업공간으로 가져왔습니다.')
  }
  const resetAll = () => {
    if (!window.confirm('모든 데이터를 초기화할까요?')) return
    clearAllData(workspace); setParticipants([]); setProfiles({}); setRoles(DEFAULT_ROLES); setRoleRules({}); setHistories([]); setFairness(EMPTY_FAIRNESS); setInbox([]); setTeams([]); setUndoStack([]); notify('현재 계정 작업공간을 초기화했습니다.')
  }
  const joinInvite = (invite) => {
    const displayName = currentUser?.name?.trim() || `학번 ${currentUser?.studentId ?? ''}`
    setParticipants((prev) => prev.includes(displayName) ? prev : [...prev, displayName])
    setInbox((prev) => prev.map((item) => item.token === invite.token ? { ...item, seenAt: Date.now() } : item))
    if (invite.remoteId) markInviteRead(invite.remoteId)
    notify(`${invite.displayName || invite.host || '초대'}에 합류했습니다.`)
  }
  const dismissInvite = (invite) => setInbox((prev) => prev.filter((item) => item.token !== invite.token))

  return <div className="app-shell">
    <nav className="topbar"><a className="brand" href="#"><span>TM</span><strong>팀메이트</strong></a><div><span className="user-chip">{workspace.label} · 개인 작업공간</span><button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? '☾' : '☀'}</button><button className="button ghost small" onClick={resetAll}>작업공간 초기화</button><button className="button ghost small" disabled={logoutPending} onClick={onLogout}>{logoutPending ? '로그아웃 중...' : '로그아웃'}</button></div></nav>
    {logoutError && <div className="global-notice notice error" role="alert">{logoutError}</div>}
    {legacyDataAvailable && <div className="global-notice notice warning"><span>이 브라우저에 로그인 전 공용 데이터가 있습니다.</span><button className="button ghost small" onClick={importLegacyWorkspace}>현재 계정으로 가져오기</button></div>}
    <header className="hero"><div><span className="hero-chip">TEAM MAKER · FAIR RANDOM</span><h1>팀 나누기부터 역할 배정까지,<br /><em>한 번에 공정하게.</em></h1><p>이전 조합과 참가자 속성까지 고려하는 팀플·스터디용 랜덤 팀 메이커입니다.</p></div><div className="hero-stats"><div><strong>{participants.length}</strong><span>참가자</span></div><div><strong>{teams.length}</strong><span>배정 팀</span></div><div><strong>{roles.length}</strong><span>역할</span></div></div></header>
    <main>
      <div className="setup-grid"><ParticipantSection participants={participants} profiles={profiles} onProfiles={setProfiles} onAdd={addParticipants} onRemove={(name) => setParticipants(participants.filter((item) => item !== name))} onClear={() => setParticipants([])} message={message} /><TeamSettings mode={mode} setMode={setMode} value={settingValue} setValue={setSettingValue} fairness={fairness} setFairness={setFairness} participants={participants} /></div>
      <InviteInboxSection invites={inbox} currentUser={currentUser} onRefresh={(next) => setInbox(next)} onJoin={joinInvite} onDismiss={dismissInvite} />
      <InviteSection currentUser={currentUser} onNotify={notify} />
      <RoleSection roles={roles} roleRules={roleRules} participants={participants} onRules={setRoleRules} onAdd={addRole} onRemove={(role) => setRoles(roles.filter((item) => item !== role))} />
      <div className="assign-banner"><div><span>READY</span><strong>{participants.length}명을 {expectedTeams || 0}개 팀으로 배정합니다.</strong></div><button className="button primary large" onClick={assignTeams}>랜덤 팀 배정하기 <span>→</span></button></div>
      <ResultSection teams={teams} roles={roles} evaluation={evaluation} canUndo={undoStack.length > 0} onUndo={() => { const previous = undoStack.at(-1); setUndoStack(undoStack.slice(0, -1)); setTeams(previous) }} onChange={changeTeams} onReroll={assignTeams} onAssignAll={() => changeTeams(teams.map((team) => assignRoles(team, roles, roleRules)), '모든 역할을 배정했습니다.')} onAssignTeam={(id) => changeTeams(teams.map((team) => team.id === id ? assignRoles(team, roles, roleRules) : team), '역할을 배정했습니다.')} onCopy={() => copyText(resultToText(teams), '결과를 복사했습니다.')} onShare={() => copyText(shareUrl(), '공유 링크를 복사했습니다.')} onQr={async () => setQr(await QRCode.toDataURL(shareUrl(), { width: 320, margin: 2 }))} onDownload={() => download(resultToText(teams), `팀-배정-${new Date().toISOString().slice(0, 10)}.txt`)} />
      <HistorySection histories={histories} onLoad={(history) => { changeTeams(clone(history.teams)); notify('기록을 불러왔습니다.') }} onDelete={(id) => setHistories(histories.filter((item) => item.id !== id))} onToggleFavorite={(id) => setHistories(histories.map((item) => item.id === id ? { ...item, favorite: !item.favorite } : item))} onClear={() => window.confirm('기록을 모두 삭제할까요?') && setHistories([])} onExport={exportJson} onImport={importJson} />
    </main>
    <footer>팀메이트 · 데이터는 이 브라우저의 {workspace.label} 작업공간에 저장되며 서버에 동기화되지 않습니다. · Made by 최준혁</footer>
    {toast && <div className="toast">{toast}</div>}
    {qr && <div className="modal" onClick={() => setQr('')}><div onClick={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setQr('')}>×</button><h3>결과 공유 QR</h3><img src={qr} alt="공유 링크 QR 코드" /><p>스캔하면 현재 배정 결과를 확인할 수 있습니다.</p></div></div>}
    <input ref={importRef} hidden type="file" />
  </div>
}
