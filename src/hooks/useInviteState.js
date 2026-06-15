import { useEffect, useState } from 'react'
import { clearInviteHash, fetchInviteInbox, inviteToken, markInviteRead, matchesStudentId, mergeInvites, mergeSentInvites, readInviteFromLocation, removeInviteByToken } from '../utils/invite'
import { loadData, saveData } from '../utils/storage'

export function useInviteState({ currentUser, workspace, setParticipants, notify }) {
  const [loadedWorkspacePrefix, setLoadedWorkspacePrefix] = useState(workspace.prefix)
  const [inbox, setInbox] = useState(() => loadData('inbox', [], workspace))
  const [sentInvites, setSentInvites] = useState(() => loadData('sentInvites', [], workspace))
  const currentStudentId = currentUser?.studentId

  useEffect(() => {
    setInbox(loadData('inbox', [], workspace))
    setSentInvites(loadData('sentInvites', [], workspace))
    setLoadedWorkspacePrefix(workspace.prefix)
  }, [workspace])

  const workspaceLoaded = loadedWorkspacePrefix === workspace.prefix

  useEffect(() => { if (workspaceLoaded) saveData('inbox', inbox, workspace) }, [inbox, workspace, workspaceLoaded])
  useEffect(() => { if (workspaceLoaded) saveData('sentInvites', sentInvites, workspace) }, [sentInvites, workspace, workspaceLoaded])

  useEffect(() => {
    const invite = readInviteFromLocation()
    if (!invite) return
    if (!matchesStudentId(invite, currentUser)) {
      notify(`초대 링크 대상이 아닙니다 (대상 ${invite.studentIds.length}명).`)
      clearInviteHash()
      return
    }
    const incoming = { ...invite, token: inviteToken(invite) }
    setInbox((prev) => mergeInvites(prev, [incoming]))
    const hostLabel = invite.displayName || invite.host || '주최자'
    notify(`${hostLabel}님의 초대가 인박스에 도착했습니다.`)
    clearInviteHash()
  }, [currentStudentId, currentUser, notify])

  useEffect(() => {
    if (!currentStudentId) return
    let cancelled = false
    fetchInviteInbox().then((result) => {
      if (cancelled || !result.ok || !result.invites.length) return
      setInbox((prev) => mergeInvites(prev, result.invites))
    })
    return () => { cancelled = true }
  }, [currentStudentId])

  const recordSentInvite = (invite) => {
    setSentInvites((prev) => mergeSentInvites(prev, [invite]))
  }

  const joinInvite = (invite) => {
    const displayName = currentUser?.name?.trim() || `학번 ${currentUser?.studentId ?? ''}`
    setParticipants((prev) => prev.includes(displayName) ? prev : [...prev, displayName])
    setInbox((prev) => prev.map((item) => item.token === invite.token ? { ...item, seenAt: Date.now() } : item))
    if (invite.remoteId) markInviteRead(invite.remoteId)
    notify(`${invite.displayName || invite.host || '초대'}에 합류했습니다.`)
  }

  const dismissInvite = (invite) => setInbox((prev) => removeInviteByToken(prev, invite))
  const deleteSentInvite = (invite) => setSentInvites((prev) => removeInviteByToken(prev, invite))

  const addNotificationInvite = (item) => {
    const incoming = {
      studentIds: [currentUser?.studentId].filter(Boolean),
      message: item.message,
      host: item.actorStudentId,
      displayName: item.actorLabel,
      issuedAt: Date.parse(item.createdAt) || Date.now(),
      inviteUrl: item.acceptUrl,
      id: item.id,
    }
    setInbox((prev) => mergeInvites(prev, [incoming]))
    notify(`${item.actorLabel || '초대'} 항목을 인박스에 추가했습니다.`)
  }

  const resetInvites = () => {
    setInbox([])
    setSentInvites([])
  }

  return {
    inbox,
    setInbox,
    sentInvites,
    setSentInvites,
    recordSentInvite,
    deleteSentInvite,
    joinInvite,
    dismissInvite,
    addNotificationInvite,
    resetInvites,
  }
}
