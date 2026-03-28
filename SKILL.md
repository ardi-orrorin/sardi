---
name: sardi-nextjs
description: sardi(Next.js) 프론트엔드 작업 전용. 근무 스케줄 대시보드(일/주/월), 근무 형태/반복 패턴/직원/회사 이벤트/계정 설정 기능을 수정하거나 추가할 때 사용. 모바일 우선 UI 조정, 테마 유지(localStorage), Next.js API 프록시(/api/sardi, /api/webauthn, /api/auth) 작업에 사용.
---

# sardi-nextjs 작업 가이드

- 모든 응답을 한국어로 작성.
- 모바일 우선으로 UI를 설계하고, PC 레이아웃은 `md` 이상에서 보완.

## 빠른 진입점

- 근무 스케줄 대시보드: `app/_services/components/staff-schedule-board.tsx`
- 근무 형태: `app/_services/components/mock-shift-type-manager.tsx`
- 반복 패턴: `app/_services/components/mock-shift-pattern-manager.tsx`
- 직원: `app/_services/components/mock-employee-manager.tsx`
- 회사 이벤트: `app/_services/components/mock-company-event-manager.tsx`
- 상단 메뉴: `app/_services/components/top-navbar.tsx`
- 계정 설정: `app/_services/components/account-settings.tsx`
- 공통 API 유틸: `app/_commons/utils/func.ts`
- sardi 프록시 공통: `app/api/sardi/_shared.ts`

## 작업 원칙

1) UI 변경 시 헤더/버튼 스타일 일관성을 유지.
- 상단 헤더는 대시보드 스타일을 기준으로 통일.
- 아이콘-only 버튼은 `aria-label`, `title`, `sr-only`를 유지.

2) 근무표 계산 규칙을 지킨다.
- 직원별 패턴 배정 기간이 기본값이다.
- 날짜 오버라이드는 패턴보다 우선한다.
- 회사 이벤트는 반복 간격/횟수로 occurrence를 계산한다.

3) API는 프록시 경로를 우선 사용한다.
- 인증: `/api/auth/*`
- WebAuthn: `/api/webauthn/*`
- 근무 스케줄: `/api/sardi/*`

4) 테마/뷰 상태를 깨지지 않게 유지한다.
- 테마는 `sardi-theme-mode` localStorage 키를 사용한다.
- 주/월 뷰의 스크롤/하이라이트 동작은 모바일/PC 모두 확인한다.

## 변경 후 검증

- 반드시 아래를 순서대로 실행.

```bash
npm run lint
npm run build
```

## 참고 문서

- 프로젝트 개요/실행법: `README.md`
- 에이전트 규칙: `AGENTS.md`
