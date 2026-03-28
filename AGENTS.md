<INSTRUCTIONS>
#### 응답

- 모든 응답은 한국어로 작성.

#### 프로젝트 개요

- 프로젝트: `sardi`
- 프레임워크: Next.js(App Router) + TypeScript
- 목적: 개인 계정 기준 근무 스케줄 관리
- UI 기준: 모바일 우선, PC 호환
- 현재 메인 UX: 직원/근무 형태/반복 패턴/회사 이벤트 기반 근무표 대시보드

#### 핵심 도메인 규칙

- 근무 형태/직원/패턴/회사 이벤트는 모두 로그인한 사용자(`user_id`) 소유.
- 대시보드는 `직원별 패턴 배정 + 날짜별 오버라이드 + 회사 이벤트`를 합쳐 계산.
- 날짜별 오버라이드(스케줄 변경)는 반복 패턴보다 우선.
- 회사 이벤트 반복은 `반복 간격(일)` + `반복 횟수` 기준.
- UI 타임존은 `Asia/Seoul` 기준으로 표시.
- 테마 모드는 `localStorage`에 저장되며 새로고침 후 유지.

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
- 근무 스케줄:
  - `/api/sardi/*`
  - `/api/sardi/shift-types`
  - `/api/sardi/patterns`
  - `/api/sardi/employees`
  - `/api/sardi/employees/{id}/pattern-assignments`
  - `/api/sardi/employees/{id}/schedule-overrides`
  - `/api/sardi/company-events`

#### UI/스타일 규칙

- 상단 헤더는 대시보드 스타일과 일관성 유지:
  - `rounded-2xl border border-cyan-400/20 bg-black/30`
  - 모바일 `grid` 버튼, 데스크탑 `md:flex` 전환
- 버튼 텍스트/아이콘 규칙:
  - 요청사항에 따라 아이콘 only 버튼은 `aria-label`, `title` 필수.
- 모바일 터치 영역을 고려해 최소 높이(`min-h`)를 충분히 확보.

#### 파일 구조 포인트

- 근무 스케줄 대시보드: `app/_services/components/staff-schedule-board.tsx`
- 상단 메뉴: `app/_services/components/top-navbar.tsx`
- 근무 형태: `app/_services/components/mock-shift-type-manager.tsx`
- 반복 패턴: `app/_services/components/mock-shift-pattern-manager.tsx`
- 직원: `app/_services/components/mock-employee-manager.tsx`
- 회사 이벤트: `app/_services/components/mock-company-event-manager.tsx`
- 계정 설정: `app/_services/components/account-settings.tsx`
- 테마 FAB: `app/_services/components/theme-toggle-fab.tsx`
- 공통 fetch: `app/_commons/utils/func.ts`

#### 작업 체크리스트

- UI 수정 시:
  1) 모바일(약 390px)에서 버튼 개행/터치 영역 확인
  2) PC 레이아웃(주간/월간 가로 스크롤, sticky 직원 열) 확인
- 도메인 로직 수정 시:
  1) 패턴 배정 기간 + 오버라이드 우선순위가 일관적인지 확인
  2) 회사 이벤트 반복 발생 계산이 화면과 맞는지 확인
- 완료 전 검증:
  - `npm run lint`
  - `npm run build`

</INSTRUCTIONS>
