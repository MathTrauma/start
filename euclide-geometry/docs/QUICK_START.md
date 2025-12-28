# Quick Start Guide

## 로컬 실행

```bash
npx http-server -p 8080
# http://localhost:8080/index.html
# http://localhost:8080/viewer.html?problem=001
```

## 새 문제 만들기

```bash
# 1. 템플릿 복사
mkdir -p problems/problem-002
cp templates/* problems/problem-002/

# 2. 파일 수정
# - config.json: id를 "002"로, title/tags 수정
# - problem.tex: 문제 내용 작성
# - sketch.js: 애니메이션 작성

# 3. index.json에 추가
```

## R2 배포

```bash
./deploy-to-r2.sh 002
# https://euclide-worker.painfultrauma.workers.dev/viewer.html?problem=002
```

## Phase 시스템

```javascript
// config.json - phase 시간 정의
"phases": [
  { "id": 1, "start": 0, "duration": 2.0 },
  { "id": 2, "start": 2.0, "duration": 2.0 }
]

// sketch.js - phase별 그리기
m_triangle(p, A, B, C, 0.0);      // phase 1 시작
m_segment(p, A, D, 2.0, 1.0);     // phase 2 시작, 1초간 그리기
```
