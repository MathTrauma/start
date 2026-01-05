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
mkdir -p problems/002
cp templates/* problems/002/

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


