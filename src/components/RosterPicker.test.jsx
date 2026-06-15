import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import RosterPicker from './RosterPicker'

describe('RosterPicker', () => {
  it('renders admin roster summary and bulk controls', () => {
    const markup = renderToStaticMarkup(
      <RosterPicker
        members={[
          { id: '1', studentId: '20251234', name: '김민수', generation: '23기', admissionYear: 2025 },
          { id: '4', studentId: '20269999', name: '김민수', generation: '24기', admissionYear: 2026 },
          { id: '2', studentId: '20240001', name: '이서연', generation: '22기', admissionYear: 2024 },
          { id: '3', studentId: '', name: '졸업생', generation: '', admissionYear: null },
        ]}
        loading={false}
        error=""
        loaded
        onRefresh={() => {}}
        participants={['이서연']}
        onAddMembers={() => {}}
      />,
    )

    expect(markup).toContain('명단 4명')
    expect(markup).toContain('미추가 4명')
    expect(markup).toContain('학번 누락 1명')
    expect(markup).toContain('동명이인 1건')
    expect(markup).toContain('학번·기수 라벨로 구분해 추가합니다')
    expect(markup).toContain('기수 선택')
    expect(markup).toContain('현재 필터 추가')
    expect(markup).toContain('CSV')
  })
})
