import { BellRing, CheckCircle2, Link2, Send, TriangleAlert } from 'lucide-react'

const statItems = (progress) => [
  { label: '전체 대상', value: `${progress.targetTotal}명`, icon: Send },
  { label: '알림 전송', value: `${progress.sentTotal}명`, icon: BellRing },
  { label: '링크 필요', value: `${progress.linkOnlyTotal}명`, icon: Link2 },
  { label: '합류 확인', value: `${progress.joinedTotal}명`, icon: CheckCircle2 },
  { label: '전송 실패', value: `${progress.failedTotal}명`, icon: TriangleAlert, tone: progress.failedTotal ? 'warn' : '' },
]

export default function InviteProgressBoard({ progress }) {
  return (
    <section className="invite-progress-board" aria-label="초대 진행 상태">
      <div className="mini-panel-head">
        <strong>초대 진행</strong>
        <span>{progress.nextAction}</span>
      </div>
      <div className="mini-stat-grid">
        {statItems(progress).map((item) => {
          const Icon = item.icon
          return (
            <div className={item.tone ? `mini-stat ${item.tone}` : 'mini-stat'} key={item.label}>
              <Icon size={15} aria-hidden="true" />
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          )
        })}
      </div>
      {(progress.unknownTotal > 0 || progress.rejectedTotal > 0 || progress.pendingInboxTotal > 0) && (
        <p className="mini-panel-note">
          미등록 {progress.unknownTotal}명 · 거절 {progress.rejectedTotal}건 · 받은 초대 대기 {progress.pendingInboxTotal}건
        </p>
      )}
    </section>
  )
}
