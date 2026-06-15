import { useState } from 'react'
import Section from './Section'
import { buildInviteUrl, parseStudentIds, postInviteNotification } from '../utils/invite'

const STATUS_LABEL = {
  generated: '링크 생성',
  sent: '알림 전송',
  failed: '전송 실패',
}

const formatTime = (value) => {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  } catch {
    return ''
  }
}

export default function InviteSection({ currentUser, onNotify, sentInvites = [], onRecordSentInvite }) {
  const [raw, setRaw] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [notice, setNotice] = useState(null)

  const studentIds = parseStudentIds(raw)

  const reset = () => { setRaw(''); setMessage(''); setInviteUrl(''); setNotice(null) }

  const generate = () => {
    if (!studentIds.length) {
      setNotice({ type: 'error', text: '학번을 한 개 이상 입력해주세요.' })
      return ''
    }
    const url = buildInviteUrl({
      studentIds,
      message,
      host: currentUser?.studentId ?? '',
      displayName: currentUser?.name ?? '',
    })
    setInviteUrl(url)
    onRecordSentInvite?.({ studentIds, message, inviteUrl: url, status: 'generated', createdAt: Date.now(), updatedAt: Date.now() })
    return url
  }

  const copyLink = async () => {
    const url = inviteUrl || generate()
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      onNotify?.('초대 링크를 복사했습니다.')
    } catch {
      window.prompt('아래 링크를 직접 복사하세요.', url)
    }
  }

  const send = async () => {
    const url = inviteUrl || generate()
    if (!url) return
    setPending(true)
    const result = await postInviteNotification({
      studentIds,
      message,
      host: currentUser?.studentId ?? '',
      displayName: currentUser?.name ?? '',
      inviteUrl: url,
    })
    setPending(false)
    if (result.ok) {
      const accepted = result.accepted ?? studentIds.length
      const unknownCount = result.unknown?.length ?? 0
      onRecordSentInvite?.({
        studentIds,
        message,
        inviteUrl: url,
        status: 'sent',
        accepted,
        unknown: result.unknown ?? [],
        rejected: result.rejected ?? 0,
        updatedAt: Date.now(),
      })
      const detail = unknownCount > 0
        ? ` (등록되지 않은 학번 ${unknownCount}명 제외: ${result.unknown.slice(0, 3).join(', ')}${unknownCount > 3 ? '…' : ''})`
        : ''
      setNotice({ type: 'success', text: `${accepted}명에게 COMS 알림을 보냈습니다.${detail}` })
      onNotify?.(`COMS 알림 ${accepted}건 전송 완료.`)
      return
    }
    const reason = result.reason === 'unauthorized'
      ? 'COMS 로그인이 만료되었습니다. 다시 로그인 후 시도해주세요.'
      : result.reason === 'endpoint-missing'
        ? 'COMS 알림 API가 아직 연결되지 않았습니다. 링크는 정상 동작합니다.'
        : result.reason === 'network'
          ? '서버에 연결할 수 없습니다. 링크를 직접 공유해주세요.'
          : '알림 전송에 실패했습니다. 링크를 직접 공유해주세요.'
    onRecordSentInvite?.({ studentIds, message, inviteUrl: url, status: 'failed', reason: result.reason, updatedAt: Date.now() })
    setNotice({ type: 'warning', text: reason })
  }

  return (
    <Section
      id="invites"
      number="01·B"
      title="학번으로 초대"
      description="학번 명단을 입력하면 초대 링크를 만들고 COMS 계정 알림으로 보낼 수 있습니다."
      actions={studentIds.length > 0 && <button className="button ghost small" onClick={reset}>비우기</button>}
    >
      <div className="input-row">
        <textarea
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          placeholder={'20251234\n20259999, 20240001'}
          rows="3"
        />
        <button className="button primary" onClick={generate} disabled={pending}>초대 링크 만들기</button>
      </div>
      <input
        className="invite-message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="초대 메시지 (선택, 최대 280자)"
        maxLength={280}
      />
      <div className="list-toolbar">
        <strong>대상 {studentIds.length}명</strong>
        {studentIds.length > 0 && <span className="muted">{studentIds.slice(0, 6).join(', ')}{studentIds.length > 6 ? ` 외 ${studentIds.length - 6}명` : ''}</span>}
      </div>
      {inviteUrl && (
        <div className="invite-link">
          <code>{inviteUrl}</code>
        </div>
      )}
      <div className="invite-actions">
        <button className="button" onClick={copyLink} disabled={pending}>링크 복사</button>
        <button className="button primary" onClick={send} disabled={pending || !studentIds.length}>
          {pending ? '알림 전송 중...' : 'COMS 알림 보내기'}
        </button>
      </div>
      {sentInvites.length > 0 && (
        <div className="sent-invite-list">
          <strong>최근 보낸 초대</strong>
          {sentInvites.slice(0, 5).map((invite) => (
            <article className={`sent-invite-item ${invite.status}`} key={invite.token}>
              <div>
                <span>{STATUS_LABEL[invite.status] ?? invite.status}</span>
                <strong>{invite.targetCount}명 대상</strong>
                <small>{formatTime(invite.updatedAt || invite.createdAt)}</small>
              </div>
              <p>{invite.message || '메시지 없음'}</p>
              {invite.status === 'sent' && <small>성공 {invite.accepted}명 · 미등록 {invite.unknown.length}명 · 거절 {invite.rejected}건</small>}
              {invite.status === 'failed' && <small>링크는 그대로 사용할 수 있습니다.</small>}
            </article>
          ))}
        </div>
      )}
      {notice && <div className={`notice ${notice.type}`}>{notice.text}</div>}
    </Section>
  )
}
