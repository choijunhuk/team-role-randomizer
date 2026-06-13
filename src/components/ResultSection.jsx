import Section from './Section'

export default function ResultSection({ teams, roles, evaluation, canUndo, onUndo, onChange, onAssignAll, onAssignTeam, onCopy, onShare, onQr, onDownload, onReroll }) {
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

  return <Section number="04" title="배정 결과" description="드래그하거나 화살표로 팀을 옮기고 이름과 역할을 직접 수정할 수 있습니다." className="result-section" actions={teams.length > 0 && <button className="button ghost small" onClick={onReroll}>팀 다시 배정</button>}>
    {teams.length === 0 ? <div className="empty-state"><span>✦</span><strong>아직 배정 결과가 없습니다.</strong><p>참가자와 팀 설정을 확인한 뒤 팀을 만들어보세요.</p></div> : <>
      {evaluation && <div className={`notice ${evaluation.violations.length ? 'warning' : 'success'}`}>{evaluation.violations.length ? `최선의 결과지만 조건 ${evaluation.violations.length}건을 만족하지 못했습니다: ${evaluation.violations.join(' ')}` : '금지 조건을 모두 만족하는 공정한 배정입니다.'}</div>}
      <div className="result-toolbar"><button className="button primary" onClick={onAssignAll}>전체 역할 배정</button><button className="button ghost" disabled={!canUndo} onClick={onUndo}>실행 취소</button><button className="button contrast" onClick={onCopy}>결과 복사</button><button className="button ghost" onClick={onShare}>공유 링크</button><button className="button ghost" onClick={onQr}>QR 보기</button><button className="button ghost" onClick={onDownload}>TXT</button><button className="button ghost" onClick={() => window.print()}>인쇄</button></div>
      <div className="team-grid">{teams.map((team, index) => <article className="team-card" key={team.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => drop(team.id, e.dataTransfer.getData('text/plain'))}>
        <div className="team-card-header"><div><span>TEAM {String(index + 1).padStart(2, '0')}</span><input className="team-name-input" value={team.name} onChange={(e) => updateTeam(team.id, { name: e.target.value })} /></div><button className="text-button" onClick={() => onAssignTeam(team.id)}>역할 배정</button></div>
        <ul>{team.members.map((member) => <li draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ sourceId: team.id, name: member.name }))} key={member.name}><span className="avatar">{member.name.slice(0, 1)}</span><input className="member-name-input" value={member.name} onChange={(e) => updateMember(team.id, member.name, { name: e.target.value })} /><select className="role-select" value={member.role} onChange={(e) => updateMember(team.id, member.name, { role: e.target.value })}><option value="">미배정</option>{roles.map((role) => <option key={role}>{role}</option>)}</select><div className="move-buttons"><button disabled={index === 0} onClick={() => move(team.id, member.name, -1)}>←</button><button disabled={index === teams.length - 1} onClick={() => move(team.id, member.name, 1)}>→</button></div></li>)}</ul>
      </article>)}</div>
    </>}
  </Section>
}
