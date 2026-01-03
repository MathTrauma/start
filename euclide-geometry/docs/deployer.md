# R2 배포

## 역할
변경된 파일을 R2에 배포

---

## 배포 명령어

```bash
# 변경된 파일 자동 배포
./scripts/deploy-changes.sh

# 수동 배포 (개별 파일)
npx wrangler r2 object put "euclide-geometry/[경로]" --file="[로컬파일]" --remote
```

---

## 배포 대상/제외

### 배포 대상
- `viewer.html`
- `problems/XXX/config.json`
- `problems/XXX/sketch.js`
- `problems/XXX/problem.html`
- `problems/XXX/solution-phase-*.html`
- `lib/*.js`, `lib/styles/*.css`

### 배포 제외
- `.tex` 파일 (소스용)
- `.md` 파일 (README.md 제외)
- `node_modules/`, `package.json`

---

## 메타데이터 배포

index.json 변경 시:
```bash
npx wrangler r2 object put "euclide-geometry/metadata/problems-index.json" \
  --file="problems/index.json" \
  --content-type="application/json" \
  --remote
```

---

## 배포 후 확인

사용자가 직접 확인:
- https://euclide-worker.painfultrauma.workers.dev/viewer.html?problem=XXX
