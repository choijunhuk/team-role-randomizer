import { Bell, ClipboardList, History, Shuffle, SlidersHorizontal, UserRound, Wand2 } from 'lucide-react'

const items = [
  { href: '#participants', label: '참가자', helper: '명단 입력', key: 'participants', unit: '명', icon: UserRound },
  { href: '#team-settings', label: '팀 설정', helper: '인원 기준', key: 'teams', unit: '팀', icon: SlidersHorizontal },
  { href: '#invites', label: '초대', helper: '알림/링크', key: 'invites', unit: '건', icon: Bell },
  { href: '#roles', label: '역할', helper: '역할 규칙', key: 'roles', unit: '개', icon: ClipboardList },
  { href: '#assignment', label: '배정', helper: '결과 확인', key: 'teams', unit: '팀', icon: Shuffle },
  { href: '#history', label: '기록', helper: '백업/복원', key: 'histories', unit: '개', icon: History },
]

export default function WorkspaceNav({ participants, teams, roles, histories, invites }) {
  const counts = { participants, teams, roles, histories, invites }
  return (
    <aside className="workspace-nav" aria-label="작업 흐름">
      <div className="workspace-nav-head">
        <Wand2 size={16} aria-hidden="true" />
        <strong>작업 흐름</strong>
      </div>
      <nav>
        {items.map((item) => {
          const Icon = item.icon
          return (
            <a href={item.href} key={item.href}>
              <Icon size={15} aria-hidden="true" />
              <span>
                <strong>{item.label}</strong>
                <small>{item.helper}</small>
              </span>
              <em>{counts[item.key] ?? 0}{item.unit}</em>
            </a>
          )
        })}
      </nav>
    </aside>
  )
}
