import { Star } from 'lucide-react'
import Section from './Section'

export default function HistorySection({ histories, onLoad, onDelete, onToggleFavorite, onClear, onExport, onImport }) {
  return <Section number="05" title="최근 기록" description="제목과 즐겨찾기로 기록을 관리하거나 JSON으로 백업하세요." actions={<div className="section-actions"><button className="button ghost small" onClick={onExport}>JSON 내보내기</button><label className="button ghost small file-button">JSON 가져오기<input type="file" accept="application/json" onChange={onImport} /></label>{histories.length > 0 && <button className="button ghost small" onClick={onClear}>전체 삭제</button>}</div>}>
    <div className="history-list">{histories.length === 0 && <div className="empty-inline">저장된 기록이 없습니다.</div>}{[...histories].sort((a, b) => Number(b.favorite) - Number(a.favorite)).map((history) => <article className="history-item" key={history.id}><div><strong>{history.favorite && <Star className="inline-icon is-filled" size={14} aria-hidden="true" />}{history.title || `${history.teams.length}개 팀 배정`}</strong><span>{history.createdAt} · {history.teams.reduce((sum, team) => sum + team.members.length, 0)}명</span></div><div><button className="text-button" onClick={() => onToggleFavorite(history.id)}><Star className={history.favorite ? 'is-filled' : ''} size={14} aria-hidden="true" />{history.favorite ? '해제' : '즐겨찾기'}</button><button className="text-button" onClick={() => onLoad(history)}>불러오기</button><button className="text-button danger" onClick={() => onDelete(history.id)}>삭제</button></div></article>)}</div>
  </Section>
}
