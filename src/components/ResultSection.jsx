import { ChevronLeft, ChevronRight, Copy, Download, Lock, Printer, QrCode, Share2, Shuffle, Sparkles, Undo2, Unlock, UserRoundCheck } from 'lucide-react'
import Section from './Section'
import { useState } from 'react'
import { teamAccent } from '../utils/teamComposition'

const fairnessItems = (evaluation) => {
  if (!evaluation?.breakdown) return []
  const { breakdown } = evaluation
  return [
    { label: '금지 위반', value: `${breakdown.avoidViolations}건`, tone: breakdown.avoidViolations ? 'bad' : 'good' },
    { label: '선호 반영', value: `${breakdown.preferMatches}쌍`, tone: breakdown.preferMatches ? 'good' : '' },
    { label: '반복 페널티', value: `+${breakdown.repeatPenalty}`, tone: breakdown.repeatPenalty ? 'warn' : 'good' },
    { label: '속성 불균형', value: `+${breakdown.balancePenalty}`, tone: breakdown.balancePenalty ? 'warn' : 'good' },
    { label: '총점', value: breakdown.score, tone: breakdown.score <= 0 ? 'good' : 'warn' },
  ]
}

// Distinct hue per distribution value so the same value shares a color across teams.
const segmentColor = (field, value, valueIndex) => {
  if (value === '미입력') return 'var(--app-subtle)'
  const base = (field.length * 47 + valueIndex * 67) % 360
  return `hsl(${base} 62% 52%)`
}

function BalancePanel({ composition }) {
  const [field, setField] = useState(composition.fields[0])
  if (!composition.fields.length) return null
  const activeField = composition.fields.includes(field) ? field : composition.fields[0]
  // Stable color map for the values seen in the active field across all teams.
  const valueOrder = []
  composition.teams.forEach((team) => {
    const dist = team.distributions.find((d) => d.field === activeField)
    dist?.segments.forEach((seg) => { if (!valueOrder.includes(seg.value)) valueOrder.push(seg.value) })
  })
  const colorFor = (value) => segmentColor(activeField, value, valueOrder.indexOf(value))

  return (
    <div className="balance-panel" aria-label="팀 구성 분포">
      <div className="balance-head">
        <strong>팀 구성 분포</strong>
        <div className="balance-field-tabs" role="tablist">
          {composition.fields.map((item) => {
            const label = composition.teams[0]?.distributions.find((d) => d.field === item)?.label ?? item
            return <button key={item} role="tab" aria-selected={item === activeField} className={item === activeField ? 'is-active' : ''} onClick={() => setField(item)}>{label}</button>
          })}
        </div>
      </div>
      <div className="balance-legend">
        {valueOrder.map((value) => <span key={value}><i style={{ background: colorFor(value) }} />{value}</span>)}
      </div>
      <div className="balance-grid">
        {composition.teams.map((team) => {
          const dist = team.distributions.find((d) => d.field === activeField)
          return (
            <div className="balance-team" key={team.id} style={{ '--team-accent': team.accent.color }}>
              <div className="balance-team-head"><strong>{team.name}</strong><span>{team.size}명</span></div>
              <div className="balance-bar">
                {(dist?.segments ?? []).map((seg) => (
                  <i key={seg.value} title={`${seg.value} ${seg.count}명`} style={{ width: `${seg.ratio * 100}%`, background: colorFor(seg.value) }} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ResultSection({ teams, roles, evaluation, composition, lockedTeamIds = [], revealKey = 0, onToggleLock, onRerollUnlocked, canUndo, onUndo, onChange, onAssignAll, onAssignTeam, onCopy, onShare, onQr, onDownload, onReroll, showStep = true }) {
  const updateTeam = (teamId, patch) => onChange(teams.map((team) => team.id === teamId ? { ...team, ...patch } : team))
  const updateMember = (teamId, name, patch) => onChange(teams.map((team) => team.id === teamId ? { ...team, members: team.members.map((member) => member.name === name ? { ...member, ...patch } : member) } : team))
  const move = (teamId, name, direction) => {
    const index = teams.findIndex((team) => team.id === teamId)
    const target = teams[index + direction]
    if (!target) return
    onChange(teams.map((team) => team.id === teamId ? { ...team, members: team.members.filter((member) => member.name !== name) } : team.id === target.id ? { ...team, members: [...team.members, teams[index].members.find((member) => member.name === name)] } : team))
  }
  const drop = (targetId, payload) => {
    const { sourceId, name } = JSON.parse(payload)
    if (sourceId === targetId) return
    const member = teams.find((team) => team.id === sourceId)?.members.find((item) => item.name === name)
    if (!member) return
    onChange(teams.map((team) => team.id === sourceId ? { ...team, members: team.members.filter((item) => item.name !== name) } : team.id === targetId ? { ...team, members: [...team.members, member] } : team))
  }
  const lockedCount = lockedTeamIds.length

  return <Section id="assignment" number="04" title="배정 결과" description="드래그하거나 화살표로 팀을 옮기고 이름과 역할을 직접 수정할 수 있습니다. 키보드: R 다시 배정 · E 미잠금만 · A 역할 · Z 취소 · C 복사" className="result-section" showStep={showStep} actions={teams.length > 0 && <button className="button ghost small" onClick={onReroll}><Shuffle size={14} aria-hidden="true" />팀 다시 배정</button>}>
    {teams.length === 0 ? <div className="empty-state"><span><Sparkles size={30} aria-hidden="true" /></span><strong>아직 배정 결과가 없습니다.</strong><p>참가자와 팀 설정을 확인한 뒤 팀을 만들어보세요.</p></div> : <>
      {evaluation && <div className={`notice ${evaluation.violations.length ? 'warning' : 'success'}`}>{evaluation.violations.length ? `최선의 결과지만 조건 ${evaluation.violations.length}건을 만족하지 못했습니다: ${evaluation.violations.join(' ')}` : '금지 조건을 모두 만족하는 공정한 배정입니다.'}</div>}
      {evaluation?.breakdown && <div className="fairness-scoreboard" aria-label="공정성 점수 상세">
        {fairnessItems(evaluation).map((item) => <div className={`score-pill ${item.tone}`} key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}
      </div>}
      {evaluation?.details?.repeatedPairs?.length > 0 && <div className="fairness-detail"><strong>반복 조합</strong>{evaluation.details.repeatedPairs.slice(0, 5).map((item) => <span key={item.pair.join('|')}>{item.pair.join(' · ')} {item.count}회</span>)}</div>}
      {composition?.fields?.length > 0 && <BalancePanel composition={composition} />}
      <div className="result-toolbar"><button className="button primary" onClick={onAssignAll}><UserRoundCheck size={16} aria-hidden="true" />전체 역할 배정</button>{onRerollUnlocked && <button className="button ghost" disabled={lockedCount === 0 || lockedCount >= teams.length} onClick={onRerollUnlocked}><Shuffle size={16} aria-hidden="true" />미잠금 팀만 다시</button>}<button className="button ghost" disabled={!canUndo} onClick={onUndo}><Undo2 size={16} aria-hidden="true" />실행 취소</button><button className="button contrast" onClick={onCopy}><Copy size={16} aria-hidden="true" />결과 복사</button><button className="button ghost" onClick={onShare}><Share2 size={16} aria-hidden="true" />공유 링크</button><button className="button ghost" onClick={onQr}><QrCode size={16} aria-hidden="true" />QR 보기</button><button className="button ghost" onClick={onDownload}><Download size={16} aria-hidden="true" />TXT</button><button className="button ghost" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />인쇄</button></div>
      <div className="team-grid" key={revealKey}>{teams.map((team, index) => {
        const accent = teamAccent(index)
        const isLocked = lockedTeamIds.includes(team.id)
        return <article className="team-card reveal" key={team.id} style={{ '--team-accent': accent.color, '--team-accent-soft': accent.soft, '--reveal-delay': `${index * 70}ms` }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => drop(team.id, e.dataTransfer.getData('text/plain'))}>
        <div className="team-card-header"><div><span>TEAM {String(index + 1).padStart(2, '0')}</span><input className="team-name-input" value={team.name} onChange={(e) => updateTeam(team.id, { name: e.target.value })} /></div><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{onToggleLock && <button type="button" className={`team-lock ${isLocked ? 'is-locked' : ''}`} aria-pressed={isLocked} onClick={() => onToggleLock(team.id)}>{isLocked ? <Lock size={12} aria-hidden="true" /> : <Unlock size={12} aria-hidden="true" />}{isLocked ? '잠금' : '잠그기'}</button>}<button className="text-button" onClick={() => onAssignTeam(team.id)}>역할 배정</button></div></div>
        <ul>{team.members.map((member) => <li draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ sourceId: team.id, name: member.name }))} key={member.name}><span className="avatar">{member.name.slice(0, 1)}</span><input className="member-name-input" value={member.name} onChange={(e) => updateMember(team.id, member.name, { name: e.target.value })} /><select className="role-select" value={member.role} onChange={(e) => updateMember(team.id, member.name, { role: e.target.value })}><option value="">미배정</option>{roles.map((role) => <option key={role}>{role}</option>)}</select><div className="move-buttons"><button aria-label={`${member.name} 이전 팀으로 이동`} disabled={index === 0} onClick={() => move(team.id, member.name, -1)}><ChevronLeft size={14} aria-hidden="true" /></button><button aria-label={`${member.name} 다음 팀으로 이동`} disabled={index === teams.length - 1} onClick={() => move(team.id, member.name, 1)}><ChevronRight size={14} aria-hidden="true" /></button></div></li>)}</ul>
      </article>
      })}</div>
    </>}
  </Section>
}
