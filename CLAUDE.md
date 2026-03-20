cat > CLAUDE.md << 'EOF'
# AI-First React Component Library

## 프로젝트 구조
- packages/ai-components  : 핵심 라이브러리 (npm 배포 대상)
- packages/tailwind-config : Tailwind 설정 공유
- apps/demo               : Next.js 15 쇼케이스 앱
- apps/api                : FastAPI SSE 스트리밍 서버

## 주요 명령어
- pnpm dev          : 전체 개발 서버
- pnpm test         : Vitest 전체 실행
- pnpm storybook    : Storybook 실행
- pnpm build        : 전체 빌드
- pnpm type-check   : 타입 검사

## 개발 규칙
- 훅·상태 로직은 TDD (Red → Green → Refactor)
- UI 컴포넌트는 Storybook Story 함께 작성
- TypeScript strict 모드, any 사용 금지
- 커밋 컨벤션: feat / fix / test / refactor / docs
- 컴포넌트 파일명: PascalCase (AIChat.tsx)
- 훅 파일명: camelCase (useAIStream.ts)

## 기술 스택
- React 19 + TypeScript 5
- Zustand v5 (상태관리)
- Tailwind CSS v3 (스타일)
- Vitest + RTL + MSW (테스트)
- Storybook v8 (문서화)
- Next.js 15 App Router (데모앱)
- FastAPI (AI 스트리밍 서버)
  EOF