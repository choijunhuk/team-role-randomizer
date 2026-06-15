import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ParticipantSection, { EXAMPLES } from './ParticipantSection'

describe('ParticipantSection examples', () => {
  it('uses identifiable sample participant labels', () => {
    expect(EXAMPLES).toHaveLength(8)
    expect(EXAMPLES.every((item) => /\(.+\)$/.test(item))).toBe(true)
    expect(EXAMPLES).toContain('김민수 (20251234)')
    expect(EXAMPLES).toContain('한도윤 (58기)')
  })

  it('renders participant names without one-letter avatar clutter', () => {
    const markup = renderToStaticMarkup(
      <ParticipantSection
        participants={['이정원 (17기)', '김민수 (2026402040)']}
        profiles={{}}
        onProfiles={() => {}}
        onAdd={() => true}
        onRemove={() => {}}
        onClear={() => {}}
        message={null}
        currentUser={{ role: 'MEMBER', studentId: '20250000' }}
      />,
    )

    expect(markup).not.toContain('class="avatar"')
    expect(markup).toContain('이정원')
    expect(markup).toContain('기수 17기')
    expect(markup).toContain('학번 2026402040')
  })
})
