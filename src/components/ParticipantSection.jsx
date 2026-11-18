import { useState } from 'react'
import { Search, X } from 'lucide-react'
import Section from './Section'
import RosterPicker from './RosterPicker'
import { useRoster } from '../hooks/useRoster'
import { formatRosterParticipant } from '../utils/roster'
import { formatParticipantIdentifier, parseParticipantLabel } from '../utils/participants'
import { filterParticipants } from '../utils/participantFilter'

export const EXAMPLES = [
  '김민수 (20251234)',
  '이서연 (20240001)',
  '박지훈 (20230009)',
  '최준혁 (2026402040)',
  '정하은 (24기)',
  '강민재 (23기)',
  '윤지우 (22기)',
  '한도윤 (58기)',
]

export default function ParticipantSection({ participants, profiles, onProfiles, onAdd, onRemove, onClear, message, currentUser, showStep = true }) {
  const [input, setInput] = useState('')
  const [expanded, setExpanded] = useState('')
  const [search, setSearch] = useState('')
  const roster = useRoster(currentUser)
  const submit = () => onAdd(input) && setInput('')
  const visibleParticipants = filterParticipants(participants, search, profiles)
  const update = (name, field, value) => onProfiles({ ...profiles, [name]: { ...profiles[name], [field]: value } })
  const addFromRoster = (members) => {
    const fresh = members.filter((member) => !participants.includes(formatRosterParticipant(member)))
    if (!fresh.length) { onAdd(''); return }
    if (!onAdd(fresh.map(formatRosterParticipant).join('\n'))) return
    const profileUpdates = {}
    fresh.forEach((member) => {
      const label = formatRosterParticipant(member)
      const existing = profiles[label] ?? {}
      const next = { ...existing }
      if (member.studentId) next.studentId = member.studentId
      if (member.generation) next.generation = member.generation
      profileUpdates[label] = next
    })
    onProfiles({ ...profiles, ...profileUpdates })
  }

  return (
      <Section id="participants" number="01" title="참가자 입력" description="줄바꿈, 쉼표 또는 엑셀의 이름·희망 분야 두 열을 붙여넣을 수 있습니다." showStep={showStep} actions={<button className="button ghost small" onClick={() => onAdd(EXAMPLES.join('\n'))}>예시 추가</button>}>
      <div className="input-row">
        <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !input.includes('\n')) { event.preventDefault(); submit() } }} placeholder={'김민수 (20251234)\n이서연 (24기), 박지훈'} rows="3" />
        <button className="button primary" onClick={submit}>추가</button>
      </div>
      <p className="helper">이름 (숫자)는 학번, 이름 (숫자기)는 기수로 검증합니다. 예: 김민수 (20251234), 이서연 (17기)</p>
        <p className="helper">두 번째 열에 하드, 소프트, 상관X를 붙여넣으면 희망 분야에 맞춰 조를 나눕니다.</p>
      {roster.eligible && (
        <RosterPicker
          members={roster.members}
          loading={roster.loading}
          error={roster.error}
          loaded={roster.loaded}
          onRefresh={roster.refresh}
          participants={participants}
          onAddMembers={addFromRoster}
        />
      )}
      {message && <div className={`notice ${message.type}`}>{message.text}</div>}
      {participants.length > 4 && (
        <div className="participant-search">
          <Search size={16} aria-hidden="true" />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="이름·학번·전공으로 검색" aria-label="참가자 검색" />
          {search && <button type="button" aria-label="검색어 지우기" onClick={() => setSearch('')}><X size={14} aria-hidden="true" /></button>}
        </div>
      )}
      <div className="list-toolbar"><strong>참가자 {participants.length}명{search.trim() ? ` · ${visibleParticipants.length}명 표시` : ''}</strong>{participants.length > 0 && <button className="text-button danger" onClick={onClear}>전체 삭제</button>}</div>
      <div className="participant-list">
        {participants.length === 0 && <span className="empty-inline">아직 참가자가 없습니다.</span>}
        {participants.length > 0 && visibleParticipants.length === 0 && <span className="empty-inline">검색 결과가 없습니다.</span>}
        {visibleParticipants.map((name) => {
          const parsed = parseParticipantLabel(name)
          return (
            <div className="participant-row" key={name}>
              <button className="participant-name" onClick={() => setExpanded(expanded === name ? '' : name)}>
                <span className="participant-title">
                  <strong>{parsed.name || name}</strong>
                  {parsed.identifierType !== 'none' && parsed.identifierType !== 'invalid' && (
                    <span className="participant-id-badge">{formatParticipantIdentifier(parsed)}</span>
                  )}
                    {profiles[name]?.preference && <span className="participant-id-badge">{({ hard: '하드', soft: '소프트', any: '상관없음' })[profiles[name].preference]}</span>}
                </span>
                <small>{expanded === name ? '접기' : '속성 편집'}</small>
              </button>
              <button className="text-button danger" onClick={() => onRemove(name)}>삭제</button>
              {expanded === name && <div className="profile-fields">
                  <label>희망 분야 <select aria-label={`${parsed.name || name} 희망 분야`} value={profiles[name]?.preference ?? 'any'} onChange={(e) => update(name, 'preference', e.target.value)}><option value="any">상관없음</option><option value="hard">하드</option><option value="soft">소프트</option></select></label>
                <input placeholder="학년 (예: 3학년)" value={profiles[name]?.grade ?? ''} onChange={(e) => update(name, 'grade', e.target.value)} />
                <input placeholder="전공 (예: 컴퓨터공학)" value={profiles[name]?.major ?? ''} onChange={(e) => update(name, 'major', e.target.value)} />
                <input placeholder="수준 (예: 중급)" value={profiles[name]?.level ?? ''} onChange={(e) => update(name, 'level', e.target.value)} />
              </div>}
            </div>
          )
        })}
      </div>
    </Section>
  )
}
