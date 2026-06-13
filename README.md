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
- 참가자·역할·공정성 설정·최근 기록 LocalStorage 저장
- 반응형 UI, 다크모드, PWA 오프라인 지원

## 실행 방법

```bash
npm install
npm run dev
```

터미널에 표시되는 로컬 주소로 접속합니다.

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
│   ├── HistorySection.jsx
│   ├── ParticipantSection.jsx
│   ├── ResultSection.jsx
│   ├── RoleSection.jsx
│   ├── Section.jsx
│   └── TeamSettings.jsx
├── utils/
│   ├── storage.js
│   └── teamUtils.js
├── App.jsx
├── main.jsx
└── styles.css
```

## 데이터 처리

별도 백엔드 없이 모든 데이터는 현재 브라우저의 LocalStorage에만 저장됩니다. 공정성 옵션은 팀 인원 균형과 고정 팀을 우선하고, 같은 팀 금지·선호 조건을 가능한 범위에서 반영합니다.
