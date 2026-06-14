import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, RefreshCw, Search, UserPlus } from 'lucide-react'
import { dedupeAgainst, searchRoster } from '../utils/roster'

export default function RosterPicker({ members, loading, error, loaded, onRefresh, participants, onAddMembers }) {
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [checked, setChecked] = useState(() => new Set())

  const available = useMemo(() => dedupeAgainst(members, participants), [members, participants])
  const filtered = useMemo(() => searchRoster(available, query), [available, query])

  const toggle = (id) => {
    setChecked((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const addOne = (member) => {
    onAddMembers([member])
    setChecked((current) => {
      const next = new Set(current)
      next.delete(member.id)
      return next
    })
    setQuery('')
  }

  const addChecked = () => {
    const selected = filtered.filter((member) => checked.has(member.id))
    if (!selected.length) return
    onAddMembers(selected)
    setChecked(new Set())
  }

  const allVisibleChecked = filtered.length > 0 && filtered.every((member) => checked.has(member.id))
  const toggleAllVisible = () => {
    setChecked((current) => {
      const next = new Set(current)
      if (allVisibleChecked) filtered.forEach((member) => next.delete(member.id))
      else filtered.forEach((member) => next.add(member.id))
      return next
    })
  }

  return (
    <div className="roster-picker">
      <div className="roster-picker-head">
        <strong>동아리 명단에서 추가</strong>
        <button className="text-button" type="button" onClick={onRefresh} disabled={loading} aria-label="명단 새로고침">
          <RefreshCw size={14} aria-hidden="true" />{loading ? '불러오는 중' : '새로고침'}
        </button>
      </div>
      {error && <div className="notice warning small">{error}</div>}
      {!error && loaded && members.length === 0 && !loading && (
        <div className="notice info small">등록된 동아리 회원이 없습니다.</div>
      )}
      <div className="roster-search" role="combobox" aria-expanded={Boolean(query.trim()) && filtered.length > 0} aria-haspopup="listbox" aria-owns="roster-suggestion-list">
        <Search size={14} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="이름·학번·기수 검색"
          aria-label="동아리 회원 검색"
          aria-controls="roster-suggestion-list"
          aria-autocomplete="list"
        />
      </div>
      {query.trim() && filtered.length > 0 && (
        <ul className="roster-suggestions" role="listbox" id="roster-suggestion-list">
          {filtered.slice(0, 8).map((member) => (
            <li key={member.id} role="option" aria-selected={false}>
              <button type="button" className="roster-suggestion" onClick={() => addOne(member)}>
                <span className="roster-name">{member.name}</span>
                <span className="roster-meta">{member.studentId || member.generation || '학번 미상'}</span>
                <UserPlus size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="roster-toggle"
        onClick={() => setShowAll((value) => !value)}
        aria-expanded={showAll}
      >
        {showAll ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
        전체 명단 {showAll ? '접기' : `펼치기 (${available.length}명)`}
      </button>
      {showAll && (
        <div className="roster-list">
          <div className="roster-list-toolbar">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={allVisibleChecked}
                onChange={toggleAllVisible}
                disabled={filtered.length === 0}
              />
              <span>화면에 보이는 {filtered.length}명 전체 선택</span>
            </label>
            <button type="button" className="button primary small" onClick={addChecked} disabled={checked.size === 0}>
              선택한 {checked.size}명 추가
            </button>
          </div>
          {filtered.length === 0 && <div className="empty-inline">표시할 회원이 없습니다.</div>}
          <ul className="roster-grid">
            {filtered.map((member) => (
              <li key={member.id}>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={checked.has(member.id)}
                    onChange={() => toggle(member.id)}
                  />
                  <span className="roster-name">{member.name}</span>
                  <span className="roster-meta">{member.studentId || member.generation || '학번 미상'}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
