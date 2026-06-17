import { Plus, UserPlus, UsersRound } from 'lucide-react'

export default function QuickStartPanel({
  roomReady,
  currentUser,
  onCreateRoom,
  onAddCurrentUser,
  onAddSampleParticipants,
}) {
  const userLabel = currentUser?.name
    ? currentUser.studentId ? `${currentUser.name} (${currentUser.studentId})` : currentUser.name
    : '내 정보'

  return (
    <section className="quick-start-panel" aria-label="빠른 시작">
      <div className="mini-panel-head">
        <strong>빠른 시작</strong>
        <span>{roomReady ? '빈 방을 바로 테스트하거나 내 정보를 참가자로 넣을 수 있습니다.' : '방 이름을 고민하지 말고 바로 작업공간을 열 수 있습니다.'}</span>
      </div>
      <div className="quick-start-actions">
        {roomReady ? (
          <>
            <button type="button" className="button ghost small" onClick={onAddCurrentUser}>
              <UserPlus size={14} aria-hidden="true" />내 정보 추가 · {userLabel}
            </button>
            <button type="button" className="button ghost small" onClick={onAddSampleParticipants}>
              <UsersRound size={14} aria-hidden="true" />예시 8명 추가
            </button>
          </>
        ) : (
          <>
            <button type="button" className="button primary small" onClick={() => onCreateRoom('팀플 빠른 시작')}>
              <Plus size={14} aria-hidden="true" />팀플 방 만들기
            </button>
            <button type="button" className="button ghost small" onClick={() => onCreateRoom('스터디 빠른 시작')}>
              <Plus size={14} aria-hidden="true" />스터디 방 만들기
            </button>
          </>
        )}
      </div>
    </section>
  )
}
