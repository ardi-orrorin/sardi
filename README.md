# SARDI

모바일 우선 교대근무 스케줄 관리 웹앱입니다.  
프론트엔드는 Next.js(App Router), 백엔드는 `synol-backend-rust`를 사용합니다.

## 핵심 기능

- 월/주/일/년(Multi Month) 캘린더 조회
- 일반 일정 등록/수정/삭제 (드래그/리사이즈 지원)
- 반복 일정(주/월/년, 횟수 기준) 생성
- 패턴 + 스텝 기반 일정 생성
- 근무 타입/패턴 관리 (스텝 순서 DnD 정렬)
- 라벨 등록/수정/필터 및 색상 기반 표시
- 패스키(WebAuthn) 관리 + 계정 비밀번호 변경
- 라이트/다크 테마 전환

## 기술 스택

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS v4
- FullCalendar + dayjs/luxon
- WebAuthn 브라우저 API

## 환경 변수

`.env.local`에 설정합니다.

```env
SARDI_BACKEND_URL=http://127.0.0.1:8080
```

- `SARDI_BACKEND_URL`이 없으면 `NYAA_BACKEND_URL`을 fallback으로 사용합니다.
- 값 끝에 `/`는 없어도 됩니다(내부에서 정규화).

## 실행

```bash
npm install
npm run dev
```

검증:

```bash
npm run lint
npm run build
```

## Docker

이미지 빌드는 `docker/Dockerfile` 기준입니다.

```bash
docker build -f docker/Dockerfile -t sardi:local .
docker run --rm -p 3000:3000 -e SARDI_BACKEND_URL=http://host.docker.internal:8080 sardi:local
```

## GitHub Actions (Tag Trigger)

- 워크플로: `.github/workflows/docker-build.yml`
- 트리거: 브랜치 `release/*`가 아니라 **Git Tag push** 기반
  - 예: `v0.1.0` 또는 `0.1.0`
- 동작:
  1) 태그에서 버전 추출
  2) 멀티아키(amd64/arm64) Docker 이미지 빌드/푸시
  3) 배포 웹훅 호출

## 주요 페이지

- `/`: 스케줄 대시보드
- `/settings/shifts`: 근무 타입/패턴 설정
- `/settings/labels`: 라벨 설정
- `/settings/account`: 계정 설정(패스키 + 비밀번호 변경)
- `/login`: 로그인(비밀번호 + 패스키)
- `/passkey`: 레거시 경로, `/settings/account`로 리다이렉트

## API 프록시 구조

Next.js Route Handler를 통해 백엔드로 프록시합니다.

- 인증:
  - `POST /api/auth/logout`
  - `POST /api/auth/change-password`
- WebAuthn:
  - `POST /api/webauthn/auth/options`
  - `POST /api/webauthn/auth/finish`
  - `POST /api/webauthn/register/options`
  - `POST /api/webauthn/register/finish`
  - `GET /api/webauthn/credentials`
  - `PATCH /api/webauthn/credentials/{id}`
  - `DELETE /api/webauthn/credentials/{id}`
  - `DELETE /api/webauthn/credentials`
- 스케줄러:
  - `/api/sardi/shift-types`
  - `/api/sardi/patterns`
  - `/api/sardi/schedules`
  - `/api/sardi/schedule-groups`
  - `/api/sardi/schedule-labels`

## 도메인 규칙

- UI 타임존: `Asia/Seoul`
- DB 저장 시간: UTC 기준
- 반복 종료 기준: 종료일이 아닌 반복 횟수
- 라벨은 일정 등록 시 필수
- 휴일 테마는 제목에 `휴일`이 포함된 일정에 적용

## 백엔드/DB 참고

- 백엔드 프로젝트: `../synol-backend-rust`
- 스키마 참고: `../synol-backend-rust/sql/shift-scheduler.sql`

## 문서

- 에이전트 작업 규칙: `AGENTS.md`
- 작업 스킬 가이드: `SKILL.md`
