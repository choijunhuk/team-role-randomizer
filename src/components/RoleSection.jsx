import { useState } from 'react'
import { X } from 'lucide-react'
import Section from './Section'

export default function RoleSection({ roles, roleRules, participants, onRules, onAdd, onRemove }) {
  const [role, setRole] = useState('')
  const submit = () => onAdd(role) && setRole('')
  const update = (name, field, value) => onRules({ ...roleRules, [name]: { ...roleRules[name], [field]: value } })
  return (
    <Section number="03" title="역할 설정" description="역할을 직접 관리하고 참가자별 고정·제외 역할을 지정하세요.">
      <div className="compact-input"><input value={role} onChange={(e) => setRole(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="새 역할 입력" /><button className="button ghost" onClick={submit}>역할 추가</button></div>
      <div className="tags role-tags">{roles.map((item) => <span className="tag" key={item}>{item}<button aria-label={`${item} 역할 삭제`} onClick={() => onRemove(item)}><X size={12} aria-hidden="true" /></button></span>)}</div>
      <details className="fairness"><summary>참가자별 역할 규칙</summary><div className="role-rule-list">{participants.map((name) => <div className="role-rule" key={name}><strong>{name}</strong><select value={roleRules[name]?.fixed ?? ''} onChange={(e) => update(name, 'fixed', e.target.value)}><option value="">고정 역할 없음</option>{roles.map((item) => <option key={item}>{item}</option>)}</select><select multiple value={roleRules[name]?.excluded ?? []} onChange={(e) => update(name, 'excluded', [...e.target.selectedOptions].map((option) => option.value))}>{roles.map((item) => <option key={item}>{item}</option>)}</select></div>)}</div><p className="helper">제외 역할은 Ctrl 또는 Command 키를 누른 채 여러 개 선택할 수 있습니다.</p></details>
    </Section>
  )
}
