import { useEffect, useMemo, useState } from 'react'
import {
  clearAllData,
  createRoomRecord,
  deleteRoom,
  getRoomWorkspace,
  getUserWorkspace,
  hasLegacyData,
  importLegacyData,
  loadActiveRoomId,
  loadData,
  loadRooms,
  saveActiveRoomId,
  saveData,
  saveRooms,
} from '../utils/storage'

export const DEFAULT_ROLES = ['발표자', '서기', '자료조사', '발표자료 제작', '코드 작성', '코드 리뷰', '시간 관리', '질문 담당']
export const EMPTY_FAIRNESS = { fixedTeams: {}, avoidPairs: [], preferPairs: [], repeatWeight: 8, balanceFields: [] }

export function useWorkspaceData(currentUser) {
  const accountWorkspace = useMemo(() => getUserWorkspace(currentUser), [currentUser])
  if (!accountWorkspace) {
    throw new Error('COMS 계정 식별자를 확인할 수 없습니다.')
  }

  const [rooms, setRooms] = useState(() => loadRooms(accountWorkspace))
  const [activeRoomId, setActiveRoomId] = useState(() => loadActiveRoomId(accountWorkspace))
  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0]
  const workspace = useMemo(() => getRoomWorkspace(accountWorkspace, activeRoom), [accountWorkspace, activeRoom])
  const [loadedWorkspacePrefix, setLoadedWorkspacePrefix] = useState(workspace.prefix)
  const [participants, setParticipants] = useState(() => loadData('participants', [], workspace))
  const [profiles, setProfiles] = useState(() => loadData('profiles', {}, workspace))
  const [roles, setRoles] = useState(() => loadData('roles', DEFAULT_ROLES, workspace))
  const [roleRules, setRoleRules] = useState(() => loadData('roleRules', {}, workspace))
  const [histories, setHistories] = useState(() => loadData('histories', [], workspace))
  const [fairness, setFairness] = useState(() => ({ ...EMPTY_FAIRNESS, ...loadData('fairness', {}, workspace) }))
  const [theme, setTheme] = useState(() => loadData('theme', 'light', workspace))
  const [legacyDataAvailable, setLegacyDataAvailable] = useState(() => hasLegacyData())

  useEffect(() => {
    const nextRooms = loadRooms(accountWorkspace)
    setRooms(nextRooms)
    const nextActiveRoomId = loadActiveRoomId(accountWorkspace)
    setActiveRoomId(nextRooms.some((room) => room.id === nextActiveRoomId) ? nextActiveRoomId : nextRooms[0].id)
  }, [accountWorkspace])

  useEffect(() => {
    setParticipants(loadData('participants', [], workspace))
    setProfiles(loadData('profiles', {}, workspace))
    setRoles(loadData('roles', DEFAULT_ROLES, workspace))
    setRoleRules(loadData('roleRules', {}, workspace))
    setHistories(loadData('histories', [], workspace))
    setFairness({ ...EMPTY_FAIRNESS, ...loadData('fairness', {}, workspace) })
    setTheme(loadData('theme', 'light', workspace))
    setLoadedWorkspacePrefix(workspace.prefix)
  }, [workspace])

  const workspaceLoaded = loadedWorkspacePrefix === workspace.prefix

  useEffect(() => saveRooms(accountWorkspace, rooms), [accountWorkspace, rooms])
  useEffect(() => saveActiveRoomId(accountWorkspace, activeRoomId), [accountWorkspace, activeRoomId])
  useEffect(() => { if (workspaceLoaded) saveData('participants', participants, workspace) }, [participants, workspace, workspaceLoaded])
  useEffect(() => { if (workspaceLoaded) saveData('profiles', profiles, workspace) }, [profiles, workspace, workspaceLoaded])
  useEffect(() => { if (workspaceLoaded) saveData('roles', roles, workspace) }, [roles, workspace, workspaceLoaded])
  useEffect(() => { if (workspaceLoaded) saveData('roleRules', roleRules, workspace) }, [roleRules, workspace, workspaceLoaded])
  useEffect(() => { if (workspaceLoaded) saveData('histories', histories, workspace) }, [histories, workspace, workspaceLoaded])
  useEffect(() => { if (workspaceLoaded) saveData('fairness', fairness, workspace) }, [fairness, workspace, workspaceLoaded])
  useEffect(() => { if (workspaceLoaded) { saveData('theme', theme, workspace); document.documentElement.dataset.theme = theme } }, [theme, workspace, workspaceLoaded])

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

  const createRoom = (name) => {
    const room = createRoomRecord(name)
    setRooms((items) => [...items, room])
    setActiveRoomId(room.id)
    return room
  }

  const removeRoom = (roomId) => {
    const nextRooms = deleteRoom(accountWorkspace, roomId)
    setRooms(nextRooms)
    setActiveRoomId((current) => current === roomId ? nextRooms[0].id : current)
  }

  return {
    rooms,
    activeRoomId,
    activeRoom,
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
    createRoom,
    setActiveRoomId,
    removeRoom,
  }
}
