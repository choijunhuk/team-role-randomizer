import { CheckCircle2, ClipboardList, Sparkles } from 'lucide-react'

export default function WorkspaceCommandCenter({ insights }) {
  return (
    <section className={`command-center status-${insights.status}`} aria-label="작업공간 요약">
      <div className="command-main">
        <div className="command-title">
          <span><Sparkles size={15} aria-hidden="true" /> 오늘의 작업판</span>
          <strong>{insights.roomName}</strong>
        </div>
        <p>{insights.nextAction}</p>
        <div className="command-capability"><ClipboardList size={15} aria-hidden="true" /> {insights.capabilityNote}</div>
      </div>
      <div className="command-side">
        <div className="command-status">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>{insights.statusLabel}</span>
        </div>
        <div className="command-stats">
          {insights.stats.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

