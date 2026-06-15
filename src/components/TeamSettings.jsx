import { useState } from 'react'
import { X } from 'lucide-react'
import Section from './Section'
import { applyTeamPreset, TEAM_PRESETS } from '../utils/teamPresets'

export default function TeamSettings({ mode, setMode, value, setValue, fairness, setFairness, participants, constraintReport, showStep = true }) {
  const [pair, setPair] = useState({ avoidPairs: ['', ''], preferPairs: ['', ''] })
  const addPair = (type) => {
    const values = pair[type]
    if (!values[0] || !values[1] || values[0] === values[1]) return
    const next = [...values].sort()
    if (!fairness[type].some((item) => item.join('|') === next.join('|'))) setFairness({ ...fairness, [type]: [...fairness[type], next] })
  }

  return (
    <Section id="team-settings" number="02" title="팀 설정" description="균형, 이전 조합, 고정·선호 조건을 함께 고려합니다." showStep={showStep}>
      <div className="preset-panel">
        <div>
          <strong>배정 기준 프리셋</strong>
          <span>자주 쓰는 기준을 먼저 고르고, 필요하면 고급 옵션에서 미세 조정하세요.</span>
        </div>
        <div className="preset-grid">
          {TEAM_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setFairness(applyTeamPreset(fairness, preset.id))}
            >
              <strong>{preset.label}</strong>
              <span>{preset.description}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="segmented"><button className={mode === 'count' ? 'active' : ''} onClick={() => setMode('count')}>팀 개수 기준</button><button className={mode === 'size' ? 'active' : ''} onClick={() => setMode('size')}>팀당 인원 기준</button></div>
      <label className="field"><span>{mode === 'count' ? '만들 팀 개수' : '팀당 최대 인원'}</span><input type="number" min="1" value={value} onChange={(event) => setValue(event.target.value)} /></label>
      <details className="fairness">
        <summary>고급 공정성 옵션 <span>선택 사항</span></summary>
        <label className="field"><span>이전 같은 팀 회피 강도</span><input type="number" min="0" max="30" value={fairness.repeatWeight ?? 8} onChange={(e) => setFairness({ ...fairness, repeatWeight: e.target.value })} /></label>
        <div className="check-row">
          {['grade', 'major', 'level'].map((field) => <label key={field}><input type="checkbox" checked={(fairness.balanceFields ?? []).includes(field)} onChange={(e) => setFairness({ ...fairness, balanceFields: e.target.checked ? [...(fairness.balanceFields ?? []), field] : (fairness.balanceFields ?? []).filter((item) => item !== field) })} /> {({ grade: '학년', major: '전공', level: '수준' })[field]} 균형</label>)}
        </div>
        <div className="fairness-grid">
          {['avoidPairs', 'preferPairs'].map((type) => <div className="pair-editor" key={type}><strong>{type === 'avoidPairs' ? '같은 팀 금지' : '같은 팀 선호'}</strong><div className="pair-inputs">{[0, 1].map((index) => <select key={index} value={pair[type][index]} onChange={(e) => setPair({ ...pair, [type]: pair[type].map((value, i) => i === index ? e.target.value : value) })}><option value="">사람 {index + 1}</option>{participants.map((name) => <option key={name}>{name}</option>)}</select>)}<button className="button ghost small" onClick={() => addPair(type)}>추가</button></div><div className="mini-tags">{fairness[type].map((item, index) => <span key={item.join()}>{item.join(' · ')} <button aria-label={`${item.join(', ')} 조건 삭제`} onClick={() => setFairness({ ...fairness, [type]: fairness[type].filter((_, i) => i !== index) })}><X size={12} aria-hidden="true" /></button></span>)}</div></div>)}
        </div>
        <div className="fixed-list"><strong>고정 팀 지정</strong>{participants.map((name) => <label key={name}><span>{name}</span><input type="number" min="1" placeholder="팀 번호" value={fairness.fixedTeams[name] ?? ''} onChange={(e) => setFairness({ ...fairness, fixedTeams: { ...fairness.fixedTeams, [name]: e.target.value } })} /></label>)}</div>
      </details>
      {(constraintReport?.errors?.length > 0 || constraintReport?.warnings?.length > 0) && (
        <div className="constraint-report">
          {constraintReport.errors.map((item) => <div className="notice error" key={item}>{item}</div>)}
          {constraintReport.warnings.map((item) => <div className="notice warning" key={item}>{item}</div>)}
        </div>
      )}
    </Section>
  )
}
