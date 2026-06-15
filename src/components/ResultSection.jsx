import { ChevronLeft, ChevronRight, Copy, Download, Printer, QrCode, Share2, Shuffle, Sparkles, Undo2, UserRoundCheck } from 'lucide-react'
import Section from './Section'

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

export default function ResultSection({ teams, roles, evaluation, canUndo, onUndo, onChange, onAssignAll, onAssignTeam, onCopy, onShare, onQr, onDownload, onReroll, showStep = true }) {
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

  return <Section id="assignment" number="04" title="배정 결과" description="드래그하거나 화살표로 팀을 옮기고 이름과 역할을 직접 수정할 수 있습니다." className="result-section" showStep={showStep} actions={teams.length > 0 && <button className="button ghost small" onClick={onReroll}><Shuffle size={14} aria-hidden="true" />팀 다시 배정</button>}>
    {teams.length === 0 ? <div className="empty-state"><span><Sparkles size={30} aria-hidden="true" /></span><strong>아직 배정 결과가 없습니다.</strong><p>참가자와 팀 설정을 확인한 뒤 팀을 만들어보세요.</p></div> : <>
      {evaluation && <div className={`notice ${evaluation.violations.length ? 'warning' : 'success'}`}>{evaluation.violations.length ? `최선의 결과지만 조건 ${evaluation.violations.length}건을 만족하지 못했습니다: ${evaluation.violations.join(' ')}` : '금지 조건을 모두 만족하는 공정한 배정입니다.'}</div>}
      {evaluation?.breakdown && <div className="fairness-scoreboard" aria-label="공정성 점수 상세">
        {fairnessItems(evaluation).map((item) => <div className={`score-pill ${item.tone}`} key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}
      </div>}
      {evaluation?.details?.repeatedPairs?.length > 0 && <div className="fairness-detail"><strong>반복 조합</strong>{evaluation.details.repeatedPairs.slice(0, 5).map((item) => <span key={item.pair.join('|')}>{item.pair.join(' · ')} {item.count}회</span>)}</div>}
      <div className="result-toolbar"><button className="button primary" onClick={onAssignAll}><UserRoundCheck size={16} aria-hidden="true" />전체 역할 배정</button><button className="button ghost" disabled={!canUndo} onClick={onUndo}><Undo2 size={16} aria-hidden="true" />실행 취소</button><button className="button contrast" onClick={onCopy}><Copy size={16} aria-hidden="true" />결과 복사</button><button className="button ghost" onClick={onShare}><Share2 size={16} aria-hidden="true" />공유 링크</button><button className="button ghost" onClick={onQr}><QrCode size={16} aria-hidden="true" />QR 보기</button><button className="button ghost" onClick={onDownload}><Download size={16} aria-hidden="true" />TXT</button><button className="button ghost" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />인쇄</button></div>
      <div className="team-grid">{teams.map((team, index) => <article className="team-card" key={team.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => drop(team.id, e.dataTransfer.getData('text/plain'))}>
        <div className="team-card-header"><div><span>TEAM {String(index + 1).padStart(2, '0')}</span><input className="team-name-input" value={team.name} onChange={(e) => updateTeam(team.id, { name: e.target.value })} /></div><button className="text-button" onClick={() => onAssignTeam(team.id)}>역할 배정</button></div>
        <ul>{team.members.map((member) => <li draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ sourceId: team.id, name: member.name }))} key={member.name}><span className="avatar">{member.name.slice(0, 1)}</span><input className="member-name-input" value={member.name} onChange={(e) => updateMember(team.id, member.name, { name: e.target.value })} /><select className="role-select" value={member.role} onChange={(e) => updateMember(team.id, member.name, { role: e.target.value })}><option value="">미배정</option>{roles.map((role) => <option key={role}>{role}</option>)}</select><div className="move-buttons"><button aria-label={`${member.name} 이전 팀으로 이동`} disabled={index === 0} onClick={() => move(team.id, member.name, -1)}><ChevronLeft size={14} aria-hidden="true" /></button><button aria-label={`${member.name} 다음 팀으로 이동`} disabled={index === teams.length - 1} onClick={() => move(team.id, member.name, 1)}><ChevronRight size={14} aria-hidden="true" /></button></div></li>)}</ul>
      </article>)}</div>
    </>}
  </Section>
}
