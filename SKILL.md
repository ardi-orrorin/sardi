---
name: sardi-nextjs
description: sardi(Next.js) 프론트엔드 작업 전용. 교대 스케줄/반복 일정/라벨/근무 타입·패턴/계정 설정(패스키·비밀번호 변경) 기능을 수정하거나 추가할 때 사용. 모바일 우선 UI 조정, FullCalendar 연동, UTC-서울 타임존 변환, Next.js API 프록시(/api/sardi, /api/webauthn, /api/auth) 작업에 사용.
---

# sardi-nextjs 작업 가이드

- 모든 응답을 한국어로 작성.
- 모바일 우선으로 UI를 설계하고, PC 레이아웃은 `md` 이상에서 보완.

## 빠른 진입점

- 대시보드: `app/_services/components/scheduler-dashboard.tsx`
- 근무 타입/패턴: `app/_services/components/shift-settings.tsx`
- 라벨 설정: `app/_services/components/label-settings.tsx`
- 계정 설정: `app/_services/components/account-settings.tsx`
- 공통 API 유틸: `app/_commons/utils/func.ts`
- sardi 프록시 공통: `app/api/sardi/_shared.ts`

## 작업 원칙

1) UI 변경 시 헤더/버튼 스타일 일관성을 유지.
- 상단 헤더는 대시보드 스타일을 기준으로 통일.
- 아이콘-only 버튼은 `aria-label`, `title`, `sr-only`를 유지.

2) 일정 시간 처리 시 타임존 규칙을 지킨다.
- 표시: `Asia/Seoul`
- 저장: UTC
- 편집/조회 경계에서 변환 누락을 방지.

3) 반복 일정은 횟수 기반으로 처리한다.
- 반복 종료를 날짜가 아닌 count로 처리.
- 일정 수정 시 그룹 분리(confirm) 흐름을 유지.

4) API는 프록시 경로를 우선 사용한다.
- 인증: `/api/auth/*`
- WebAuthn: `/api/webauthn/*`
- 스케줄러: `/api/sardi/*`

## 변경 후 검증

- 반드시 아래를 순서대로 실행.

```bash
npm run lint
npm run build
```

## 참고 문서

- 프로젝트 개요/실행법: `README.md`
- 에이전트 규칙: `AGENTS.md`
