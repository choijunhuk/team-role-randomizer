import { useState } from 'react'
import Section from './Section'

const EXAMPLES = ['김민수', '이서연', '박지훈', '최준혁', '정하은', '강민재', '윤지우', '한도윤']

export default function ParticipantSection({ participants, profiles, onProfiles, onAdd, onRemove, onClear, message }) {
  const [input, setInput] = useState('')
  const [expanded, setExpanded] = useState('')
  const submit = () => onAdd(input) && setInput('')
  const update = (name, field, value) => onProfiles({ ...profiles, [name]: { ...profiles[name], [field]: value } })

  return (
    <Section number="01" title="참가자 입력" description="줄바꿈, 쉼표 또는 엑셀에서 복사한 이름을 한 번에 추가할 수 있습니다." actions={<button className="button ghost small" onClick={() => onAdd(EXAMPLES.join('\n'))}>예시 추가</button>}>
      <div className="input-row">
        <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !input.includes('\n')) { event.preventDefault(); submit() } }} placeholder={'김민수\n이서연, 박지훈'} rows="3" />
        <button className="button primary" onClick={submit}>추가</button>
      </div>
      {message && <div className={`notice ${message.type}`}>{message.text}</div>}
      <div className="list-toolbar"><strong>참가자 {participants.length}명</strong>{participants.length > 0 && <button className="text-button danger" onClick={onClear}>전체 삭제</button>}</div>
      <div className="participant-list">
        {participants.length === 0 && <span className="empty-inline">아직 참가자가 없습니다.</span>}
        {participants.map((name) => (
          <div className="participant-row" key={name}>
            <button className="participant-name" onClick={() => setExpanded(expanded === name ? '' : name)}><span className="avatar">{name.slice(0, 1)}</span><strong>{name}</strong><small>{expanded === name ? '접기' : '속성 편집'}</small></button>
            <button className="text-button danger" onClick={() => onRemove(name)}>삭제</button>
            {expanded === name && <div className="profile-fields">
              <input placeholder="학년 (예: 3학년)" value={profiles[name]?.grade ?? ''} onChange={(e) => update(name, 'grade', e.target.value)} />
              <input placeholder="전공 (예: 컴퓨터공학)" value={profiles[name]?.major ?? ''} onChange={(e) => update(name, 'major', e.target.value)} />
              <input placeholder="수준 (예: 중급)" value={profiles[name]?.level ?? ''} onChange={(e) => update(name, 'level', e.target.value)} />
            </div>}
          </div>
        ))}
      </div>
    </Section>
  )
}
