import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

export default function RoomSwitcher({ rooms, activeRoomId, participantCount, onSelectRoom, onCreateRoom, onDeleteRoom }) {
  const [roomName, setRoomName] = useState('')
  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0]

  const submit = (event) => {
    event.preventDefault()
    const created = onCreateRoom(roomName)
    if (created) setRoomName('')
  }

  return (
    <section className="room-switcher" aria-label="팀 방 관리">
      <div className="room-current">
        <span>현재 방</span>
        <strong>{activeRoom?.name ?? '방 없음'}</strong>
        <small>참가자 {participantCount}명</small>
      </div>
      <div className="room-tabs" role="tablist" aria-label="방 목록">
        {rooms.length === 0 && <span className="empty-inline">방을 만들거나 받은 초대에 합류하세요.</span>}
        {rooms.map((room) => (
          <button
            key={room.id}
            type="button"
            role="tab"
            aria-selected={room.id === activeRoomId}
            aria-pressed={room.id === activeRoomId}
            className={room.id === activeRoomId ? 'is-active' : ''}
            onClick={() => onSelectRoom(room.id)}
          >
            {room.name}
          </button>
        ))}
      </div>
      <form className="room-create" onSubmit={submit}>
        <input
          value={roomName}
          onChange={(event) => setRoomName(event.target.value)}
          placeholder="새 방 이름"
          aria-label="새 방 이름"
        />
        <button type="submit" className="button primary small">
          <Plus size={14} aria-hidden="true" />방 만들기
        </button>
      </form>
      {activeRoomId && (
        <button type="button" className="text-button danger room-delete" onClick={() => onDeleteRoom(activeRoomId)}>
          <Trash2 size={14} aria-hidden="true" />현재 방 삭제
        </button>
      )}
    </section>
  )
}
