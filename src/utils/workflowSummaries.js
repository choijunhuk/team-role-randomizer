const number = (value) => Math.max(0, Number(value) || 0)

export function getInviteProgress(sentInvites = [], inbox = []) {
  const sentRows = Array.isArray(sentInvites) ? sentInvites : []
  const inboxRows = Array.isArray(inbox) ? inbox : []
  const countTargets = (invite) => number(invite.targetCount || invite.targets?.length || invite.studentIds?.length)

  const targetTotal = sentRows.reduce((sum, invite) => sum + countTargets(invite), 0)
  const sentTotal = sentRows
    .filter((invite) => invite.status === 'sent')
    .reduce((sum, invite) => sum + countTargets(invite), 0)
  const failedTotal = sentRows
    .filter((invite) => invite.status === 'failed')
    .reduce((sum, invite) => sum + countTargets(invite), 0)
  const linkOnlyTotal = sentRows
    .filter((invite) => invite.status === 'generated' && !number(invite.studentIds?.length))
    .reduce((sum, invite) => sum + countTargets(invite), 0)
  const joinedTotal = inboxRows.filter((invite) => invite.seenAt).length
  const pendingInboxTotal = inboxRows.filter((invite) => !invite.seenAt).length
  const rejectedTotal = sentRows.reduce((sum, invite) => sum + number(invite.rejected), 0)
  const unknownTotal = sentRows.reduce((sum, invite) => sum + number(invite.unknown?.length), 0)

  const nextAction = failedTotal > 0
    ? `실패한 초대 ${failedTotal}건을 링크로 다시 공유하세요.`
    : linkOnlyTotal > 0
      ? `링크 공유가 필요한 대상 ${linkOnlyTotal}명이 있습니다.`
      : pendingInboxTotal > 0
        ? `받은 초대 ${pendingInboxTotal}건을 확인하면 합류 상태가 정리됩니다.`
        : targetTotal > 0
          ? '초대 흐름이 정리되었습니다. 합류한 사람을 참가자 목록에 반영하세요.'
          : '초대를 만들면 진행 상태가 여기에 표시됩니다.'

  return {
    targetTotal,
    sentTotal,
    failedTotal,
    linkOnlyTotal,
    joinedTotal,
    pendingInboxTotal,
    rejectedTotal,
    unknownTotal,
    nextAction,
  }
}

export function buildPresentationQueue(teams = []) {
  const queue = []
  teams.forEach((team) => {
    ;(team.members ?? []).forEach((member) => {
      queue.push({
        order: queue.length + 1,
        teamName: team.name,
        memberName: member.name,
        role: member.role || '미배정',
      })
    })
  })
  return queue
}

export function getUnassignedRoleMembers(teams = []) {
  return teams.flatMap((team) => (team.members ?? [])
    .filter((member) => !member.role)
    .map((member) => ({ teamName: team.name, memberName: member.name })))
}

export function resultToChecklistText(teams = []) {
  const lines = ['[팀메이트 진행 체크리스트]', '']
  teams.forEach((team) => {
    lines.push(`${team.name}`)
    lines.push(`- [ ] ${team.name} 참석 확인`)
    lines.push(`- [ ] ${team.name} 역할 확인`)
    ;(team.members ?? []).forEach((member) => {
      lines.push(`- [ ] ${member.name} ${member.role ? `${member.role} 진행 확인` : '역할 확정'}`)
    })
    lines.push('')
  })
  return lines.join('\n').trim()
}
