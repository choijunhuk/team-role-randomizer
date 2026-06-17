# TeamMate Product Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or inline execution with TDD. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn TeamMate from a local-only randomizer into a clearer room workflow with server-ready shared-room sync, invite progress visibility, quick starts, and meeting-ready result operations.

**Architecture:** Keep the current static Vite app working offline/local-first. Add pure utilities for sync contracts and operational summaries, then wire focused UI panels into the existing room, invite, and result surfaces. Server sync calls must degrade to visible local mode when COMS backend endpoints are not present.

**Tech Stack:** React 18, Vite 8, Vitest, browser fetch/localStorage, existing COMS `/api` proxy.

## Global Constraints

- No new dependencies.
- Preserve room-first invite behavior.
- Preserve COMS notification studentId contract.
- Keep member/non-admin invite-only behavior.
- Keep data local when shared-room backend is unavailable.
- Use Korean UI copy.

---

### Task 1: Shared Room Contract

**Files:**
- Create: `src/utils/sharedRooms.js`
- Test: `src/utils/sharedRooms.test.js`
- Modify: `src/hooks/useWorkspaceData.js`

**Interfaces:**
- Produces: `buildRoomSnapshot(input)`, `publishRoomSnapshot(snapshot, fetcher)`, `fetchRoomSnapshot(roomId, fetcher)`, `getSharedRoomMode(result)`

- [x] Write failing tests for snapshot shape, endpoint-missing fallback, and snapshot hydration.
- [x] Implement the shared-room utility without changing local persistence.
- [x] Run targeted tests.

### Task 2: Invite Progress Board

**Files:**
- Create: `src/utils/workflowSummaries.js`
- Create: `src/components/InviteProgressBoard.jsx`
- Test: `src/utils/workflowSummaries.test.js`
- Test: `src/components/InviteProgressBoard.test.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Produces: `getInviteProgress(sentInvites, inbox)` and `<InviteProgressBoard progress={...} />`

- [x] Write failing tests for sent, failed, link-only, and joined invite counts.
- [x] Render a compact Korean status board beside invite controls.
- [x] Run targeted tests.

### Task 3: Quick Start Flow

**Files:**
- Create: `src/components/QuickStartPanel.jsx`
- Test: `src/components/QuickStartPanel.test.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Produces: `<QuickStartPanel roomReady variant ... />`

- [x] Write failing markup tests for no-room and empty-room states.
- [x] Add one-click room creation and one-click starter participant actions.
- [x] Run targeted tests.

### Task 4: Meeting-Ready Results

**Files:**
- Modify: `src/utils/workflowSummaries.js`
- Modify: `src/components/ResultSection.jsx`
- Test: `src/components/ResultSection.test.jsx`

**Interfaces:**
- Produces: `buildPresentationQueue(teams)`, `getUnassignedRoleMembers(teams)`, `resultToChecklistText(teams)`

- [x] Write failing tests for presentation order, unassigned members, and checklist export text.
- [x] Add result operation panel with 발표 순서, 미배정 역할, and 체크리스트 복사.
- [x] Run targeted tests.

### Task 5: Documentation and Verification

**Files:**
- Modify: `README.md`
- Modify: `src/styles.css`

- [x] Document shared-room fallback and new product surfaces.
- [x] Add responsive styles.
- [x] Run `npm test` and `npm run build`.
