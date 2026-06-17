import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Moon, Sun, X } from 'lucide-react'
import QRCode from 'qrcode'
import ParticipantSection from './components/ParticipantSection'
import TeamSettings from './components/TeamSettings'
import RoleSection from './components/RoleSection'
import ResultSection from './components/ResultSection'
import HistorySection from './components/HistorySection'
import InviteSection from './components/InviteSection'
import InviteInboxSection from './components/InviteInboxSection'
import Section from './components/Section'
import NotificationBell from './components/NotificationBell'
import BrandLogo from './components/BrandLogo'
import RoomSwitcher from './components/RoomSwitcher'
import WorkspaceNav from './components/WorkspaceNav'
import WorkspaceCommandCenter from './components/WorkspaceCommandCenter'
import { DEFAULT_ROLES, EMPTY_FAIRNESS, useWorkspaceData } from './hooks/useWorkspaceData'
import { useInviteState } from './hooks/useInviteState'
import { parseParticipantInput } from './utils/participants'
import { isAdminUser } from './utils/roster'
import { assignRoles, balancedBuckets, createTeams, decodeShareData, encodeShareData, resultToText, validateTeamConstraints } from './utils/teamUtils'
import { getWorkspaceInsights } from './utils/workspaceInsights'
import { getTeamComposition, rerollUnlockedTeams } from './utils/teamComposition'

const clone = (value) => structuredClone(value)

export default function App({ currentUser, logoutError, logoutPending, onLogout }) {
  const workspaceData = useWorkspaceData(currentUser)
  const { rooms, activeRoomId, workspace, participants, setParticipants, profiles, setProfiles, roles, setRoles, roleRules, setRoleRules, histories, setHistories, fairness, setFairness, theme, setTheme, legacyDataAvailable, importLegacyWorkspace, resetWorkspace, createRoom, createInviteRoom, setActiveRoomId, removeRoom } = workspaceData
  const [mode, setMode] = useState('count')
  const [settingValue, setSettingValue] = useState('2')
  const [teams, setTeams] = useState([])
  const [evaluation, setEvaluation] = useState(null)
  const [undoStack, setUndoStack] = useState([])
  const [lockedTeamIds, setLockedTeamIds] = useState([])
  const [revealKey, setRevealKey] = useState(0)
  const [message, setMessage] = useState(null)
  const [toast, setToast] = useState('')
  const [qr, setQr] = useState('')
  const notify = useCallback((text) => { setToast(text); window.setTimeout(() => setToast(''), 2400) }, [])
  const showStepLabels = isAdminUser(currentUser)
  const inviteOnlyWorkspace = !showStepLabels
  const roomReady = Boolean(workspace.room?.id)

  const expectedTeams = useMemo(() => {
    const value = Number(settingValue)
    return Number.isInteger(value) && value > 0 ? mode === 'count' ? value : Math.ceil(participants.length / value) : 0
  }, [mode, settingValue, participants.length])
  const constraintReport = useMemo(() => validateTeamConstraints(participants, expectedTeams, fairness), [participants, expectedTeams, fairness])
  const { inbox, setInbox, sentInvites, recordSentInvite, deleteSentInvite, joinInvite, dismissInvite, addNotificationInvite, resetInvites } = useInviteState({ currentUser, workspace, setParticipants, createInviteRoom, notify })
  const workspaceInsights = useMemo(() => getWorkspaceInsights({
    roomName: workspace.room?.name ?? '',
    participantsCount: participants.length,
    expectedTeams,
    rolesCount: roles.length,
    inboxCount: inbox.length,
    sentInviteCount: sentInvites.length,
    isAdmin: showStepLabels,
    inviteOnly: inviteOnlyWorkspace,
    constraintReport,
  }), [workspace.room?.name, participants.length, expectedTeams, roles.length, inbox.length, sentInvites.length, showStepLabels, inviteOnlyWorkspace, constraintReport])

  useEffect(() => {
    const hash = new URLSearchParams(location.hash.slice(1)).get('share')
    if (!hash) return
    try {
      const data = decodeShareData(hash)
      if (Array.isArray(data.teams)) setTeams(data.teams)
    } catch { /* Ignore malformed shared links. */ }
  }, [])

  useEffect(() => {
    setTeams([])
    setEvaluation(null)
    setUndoStack([])
    setLockedTeamIds([])
  }, [workspace.prefix])

  const composition = useMemo(() => getTeamComposition(teams, profiles), [teams, profiles])

  const saveSnapshot = () => setUndoStack((stack) => [...stack.slice(-14), clone(teams)])
  const changeTeams = (nextTeams, notice) => { saveSnapshot(); setTeams(nextTeams); if (notice) notify(notice) }

  const addParticipants = (raw) => {
    const result = parseParticipantInput(raw)
    if (result.errors.length) { setMessage({ type: 'error', text: result.errors[0] }); return false }
    const next = [...new Set(result.names)].filter((name) => !participants.includes(name))
    if (!next.length) { setMessage({ type: 'error', text: result.names.length ? '이미 등록된 참가자입니다.' : '추가할 이름을 입력해주세요.' }); return false }
    setParticipants([...participants, ...next])
    const duplicateNotice = next.length < result.names.length ? ' 중복 참가자는 제외했습니다.' : ''
    const nameOnlyNotice = result.nameOnlyCount ? ` 식별자 없는 ${result.nameOnlyCount}명은 이름만 표시됩니다.` : ''
    setMessage({ type: duplicateNotice || nameOnlyNotice ? 'warning' : 'success', text: `${next.length}명을 추가했습니다.${duplicateNotice}${nameOnlyNotice}` })
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
    if (constraintReport.errors.length) return constraintReport.errors[0]
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
    setLockedTeamIds([])
    setRevealKey((value) => value + 1)
    addHistory(result.teams)
    notify(`${result.teams.length}개 팀을 배정했습니다.`)
    window.setTimeout(() => document.querySelector('.result-section')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }
  const toggleTeamLock = (teamId) => setLockedTeamIds((ids) => ids.includes(teamId) ? ids.filter((id) => id !== teamId) : [...ids, teamId])
  const rerollUnlocked = () => {
    if (teams.length === 0) return
    if (lockedTeamIds.length === 0) return assignTeams()
    if (lockedTeamIds.length >= teams.length) return notify('잠금 해제된 팀이 없습니다.')
    const next = rerollUnlockedTeams(teams, lockedTeamIds, balancedBuckets)
    changeTeams(next)
    setEvaluation(null)
    setRevealKey((value) => value + 1)
    notify('잠그지 않은 팀만 다시 섞었습니다.')
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
  const resetAll = () => {
    if (!window.confirm('현재 방의 모든 데이터를 초기화할까요?')) return
    resetWorkspace(); resetInvites(); setTeams([]); setUndoStack([]); notify('현재 방을 초기화했습니다.')
  }
  const createWorkspaceRoom = (name) => {
    const room = createRoom(name)
    notify(`${room.name} 방을 만들었습니다.`)
    return true
  }
  const selectWorkspaceRoom = (roomId) => {
    setActiveRoomId(roomId)
    const room = rooms.find((item) => item.id === roomId)
    if (room) notify(`${room.name} 방으로 이동했습니다.`)
  }
  const deleteWorkspaceRoom = (roomId) => {
    const room = rooms.find((item) => item.id === roomId)
    if (!room) return
    if (!window.confirm(`${room.name} 방을 삭제할까요? 이 방의 참가자와 기록이 삭제됩니다.`)) return
    removeRoom(roomId)
    setTeams([])
    setUndoStack([])
    notify(`${room.name} 방을 삭제했습니다.`)
  }

  const assignAllRoles = () => changeTeams(teams.map((team) => assignRoles(team, roles, roleRules)), '모든 역할을 배정했습니다.')

  useEffect(() => {
    if (!showStepLabels) return undefined
    const handler = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return
      const key = event.key.toLowerCase()
      if (key === 'r') { event.preventDefault(); assignTeams() }
      else if (key === 'e' && teams.length) { event.preventDefault(); rerollUnlocked() }
      else if (key === 'a' && teams.length) { event.preventDefault(); assignAllRoles() }
      else if (key === 'z' && undoStack.length) { event.preventDefault(); const previous = undoStack.at(-1); setUndoStack(undoStack.slice(0, -1)); setTeams(previous) }
      else if (key === 'c' && teams.length) { event.preventDefault(); copyText(resultToText(teams), '결과를 복사했습니다.') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const topbar = <div className="topbar-wrap"><nav className="topbar"><BrandLogo href="#" /><div><span className="user-chip">{workspace.label} · 개인 작업공간</span><NotificationBell onInvite={addNotificationInvite} /><button className="icon-button" aria-label={theme === 'light' ? '다크 모드로 변경' : '라이트 모드로 변경'} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}</button>{showStepLabels && <button className="button ghost small" onClick={resetAll}>현재 방 초기화</button>}<button className="button ghost small" disabled={logoutPending} onClick={onLogout}>{logoutPending ? '로그아웃 중...' : '로그아웃'}</button></div></nav></div>

  return <div className={`app-shell ${showStepLabels ? 'admin-workspace' : 'member-workspace'}`}>
    {topbar}
    {showStepLabels && (
      <RoomSwitcher
        rooms={rooms}
        activeRoomId={activeRoomId}
        participantCount={participants.length}
        onSelectRoom={selectWorkspaceRoom}
        onCreateRoom={createWorkspaceRoom}
        onDeleteRoom={deleteWorkspaceRoom}
      />
    )}
    {logoutError && <div className="global-notice notice error" role="alert">{logoutError}</div>}
    {legacyDataAvailable && <div className="global-notice notice warning"><span>이 브라우저에 로그인 전 공용 데이터가 있습니다.</span><button className="button ghost small" onClick={importLegacyWorkspace}>현재 계정으로 가져오기</button></div>}
    <header className="hero workspace-hero">
      <div>
        <span className="hero-chip">TEAM ROOM</span>
        <h1>{workspace.room?.name ?? '새 방을 만들거나 초대를 수락하세요'}</h1>
        <p>{showStepLabels ? '명단에서 참가자를 고르거나 직접 입력한 뒤 팀 기준을 정하면 바로 배정할 수 있습니다.' : '초대만으로 참여할 수 있습니다. 받은 초대를 확인하거나 필요한 사람에게 초대 링크를 보내세요.'}</p>
      </div>
      {showStepLabels ? (roomReady ? <div className="hero-actions">
        <div className="hero-stats">
          <div><strong>{participants.length}</strong><span>참가자</span></div>
          <div><strong>{expectedTeams || 0}</strong><span>예상 팀</span></div>
          <div><strong>{roles.length}</strong><span>역할</span></div>
        </div>
        <button className="button primary large" onClick={assignTeams}>
          랜덤 팀 배정하기 <ArrowRight size={17} aria-hidden="true" />
        </button>
      </div> : <div className="hero-actions member-invite-summary"><div className="hero-stats invite-stats"><div><strong>{rooms.length}</strong><span>방</span></div><div><strong>{inbox.length}</strong><span>받은 초대</span></div></div></div>) : <div className="hero-actions member-invite-summary"><div className="hero-stats invite-stats"><div><strong>{inbox.length}</strong><span>받은 초대</span></div><div><strong>{sentInvites.length}</strong><span>보낸 초대</span></div></div></div>}
    </header>
    {inviteOnlyWorkspace ? (
      <main className="member-invite-layout">
        <WorkspaceCommandCenter insights={workspaceInsights} />
        <div className="support-grid invite-focus-grid">
          <InviteInboxSection invites={inbox} currentUser={currentUser} onRefresh={(next) => setInbox(next)} onJoin={joinInvite} onDismiss={dismissInvite} showStep={false} />
          <InviteSection currentUser={currentUser} onNotify={notify} sentInvites={sentInvites} onRecordSentInvite={recordSentInvite} onDeleteSentInvite={deleteSentInvite} showStep={false} roomReady={roomReady} />
        </div>
      </main>
    ) : !roomReady ? (
      <main className="member-invite-layout">
        <WorkspaceCommandCenter insights={workspaceInsights} />
        <div className="support-grid invite-focus-grid">
          <Section id="no-room" number="01" title="먼저 방을 만들어주세요" description="참가자 추가·팀 구성·역할 배정 도구는 방을 만든 뒤에 열립니다. 위쪽 방 관리에서 새 방을 만들거나, 받은 초대를 수락하면 방이 자동으로 생깁니다." showStep={showStepLabels}>
            <div className="notice warning">위쪽 <strong>방 관리</strong>에서 새 방 이름을 입력하고 <strong>방 만들기</strong>를 누르면 모든 도구가 열립니다.</div>
          </Section>
          <InviteInboxSection invites={inbox} currentUser={currentUser} onRefresh={(next) => setInbox(next)} onJoin={joinInvite} onDismiss={dismissInvite} showStep={showStepLabels} />
        </div>
      </main>
    ) : (
      <main className="workspace-layout">
        <WorkspaceNav
          participants={participants.length}
          teams={teams.length || expectedTeams || 0}
          roles={roles.length}
          histories={histories.length}
          invites={inbox.length + sentInvites.length}
        />
        <div className="workspace-content">
          <WorkspaceCommandCenter insights={workspaceInsights} />
          <div className="setup-grid"><ParticipantSection participants={participants} profiles={profiles} onProfiles={setProfiles} onAdd={addParticipants} onRemove={(name) => setParticipants(participants.filter((item) => item !== name))} onClear={() => setParticipants([])} message={message} currentUser={currentUser} showStep={showStepLabels} /><TeamSettings mode={mode} setMode={setMode} value={settingValue} setValue={setSettingValue} fairness={fairness} setFairness={setFairness} participants={participants} constraintReport={constraintReport} showStep={showStepLabels} /></div>
          <div className="support-grid">
            <InviteInboxSection invites={inbox} currentUser={currentUser} onRefresh={(next) => setInbox(next)} onJoin={joinInvite} onDismiss={dismissInvite} showStep={showStepLabels} />
            <InviteSection currentUser={currentUser} onNotify={notify} sentInvites={sentInvites} onRecordSentInvite={recordSentInvite} onDeleteSentInvite={deleteSentInvite} showStep={showStepLabels} roomReady={roomReady} canCreateRoom={showStepLabels} />
          </div>
          <RoleSection roles={roles} roleRules={roleRules} participants={participants} onRules={setRoleRules} onAdd={addRole} onRemove={(role) => setRoles(roles.filter((item) => item !== role))} showStep={showStepLabels} />
          <div className="assign-banner"><div><span>READY</span><strong>{participants.length}명을 {expectedTeams || 0}개 팀으로 배정합니다.</strong></div><button className="button primary large" onClick={assignTeams}>랜덤 팀 배정하기 <ArrowRight size={17} aria-hidden="true" /></button></div>
          <ResultSection teams={teams} roles={roles} evaluation={evaluation} composition={composition} lockedTeamIds={lockedTeamIds} revealKey={revealKey} onToggleLock={toggleTeamLock} onRerollUnlocked={rerollUnlocked} canUndo={undoStack.length > 0} onUndo={() => { const previous = undoStack.at(-1); setUndoStack(undoStack.slice(0, -1)); setTeams(previous) }} onChange={changeTeams} onReroll={assignTeams} onAssignAll={assignAllRoles} onAssignTeam={(id) => changeTeams(teams.map((team) => team.id === id ? assignRoles(team, roles, roleRules) : team), '역할을 배정했습니다.')} onCopy={() => copyText(resultToText(teams), '결과를 복사했습니다.')} onShare={() => copyText(shareUrl(), '공유 링크를 복사했습니다.')} onQr={async () => setQr(await QRCode.toDataURL(shareUrl(), { width: 320, margin: 2 }))} onDownload={() => download(resultToText(teams), `팀-배정-${new Date().toISOString().slice(0, 10)}.txt`)} showStep={showStepLabels} />
          <HistorySection histories={histories} onLoad={(history) => { changeTeams(clone(history.teams)); notify('기록을 불러왔습니다.') }} onDelete={(id) => setHistories(histories.filter((item) => item.id !== id))} onToggleFavorite={(id) => setHistories(histories.map((item) => item.id === id ? { ...item, favorite: !item.favorite } : item))} onClear={() => window.confirm('기록을 모두 삭제할까요?') && setHistories([])} onExport={exportJson} onImport={importJson} showStep={showStepLabels} />
        </div>
      </main>
    )}
    <footer>팀메이트 · 데이터는 이 브라우저의 {workspace.label}에 저장되며 서버에 동기화되지 않습니다. · Made by 최준혁</footer>
    {showStepLabels && roomReady && (
      <div className="mobile-action-bar">
        <button className="button primary" onClick={assignTeams}>
          {participants.length}명 · {expectedTeams || 0}팀 랜덤 배정 <ArrowRight size={17} aria-hidden="true" />
        </button>
      </div>
    )}
    {toast && <div className="toast">{toast}</div>}
    {qr && <div className="modal" onClick={() => setQr('')}><div onClick={(e) => e.stopPropagation()}><button className="modal-close" aria-label="QR 모달 닫기" onClick={() => setQr('')}><X size={16} aria-hidden="true" /></button><h3>결과 공유 QR</h3><img src={qr} alt="공유 링크 QR 코드" /><p>스캔하면 현재 배정 결과를 확인할 수 있습니다.</p></div></div>}
  </div>
}
