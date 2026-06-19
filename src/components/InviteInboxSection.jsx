import { useState } from 'react'
import Section from './Section'
import { fetchInviteInbox, mergeInvites } from '../utils/invite'

const formatTime = (value) => {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  } catch {
    return ''
  }
}

export default function InviteInboxSection({ invites, onRefresh, onJoin, onDismiss, currentUser, showStep = true, embedded = false }) {
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState(null)

  const refresh = async () => {
    setPending(true)
    setNotice(null)
    const result = await fetchInviteInbox()
    setPending(false)
    if (result.ok) {
      const merged = mergeInvites(invites, result.invites)
      onRefresh(merged, { source: 'remote' })
      setNotice({ type: 'success', text: `COMS 인박스에서 ${result.invites.length}개 알림을 불러왔습니다.` })
      return
    }
    const text = result.reason === 'endpoint-missing'
      ? 'COMS 알림 인박스 API가 아직 연결되지 않았습니다. 로컬에 받은 초대만 표시합니다.'
      : result.reason === 'network'
        ? '서버에 연결할 수 없습니다. 로컬에 저장된 초대만 표시합니다.'
        : '인박스를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.'
    setNotice({ type: 'warning', text })
  }

  return (
    <Section
      id="invite-inbox"
      number="01·A"
      title="받은 초대 알림"
      description={`${currentUser?.studentId ? `학번 ${currentUser.studentId}` : '내'} 앞으로 도착한 팀 초대를 확인하세요.`}
      showStep={showStep}
      embedded={embedded}
      actions={<button className="button ghost small" onClick={refresh} disabled={pending}>{pending ? '불러오는 중...' : '새로고침'}</button>}
    >
      {invites.length === 0 && <span className="empty-inline">받은 초대가 없습니다.</span>}
      <div className="invite-inbox">
        {invites.map((invite) => (
          <article className={`invite-card ${invite.seenAt ? '' : 'is-new'}`} key={invite.token}>
            <header>
              <strong>{invite.displayName || invite.host || '초대'}</strong>
              <span className="muted">{formatTime(invite.issuedAt)}</span>
            </header>
            {invite.message && <p>{invite.message}</p>}
            <footer>
              <button className="button primary small" onClick={() => onJoin(invite)}>참가자로 합류</button>
              {invite.inviteUrl && /^https?:\/\//i.test(invite.inviteUrl) && (
                <a className="button ghost small" href={invite.inviteUrl} target="_blank" rel="noopener noreferrer">초대 링크 열기</a>
              )}
              <button className="text-button danger" onClick={() => onDismiss(invite)} aria-label="받은 초대 삭제">삭제</button>
            </footer>
          </article>
        ))}
      </div>
      {notice && <div className={`notice ${notice.type}`}>{notice.text}</div>}
    </Section>
  )
}
