# 팀메이트 랜덤 배정

학교 팀플, 스터디, 소모임에서 참가자를 균등한 팀으로 나누고 역할을 무작위로 배정하는 React 웹앱입니다.

## 주요 기능

- 한 명 또는 줄바꿈으로 여러 참가자 추가, 중복 방지, 삭제
- 팀 개수 또는 팀당 인원 기준의 균등 랜덤 배정
- 고정 팀, 같은 팀 금지, 같은 팀 선호 공정성 옵션
- 이전 기록에서 같은 팀이었던 조합 회피 및 학년·전공·수준 균형
- 역할 추가·삭제 및 팀별/전체 무작위 역할 배정
- 참가자별 역할 고정·제외
- 드래그 앤 드롭, 화살표 이동, 팀 이름·역할 직접 편집, 실행 취소
- 배정 결과 복사, TXT 다운로드, 최근 기록 불러오기
- 공유 링크, QR 코드, 인쇄 화면, JSON 백업·복원
- 학번 명단으로 초대 링크 생성, COMS 알림 발송 시도, 받은 초대 인박스 확인
- 일반 회원도 팀 배정·초대·역할·기록 기능 사용 가능
- 관리자 계정만 COMS 명단 요약, 기수 필터, 필터 대상 일괄 추가, CSV 내보내기 사용
- 명단 추가 시 동명이인은 `이름 (학번)`으로, 졸업생은 `이름 (기수)`로 구분
- 졸업생 명단은 기수 또는 입학년도 끝 두 자리로 검색 가능
- 한 COMS 계정 안에서 여러 방을 만들고 방별 참가자·역할·공정성 설정·최근 기록을 분리 저장
- 받은 초대에서 참가자로 합류하면 초대한 사람 이름으로 새 방을 자동 생성
- 빠른 시작 버튼으로 팀플/스터디 방을 만들고 내 정보 또는 예시 명단을 즉시 추가
- 보낸 초대·받은 초대 기반 진행 상태판으로 전송 실패, 링크 공유 필요, 합류 확인 수를 표시
- 배정 결과에서 발표 순서, 역할 미배정자, 진행 체크리스트 복사를 제공
- 공유 방 동기화 패널로 향후 COMS 방 API와 스냅샷을 주고받고, API 미지원 시 로컬 모드로 명확히 표시
- 기존 COMS 계정 로그인 및 로그인 상태 복원
- 반응형 UI, 다크모드, PWA 설치 및 정적 자산 캐시

## 실행 방법

```bash
npm install
npm run dev
```

터미널에 표시되는 로컬 주소로 접속합니다.
개발 서버는 `/api` 요청을 `https://coms.kw.ac.kr`로 프록시합니다. COMS 인증 쿠키의 Secure 속성 때문에 새로고침 후 세션 복원까지 포함한 최종 로그인 검증은 배포 주소에서 확인해야 합니다.

## 프로덕션 빌드

```bash
npm run build
npm run preview
npm test
```

빌드 결과물은 `dist/`에 생성됩니다.

## 자동 배포

`main` 브랜치에 푸시하면 GitHub Actions가 테스트와 빌드를 실행한 후 서버의
`/home/kw/apps/team-role-randomizer/public` 경로에 정적 파일을 배포합니다.

배포 주소: `https://coms.kw.ac.kr/team-randomizer/`

## 파일 구조

```text
src/
├── components/
│   ├── AuthGate.jsx
│   ├── HistorySection.jsx
│   ├── InviteInboxSection.jsx
│   ├── InviteSection.jsx
│   ├── LoginScreen.jsx
│   ├── ParticipantSection.jsx
│   ├── ResultSection.jsx
│   ├── RoomSwitcher.jsx
│   ├── RoleSection.jsx
│   ├── Section.jsx
│   └── TeamSettings.jsx
├── utils/
│   ├── auth.js
│   ├── account.js
│   ├── authFlow.js
│   ├── authState.js
│   ├── invite.js
│   ├── storage.js
│   └── teamUtils.js
├── App.jsx
├── main.jsx
└── styles.css
```

## 학번 초대 흐름

- 주최자가 학번 명단을 입력하면 `#invite=` 해시에 학번 목록·메시지·발신자가 인코딩된 공유 링크를 만들고, 최근 보낸 초대 기록을 현재 브라우저의 활성 방에 저장합니다.
- `POST /api/notifications/external-invite`로 COMS에 알림 발송을 시도합니다. 엔드포인트가 없거나 실패해도 링크는 그대로 동작하며 경고와 보낸 초대 기록만 남깁니다.
- 초대 링크로 접속한 사용자의 COMS 학번이 명단에 포함되면 받은 초대 인박스에 저장됩니다.
- 받은 초대에서 `참가자로 합류`를 누르면 초대한 사람 이름의 새 방이 자동 생성되고, 현재 COMS 사용자가 그 방 참가자로 추가됩니다.
- 인박스는 `GET /api/notifications`로 새로고침할 수 있으며, COMS가 같은 학번 앞으로 보낸 `EXTERNAL_INVITE` 알림을 합쳐 보여줍니다.

### COMS 알림 엔드포인트 계약

세션 인증된 COMS 회원이 호출하는 신규 엔드포인트로 동기화합니다. 자세한 백엔드 구현은 `coms-website` 저장소를 참고하세요.

`POST /api/notifications/external-invite`
```json
{
  "recipientStudentIds": ["20251234", "20259999"],
  "actorLabel": "홍길동",
  "message": "팀플 같이해요",
  "acceptUrl": "https://coms.kw.ac.kr/team-randomizer/#invite=..."
}
```
응답: `{ "accepted": 2, "unknown": [], "rejected": 0 }`. `actorLabel`이 비어 있으면 서버가 발신자 이름으로 자동 채우고 100자로 자릅니다. `acceptUrl`은 `notification.external-invite.allowed-hosts` (기본 `coms.kw.ac.kr`)에 등록된 호스트만 허용되며, TeamMate 초대 해시를 담을 수 있도록 최대 2,000자까지 허용합니다. 1분당 10건, 1일 200건 발신자별 레이트 리밋이 적용됩니다. CSRF 방어를 위해 모든 호출에 `X-Requested-With: XMLHttpRequest` 헤더를 함께 보내야 합니다.

`GET /api/notifications` → COMS NotificationResponse 배열. `type === "EXTERNAL_INVITE"` 항목만 인박스에 표시되며 `acceptUrl`이 초대 링크 역할을 합니다.

`PATCH /api/notifications/{id}/read` → 합류 후 자동 호출.

### 향후 공유 방 동기화 범위

현재 팀메이트는 정적 프론트엔드 앱이며 참가자·역할·배정 기록은 브라우저 LocalStorage에 저장됩니다. 한 계정 안에서 여러 로컬 방을 만들 수 있고, 초대받은 사용자가 “참가자로 합류”하면 본인 브라우저에 새 방이 자동 생성됩니다. 다만 그 정보는 초대받은 사람의 로컬 방에만 반영되고 주최자의 화면으로 실시간 동기화되지는 않습니다.

프론트엔드는 공유 방 스냅샷 계약을 먼저 갖고 있습니다. 방 화면의 “공유 방 동기화” 패널은 `PUT /api/team-randomizer/rooms/{roomId}`와 `GET /api/team-randomizer/rooms/{roomId}`를 사용해 다음 형태의 스냅샷을 주고받습니다.

```json
{
  "version": 1,
  "roomId": "room-...",
  "roomName": "캡스톤 팀",
  "ownerStudentId": "20250001",
  "ownerName": "홍길동",
  "participants": ["홍길동 (20250001)", "김민수"],
  "profiles": {},
  "roles": ["발표자", "서기"],
  "roleRules": {},
  "fairness": {},
  "histories": [],
  "updatedAt": 1781726400000
}
```

COMS 백엔드에 해당 API가 없거나 404를 반환하면 앱은 오류로 멈추지 않고 “로컬 모드”로 표시하며 기존 LocalStorage 데이터를 계속 사용합니다. 주최자-참가자 간 서버 공유 방, 수락 상태, 참가자 자동 반영을 완성하려면 COMS 백엔드에 방 생성·멤버십·수락 이벤트 저장 API가 추가되어야 합니다.

## 데이터 처리

팀메이트는 기존 COMS 인증 API의 HttpOnly 쿠키 세션을 사용하며 비밀번호나 인증 토큰을 저장하지 않습니다. 로그인은 팀메이트 UI 접근을 제한하고, 참가자·역할·공정성 설정·최근 기록을 이 브라우저 안에서 안정적인 COMS 식별자(`studentId`, `id`, `email`)와 방 ID별 작업공간으로 나누는 데 사용됩니다. 로그인 전 공용 LocalStorage 데이터가 있으면 사용자가 직접 현재 계정의 활성 방으로 가져올 수 있습니다. 이 데이터는 서버에 동기화되지 않으며 브라우저 LocalStorage에 저장됩니다. 공정성 옵션은 팀 인원 균형과 고정 팀을 우선하고, 같은 팀 금지·선호 조건을 가능한 범위에서 반영합니다.
