# Euclidean Geometry Animation Project

유클리드 기하학 문제를 단계별 애니메이션으로 시각화하는 프로젝트입니다.

## 역할 분담

### 사용자 (당신)
문제를 풀고 다음 정보를 제공:
1. 문제 기술 (LaTeX)
2. 풀이에 필요한 도형 정보 (점, 선, 원 등)
3. 애니메이션 그리기 순서 (phases)

### Claude Code (AI)
제공받은 정보로 모든 구현 및 배포:
- config.json 작성
- sketch.js 애니메이션 코드 작성
- Cloudflare R2 배포
- 버그 수정 및 최적화

## 배포 구조

**로컬 작업**: `problems/XXX/` 폴더에서 작업
**배포 대상**: Cloudflare R2 버킷 `euclide-geometry`
**업로드 순서**: 공통 라이브러리 → 문제 파일 → 메타데이터

```bash
# 배포 명령
./deploy-to-r2.sh 001
```

**배포된 파일 구조 (R2)**:
```
lib/
  geometry.v1.0.0.js
  draw-utils.v1.0.0.js
  styles/common.v1.0.0.css
problems/
  001/
    config.json
    problem.tex
    sketch.js
metadata/
  problems-index.json
viewer.html
```

## 워크플로우

### 1. 문제 정보 제공
```markdown
## 문제 기술
[LaTeX 형식으로 문제 작성]

## 풀이 Phase
**PHASE 1: 단계명** (시간: 0-2초)
- 점 A 표시
- 선분 AB 그리기 @ 0.5초 (duration: 1.0초)
...
```

### 2. Claude가 구현
- `problems/XXX/config.json` 생성
- `problems/XXX/problem.tex` 생성
- `problems/XXX/sketch.js` 애니메이션 구현

### 3. 배포
```bash
./deploy-to-r2.sh XXX
```

### 4. 확인
https://euclide-worker.painfultrauma.workers.dev/viewer.html?problem=XXX

## 로컬 테스트

```bash
npx http-server -p 8080 -c-1
# http://localhost:8080/viewer.html?problem=001
```

## 현재 문제

### Problem 001: 이등변삼각형의 직교성
- **Level**: 2
- **Tags**: Right Angles, Perpendicular
- **Mode**: Problem (5 phases) + Solution (3 phases)

## 기술 스택

- **p5.js**: 캔버스 애니메이션
- **MathJax**: LaTeX 렌더링
- **Cloudflare R2**: 파일 호스팅
- **Cloudflare Workers**: HTTP 서빙

## 비용

Cloudflare R2 무료 플랜으로 충분:
- 저장소: 10GB 무료
- 읽기: 10M requests/월 무료
- **예상**: 100개 문제, 월 10만 뷰 → **$0/월**

---

Made with ❤️ for geometry learners
