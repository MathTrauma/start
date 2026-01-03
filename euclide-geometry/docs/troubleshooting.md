# 문제 해결 가이드

## 문제 개수/Level 통계 불일치

**증상:**
- 홈페이지에 표시되는 문제 수가 실제와 다름
- Level 통계가 맞지 않음

**원인:**
- 로컬 index.json은 업데이트됨
- R2의 metadata/problems-index.json은 오래된 상태

**해결:**
```bash
npx wrangler r2 object put "euclide-geometry/metadata/problems-index.json" \
  --file="problems/index.json" \
  --content-type="application/json" \
  --remote
```

---

## 수식이 깨져 보임

**원인:**
- problem.html이 배포되지 않음
- 또는 .tex → .html 변환이 안 됨

**해결:**
```bash
# 변환
node scripts/convert-tex.js XXX

# 배포
npx wrangler r2 object put "euclide-geometry/problems/XXX/problem.html" \
  --file="problems/XXX/problem.html" --remote
```

---

## 애니메이션이 작동하지 않음

**체크리스트:**
1. sketch.js가 R2에 배포되었는지
2. config.json의 phases가 올바른지
3. 브라우저 콘솔에서 에러 확인

---

## 배포했는데 변경이 안 보임

**원인:** CDN 캐시

**해결:**
- 5분 정도 대기
- 또는 브라우저 강력 새로고침 (Cmd+Shift+R)
