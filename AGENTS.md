<INSTRUCTIONS>
#### 응답

- 모든 응답은 한국어로 작성.

#### 프로젝트 개요

- 프로젝트: `sardi`
- 프레임워크: Next.js(App Router) + TypeScript
- 목적: 개인용 교대근무 스케줄 관리
- UI 기준: 모바일 우선, PC 호환
- 캘린더: FullCalendar 기반 (년/월/주/일 뷰)

#### 핵심 도메인 규칙

- UI 타임존은 `Asia/Seoul` 기준으로 표시.
- DB 저장 시간은 UTC로 저장되므로 표시/수정 시 타임존 변환을 항상 고려.
- 반복 일정 종료는 날짜가 아닌 "반복 횟수" 기준.
- 라벨은 일정 생성 시 필수.
- 휴일 스타일은 일정 제목에 `휴일`이 포함된 경우에만 적용.

#### 인증/계정

- 인증 쿠키: `AUTH_COOKIE_NAME` (`auth_token`)
- 계정 설정 페이지: `/settings/account`
  - 패스키(WebAuthn) 관리
  - 비밀번호 변경
- 레거시 경로 `/passkey`는 `/settings/account`로 리다이렉트.

#### 환경 변수

- 필수: `SARDI_BACKEND_URL`
- fallback: `NYAA_BACKEND_URL`
- 구현 위치: `app/_commons/utils/func.ts#getBackendBaseUrl`

#### API 프록시 규칙

- 백엔드 직접 호출 대신 Next Route Handler 프록시를 우선 사용.
- 공통 프록시 유틸: `app/api/sardi/_shared.ts`
- 인증/계정:
  - `POST /api/auth/logout`
  - `POST /api/auth/change-password`
- WebAuthn:
  - `/api/webauthn/*`
- 스케줄러:
  - `/api/sardi/*`

#### UI/스타일 규칙

- 상단 헤더는 대시보드 스타일과 일관성 유지:
  - `rounded-2xl border border-cyan-400/20 bg-black/30`
  - 모바일 `grid` 버튼, 데스크탑 `md:flex` 전환
- 버튼 텍스트/아이콘 규칙:
  - 요청사항에 따라 아이콘 only 버튼은 `aria-label`, `title` 필수.
- 모바일 터치 영역을 고려해 최소 높이(`min-h`)를 충분히 확보.

#### 파일 구조 포인트

- 대시보드: `app/_services/components/scheduler-dashboard.tsx`
- 근무 타입/패턴: `app/_services/components/shift-settings.tsx`
- 라벨 설정: `app/_services/components/label-settings.tsx`
- 계정 설정: `app/_services/components/account-settings.tsx`
- 테마 FAB: `app/_services/components/theme-toggle-fab.tsx`
- 공통 fetch: `app/_commons/utils/func.ts`

#### 작업 체크리스트

- UI 수정 시:
  1) 모바일(약 390px)에서 버튼 개행/터치 영역 확인
  2) PC 레이아웃(필터/캘린더 폭 비율) 확인
- 도메인 로직 수정 시:
  1) UTC 저장 + 서울 표시가 일관적인지 확인
  2) 반복 일정 그룹/분리 동작 확인
- 완료 전 검증:
  - `npm run lint`
  - `npm run build`

</INSTRUCTIONS>
