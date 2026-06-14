import { useEffect, useMemo, useState } from 'react'
import { clearAllData, getUserWorkspace, hasLegacyData, importLegacyData, loadData, saveData } from '../utils/storage'

export const DEFAULT_ROLES = ['발표자', '서기', '자료조사', '발표자료 제작', '코드 작성', '코드 리뷰', '시간 관리', '질문 담당']
export const EMPTY_FAIRNESS = { fixedTeams: {}, avoidPairs: [], preferPairs: [], repeatWeight: 8, balanceFields: [] }

export function useWorkspaceData(currentUser) {
  const workspace = useMemo(() => getUserWorkspace(currentUser), [currentUser])
  if (!workspace) {
    throw new Error('COMS 계정 식별자를 확인할 수 없습니다.')
  }

  const [participants, setParticipants] = useState(() => loadData('participants', [], workspace))
  const [profiles, setProfiles] = useState(() => loadData('profiles', {}, workspace))
  const [roles, setRoles] = useState(() => loadData('roles', DEFAULT_ROLES, workspace))
  const [roleRules, setRoleRules] = useState(() => loadData('roleRules', {}, workspace))
  const [histories, setHistories] = useState(() => loadData('histories', [], workspace))
  const [fairness, setFairness] = useState(() => ({ ...EMPTY_FAIRNESS, ...loadData('fairness', {}, workspace) }))
  const [theme, setTheme] = useState(() => loadData('theme', 'light', workspace))
  const [legacyDataAvailable, setLegacyDataAvailable] = useState(() => hasLegacyData())

  useEffect(() => saveData('participants', participants, workspace), [participants, workspace])
  useEffect(() => saveData('profiles', profiles, workspace), [profiles, workspace])
  useEffect(() => saveData('roles', roles, workspace), [roles, workspace])
  useEffect(() => saveData('roleRules', roleRules, workspace), [roleRules, workspace])
  useEffect(() => saveData('histories', histories, workspace), [histories, workspace])
  useEffect(() => saveData('fairness', fairness, workspace), [fairness, workspace])
  useEffect(() => { saveData('theme', theme, workspace); document.documentElement.dataset.theme = theme }, [theme, workspace])

  const importLegacyWorkspace = () => {
    importLegacyData(workspace)
    setParticipants(loadData('participants', [], workspace))
    setProfiles(loadData('profiles', {}, workspace))
    setRoles(loadData('roles', DEFAULT_ROLES, workspace))
    setRoleRules(loadData('roleRules', {}, workspace))
    setHistories(loadData('histories', [], workspace))
    setFairness({ ...EMPTY_FAIRNESS, ...loadData('fairness', {}, workspace) })
    setTheme(loadData('theme', theme, workspace))
    setLegacyDataAvailable(false)
  }

  const resetWorkspace = () => {
    clearAllData(workspace)
    setParticipants([])
    setProfiles({})
    setRoles(DEFAULT_ROLES)
    setRoleRules({})
    setHistories([])
    setFairness(EMPTY_FAIRNESS)
    setTheme('light')
  }

  return {
    workspace,
    participants,
    setParticipants,
    profiles,
    setProfiles,
    roles,
    setRoles,
    roleRules,
    setRoleRules,
    histories,
    setHistories,
    fairness,
    setFairness,
    theme,
    setTheme,
    legacyDataAvailable,
    setLegacyDataAvailable,
    importLegacyWorkspace,
    resetWorkspace,
  }
}
