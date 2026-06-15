const formatCount = (count, unit) => `${Number(count) || 0}${unit}`

export function getWorkspaceInsights({
  roomName,
  participantsCount,
  expectedTeams,
  rolesCount,
  inboxCount,
  sentInviteCount,
  isAdmin,
  constraintReport,
}) {
  const errors = constraintReport?.errors ?? []
  const warnings = constraintReport?.warnings ?? []
  const inviteTotal = (Number(inboxCount) || 0) + (Number(sentInviteCount) || 0)

  let status = 'ready'
  let statusLabel = '배정 준비 완료'
  let nextAction = '바로 배정할 수 있습니다. 필요하면 기준 프리셋만 바꾸고 실행하세요.'

  if (!roomName) {
    status = 'needs-room'
    statusLabel = '방 필요'
    nextAction = '먼저 방을 만들거나 초대를 수락해 작업공간을 시작하세요.'
  } else if ((Number(participantsCount) || 0) < 2) {
    status = 'needs-participants'
    statusLabel = '참가자 부족'
    nextAction = '참가자 2명 이상을 추가하면 팀 배정을 시작할 수 있습니다.'
  } else if (!Number(expectedTeams)) {
    status = 'needs-setting'
    statusLabel = '팀 기준 필요'
    nextAction = '팀 개수나 팀당 인원을 정하면 배정 준비가 끝납니다.'
  } else if (errors.length) {
    status = 'blocked'
    statusLabel = '조건 확인 필요'
    nextAction = errors[0]
  } else if (warnings.length) {
    status = 'check'
    statusLabel = '확인 권장'
    nextAction = warnings[0]
  }

  return {
    status,
    statusLabel,
    roomName: roomName || '방 없음',
    nextAction,
    capabilityNote: isAdmin
      ? '관리자 모드: 명단 기반 참가자 추가와 일반 팀 배정 도구를 함께 사용할 수 있습니다.'
      : '일반 회원 모드: 팀 배정, 초대, 역할, 기록 도구를 그대로 사용할 수 있습니다.',
    stats: [
      { label: '참가자', value: formatCount(participantsCount, '명') },
      { label: '예상 팀', value: formatCount(expectedTeams, '팀') },
      { label: '역할', value: formatCount(rolesCount, '개') },
      { label: '초대 흐름', value: formatCount(inviteTotal, '건') },
    ],
    blockers: errors,
    warnings,
  }
}

