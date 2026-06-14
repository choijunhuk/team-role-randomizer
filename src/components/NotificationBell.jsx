import { useEffect, useRef, useState } from 'react'
import { fetchAllNotifications, markAllNotificationsRead, markInviteRead } from '../utils/invite'

const TYPE_LABEL = {
  EXTERNAL_INVITE: '팀 초대',
  COMMENT_ON_POST: '댓글',
  REPLY_ON_COMMENT: '답글',
  NOTICE_CREATED: '공지사항',
}

function formatTime(value) {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  } catch {
    return ''
  }
}

export default function NotificationBell({ onInvite }) {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const containerRef = useRef(null)

  const unread = items.filter((item) => !item.read).length

  const load = async () => {
    setPending(true)
    setError('')
    const result = await fetchAllNotifications()
    setPending(false)
    if (result.ok) { setItems(result.items); return }
    if (result.reason === 'endpoint-missing') setError('COMS 알림 API 미연결')
    else if (result.reason === 'unauthorized') setError('COMS 로그인 만료')
    else if (result.reason === 'network') setError('네트워크 오류')
    else setError('알림을 불러오지 못했습니다')
  }

  useEffect(() => {
    load()
    const interval = window.setInterval(load, 60_000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!open) return
    const onDocClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const handleClickItem = async (item) => {
    if (!item.read) {
      setItems((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry))
      markInviteRead(item.id)
    }
    if (item.type === 'EXTERNAL_INVITE' && onInvite) onInvite(item)
    if (item.acceptUrl && /^https?:\/\//i.test(item.acceptUrl)) {
      window.open(item.acceptUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const handleMarkAll = async () => {
    if (!unread) return
    setItems((prev) => prev.map((entry) => ({ ...entry, read: true })))
    await markAllNotificationsRead()
  }

  return (
    <div className="notification-bell" ref={containerRef}>
      <button
        type="button"
        className="icon-button bell-button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`알림 ${unread}건`}
      >
        <span aria-hidden="true">🔔</span>
        {unread > 0 && <span className="bell-badge">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className="bell-panel">
          <header>
            <strong>알림</strong>
            <div>
              <button className="text-button" onClick={load} disabled={pending}>{pending ? '불러오는 중...' : '새로고침'}</button>
              {unread > 0 && <button className="text-button" onClick={handleMarkAll}>모두 읽음</button>}
            </div>
          </header>
          {error && <div className="notice warning">{error}</div>}
          {!error && items.length === 0 && <div className="empty-inline">받은 알림이 없습니다.</div>}
          <ul className="bell-list">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`bell-item ${item.read ? '' : 'is-unread'}`}
                  onClick={() => handleClickItem(item)}
                >
                  <span className="bell-type">{TYPE_LABEL[item.type] || item.type}</span>
                  <span className="bell-actor">{item.actorLabel || item.actorStudentId || ''}</span>
                  <span className="bell-message">{item.message}</span>
                  <span className="bell-time">{formatTime(item.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
