# R2 배포

## 역할
변경된 파일을 R2에 배포

---

## 배포 명령어

```bash
# 특정 문제 배포
./scripts/deploy-changes.sh 011

# 전체 배포
./scripts/deploy-changes.sh all

# 라이브러리만 배포
./scripts/deploy-changes.sh lib

# index.json만 배포
./scripts/deploy-changes.sh index

# 수동 배포 (개별 파일)
npx wrangler r2 object put "euclide-geometry/[경로]" --file="[로컬파일]" --remote
```

---

## 배포 대상/제외

### 배포 대상 (R2 - 데이터 및 로직)
- `problems/XXX/config.json`
- `problems/XXX/sketch.js`
- `problems/XXX/problem.html`
- `problems/XXX/solution-phase-*.html`
- `lib/*.js`
- `metadata/*`

### 배포 제외 (R2 금지 - GitHub 배포 대상)
- `index.html` (메인 페이지)
- `viewer.html` (뷰어 페이지)
- `styles/*.css` (CSS 스타일)
- `lib/styles/*.css` (라이브러리 스타일)

### 기타 제외
- `.tex` 파일 (소스용)
- `.md` 파일 (README.md 제외)
- `node_modules/`, `package.json`

---

## 메타데이터 배포

index.json 변경 시:
```bash
npx wrangler r2 object put "euclide-geometry/problems/index.json" \
  --file="problems/index.json" \
  --content-type="application/json" \
  --remote
```

---

## 배포 후 확인

사용자가 직접 확인:
- https://euclide-worker.painfultrauma.workers.dev/viewer.html?problem=XXX
