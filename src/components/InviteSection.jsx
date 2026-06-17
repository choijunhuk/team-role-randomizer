import { useState } from 'react'
import Section from './Section'
import { useRoster } from '../hooks/useRoster'
import { buildInviteUrl, findAmbiguousGenerationTargets, formatAmbiguousInviteTargetMessage, parseInviteTargets, postInviteNotification } from '../utils/invite'

const STATUS_LABEL = {
  generated: '링크 생성',
  sent: '알림 전송',
  failed: '전송 실패',
}

const FAILURE_REASON_LABEL = {
  unauthorized: '로그인이 만료되어 COMS 알림함에 보내지 못했습니다.',
  'endpoint-missing': 'COMS 알림함 API를 찾지 못했습니다.',
  'request-failed': 'COMS 알림함 요청이 실패했습니다.',
  network: '네트워크 문제로 COMS 알림함에 보내지 못했습니다.',
}

const failureReasonText = (reason) => FAILURE_REASON_LABEL[reason] || 'COMS 알림함에 보내지 못했습니다.'

const formatTime = (value) => {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  } catch {
    return ''
  }
}

export default function InviteSection({
  currentUser,
  onNotify,
  sentInvites = [],
  onRecordSentInvite,
  onDeleteSentInvite,
  showStep = true,
  roomReady = true,
  canCreateRoom = false,
}) {
  const [raw, setRaw] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [notice, setNotice] = useState(null)

  const roster = useRoster(currentUser)
  const parsedTargets = parseInviteTargets(raw)
  const ambiguousTargets = roster.loaded ? findAmbiguousGenerationTargets(parsedTargets.targets, roster.members) : []
  const targets = parsedTargets.targets
  const studentIds = parsedTargets.studentIds
  const generationOnlyCount = targets.filter((target) => target.identifierType === 'generation').length
  const targetError = parsedTargets.errors[0] || (ambiguousTargets.length
    ? formatAmbiguousInviteTargetMessage(ambiguousTargets[0])
    : '')

  const reset = () => { setRaw(''); setMessage(''); setInviteUrl(''); setNotice(null) }

  if (!roomReady) {
    return (
      <Section
        id="invites"
        number="01·B"
        title="방이 먼저 필요합니다"
        description={canCreateRoom
          ? '초대하려면 먼저 방을 만들어주세요. 방을 만든 뒤 초대 링크와 COMS 알림을 보낼 수 있습니다.'
          : '받은 초대를 수락하면 방이 자동으로 만들어집니다. 방이 생긴 다음 초대할 수 있습니다.'}
        showStep={showStep}
      >
        <div className="notice warning">
          {canCreateRoom
            ? '위쪽 방 관리에서 새 방 이름을 입력하고 방 만들기를 눌러주세요.'
            : '아직 참여 중인 방이 없습니다. 받은 초대 알림을 새로고침하거나 초대 링크를 먼저 열어주세요.'}
        </div>
      </Section>
    )
  }

  const generate = () => {
    if (!targets.length) {
      setNotice({ type: 'error', text: '초대 대상을 한 명 이상 입력해주세요.' })
      return ''
    }
    if (targetError) {
      setNotice({ type: 'error', text: targetError })
      return ''
    }
    const url = buildInviteUrl({
      studentIds,
      targets,
      message,
      host: currentUser?.studentId ?? '',
      displayName: currentUser?.name ?? '',
    })
    setInviteUrl(url)
    onRecordSentInvite?.({ studentIds, targets, message, inviteUrl: url, status: 'generated', createdAt: Date.now(), updatedAt: Date.now() })
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
    if (!studentIds.length) {
      setNotice({ type: 'warning', text: '학번이 있는 대상이 없어 COMS 알림은 보낼 수 없습니다. 초대 링크를 복사해서 공유해주세요.' })
      return
    }
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
        targets,
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
      const linkOnly = generationOnlyCount ? ` 기수로 입력한 ${generationOnlyCount}명은 링크를 따로 공유해주세요.` : ''
      setNotice({ type: 'success', text: `${accepted}명에게 COMS 알림을 보냈습니다.${detail}${linkOnly}` })
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
    onRecordSentInvite?.({ studentIds, targets, message, inviteUrl: url, status: 'failed', reason: result.reason, updatedAt: Date.now() })
    setNotice({ type: 'warning', text: reason })
  }

  return (
    <Section
      id="invites"
      number="01·B"
      title="초대 대상"
      description="이름 (학번) 또는 이름 (17기)로 입력하세요. 학번이 있는 대상에게만 COMS 알림을 보냅니다."
      showStep={showStep}
      actions={targets.length > 0 && <button className="button ghost small" onClick={reset}>비우기</button>}
    >
      <div className="input-row">
        <textarea
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          placeholder={'김민수 (20251234)\n이정원 (17기)\n20259999'}
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
        <strong>대상 {targets.length}명</strong>
        {targets.length > 0 && <span className="muted">{targets.slice(0, 4).map((target) => target.label).join(', ')}{targets.length > 4 ? ` 외 ${targets.length - 4}명` : ''}</span>}
      </div>
      {targetError && <div className="notice error">{targetError}</div>}
      {!targetError && generationOnlyCount > 0 && <div className="notice warning">기수만 입력한 {generationOnlyCount}명은 COMS 알림 대상이 아니므로 링크로 초대해야 합니다.</div>}
      {inviteUrl && (
        <div className="invite-link">
          <code>{inviteUrl}</code>
        </div>
      )}
      <div className="invite-actions">
        <button className="button" onClick={copyLink} disabled={pending}>링크 복사</button>
        <button className="button primary" onClick={send} disabled={pending || !studentIds.length || Boolean(targetError)}>
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
              {invite.targets?.length > 0 && <small>{invite.targets.slice(0, 3).map((target) => target.label).join(', ')}{invite.targets.length > 3 ? ` 외 ${invite.targets.length - 3}명` : ''}</small>}
              {invite.status === 'sent' && <small>성공 {invite.accepted}명 · 미등록 {invite.unknown.length}명 · 거절 {invite.rejected}건</small>}
              {invite.status === 'failed' && (
                <small>{failureReasonText(invite.reason)} 초대 링크는 그대로 사용할 수 있습니다.</small>
              )}
              {onDeleteSentInvite && (
                <button className="text-button danger sent-invite-delete" onClick={() => onDeleteSentInvite(invite)} aria-label="보낸 초대 삭제">
                  삭제
                </button>
              )}
            </article>
          ))}
        </div>
      )}
      {notice && <div className={`notice ${notice.type}`}>{notice.text}</div>}
    </Section>
  )
}
