export const TEAM_PRESETS = [
  {
    id: 'balanced',
    label: '균형 우선',
    description: '학년·전공·수준을 함께 보고 무난하게 섞습니다.',
    settings: { repeatWeight: 8, balanceFields: ['grade', 'major', 'level'] },
  },
  {
    id: 'fresh',
    label: '중복 최소',
    description: '이전 같은 팀 조합을 더 강하게 피합니다.',
    settings: { repeatWeight: 18, balanceFields: ['grade', 'major', 'level'] },
  },
  {
    id: 'together',
    label: '친한 사람 같이',
    description: '선호 조합을 살리고 이전 조합 회피는 낮춥니다.',
    settings: { repeatWeight: 3, balanceFields: ['grade', 'major'] },
  },
  {
    id: 'fast',
    label: '빠른 랜덤',
    description: '복잡한 균형 조건 없이 빠르게 섞습니다.',
    settings: { repeatWeight: 0, balanceFields: [] },
  },
]

export function applyTeamPreset(fairness, presetId) {
  const preset = TEAM_PRESETS.find((item) => item.id === presetId)
  if (!preset) return fairness

  return {
    ...fairness,
    repeatWeight: preset.settings.repeatWeight,
    balanceFields: [...preset.settings.balanceFields],
  }
}

