import { DownloadCloud, UploadCloud } from 'lucide-react'
import { useState } from 'react'
import { buildRoomSnapshot, fetchRoomSnapshot, getSharedRoomMode, publishRoomSnapshot } from '../utils/sharedRooms'

const reasonText = (result) => {
  if (!result) return '아직 서버 동기화를 시도하지 않았습니다.'
  if (result.ok) return '공유 방 서버와 스냅샷을 주고받았습니다.'
  if (result.reason === 'endpoint-missing') return 'COMS 공유 방 API가 아직 없어서 현재 방은 로컬 모드로 유지됩니다.'
  if (result.reason === 'unauthorized') return 'COMS 로그인을 확인한 뒤 다시 시도해주세요.'
  if (result.reason === 'network') return '네트워크 연결을 확인해주세요. 로컬 데이터는 유지됩니다.'
  return '공유 동기화를 완료하지 못했습니다. 로컬 데이터는 유지됩니다.'
}

export default function SharedRoomPanel({
  roomReady,
  room,
  currentUser,
  participants,
  profiles,
  roles,
  roleRules,
  fairness,
  histories,
  onApplySnapshot,
  onNotify,
  embedded = false,
}) {
  const [pending, setPending] = useState('')
  const [result, setResult] = useState(null)

  if (!roomReady) return null

  const publish = async () => {
    const snapshot = buildRoomSnapshot({ room, currentUser, participants, profiles, roles, roleRules, fairness, histories })
    setPending('publish')
    const next = await publishRoomSnapshot(snapshot)
    setResult(next)
    setPending('')
    onNotify?.(next.ok ? '공유 방 스냅샷을 보냈습니다.' : '공유 API가 없어 로컬 모드로 유지합니다.')
  }

  const refresh = async () => {
    setPending('fetch')
    const next = await fetchRoomSnapshot(room?.id)
    setResult(next)
    setPending('')
    if (next.ok && next.snapshot) {
      onApplySnapshot?.(next.snapshot)
      onNotify?.('공유 방 스냅샷을 불러왔습니다.')
    } else {
      onNotify?.('공유 API가 없어 현재 로컬 방을 유지합니다.')
    }
  }

  return (
    <section className={`shared-room-panel ${embedded ? 'is-embedded' : ''}`} aria-label="공유 방 동기화">
      <div className="mini-panel-head">
        <span>{reasonText(result)}</span>
      </div>
      <div className="shared-room-actions">
        <span className={`sync-badge mode-${result?.mode ?? 'local'}`}>{getSharedRoomMode(result)}</span>
        <button type="button" className="button ghost small" onClick={publish} disabled={Boolean(pending)}>
          <UploadCloud size={14} aria-hidden="true" />{pending === 'publish' ? '보내는 중...' : '스냅샷 보내기'}
        </button>
        <button type="button" className="button ghost small" onClick={refresh} disabled={Boolean(pending)}>
          <DownloadCloud size={14} aria-hidden="true" />{pending === 'fetch' ? '확인 중...' : '서버에서 확인'}
        </button>
      </div>
    </section>
  )
}
