# Cloudflare R2 배포 가이드

## 초기 설정 (1회만)

### 1. Wrangler 설치 및 로그인
```bash
# npx로 사용 (전역 설치 불필요)
npx wrangler whoami

# 로그인 필요시
npx wrangler login
```

### 2. R2 Bucket 생성
```bash
# Bucket 생성
npx wrangler r2 bucket create euclide-geometry --remote

# 확인
npx wrangler r2 bucket list
```

### 3. Worker 배포
```bash
cd euclide-worker
npx wrangler deploy
# https://euclide-worker.painfultrauma.workers.dev
```

## 파일 배포

### 자동 배포 (권장)
```bash
./deploy-to-r2.sh 001

# 해시 비교로 변경된 파일만 업로드
# - 공통 라이브러리 (lib/)
# - 문제 파일 (problems/001/)
# - 인덱스 파일 (problems/index.json)
```

### 수동 배포
```bash
# 라이브러리
npx wrangler r2 object put euclide-geometry/lib/geometry.v1.0.0.js \
  --file=lib/geometry.js \
  --content-type=application/javascript \
  --remote

# 문제 파일
npx wrangler r2 object put euclide-geometry/problems/001/sketch.js \
  --file=problems/problem-001/sketch.js \
  --content-type=application/javascript \
  --remote
```

## 캐시 전략

| 파일 타입 | Cache-Control | 이유 |
|----------|---------------|------|
| `lib/*.v1.0.0.*` | 1년 (immutable) | 버전별 고정 |
| `problems/*/sketch.js` | 5분 | 자주 수정 |
| `problems/index.json` | 5분 | 실시간 업데이트 |

## 확인

```bash
# Worker URL로 접근
curl https://euclide-worker.painfultrauma.workers.dev/lib/geometry.v1.0.0.js
curl https://euclide-worker.painfultrauma.workers.dev/problems/001/config.json

# 브라우저
# https://euclide-worker.painfultrauma.workers.dev/viewer.html?problem=001
```

## 파일 관리

```bash
# 목록 보기
npx wrangler r2 object list euclide-geometry --prefix=problems/001/

# 다운로드
npx wrangler r2 object get euclide-geometry/problems/001/config.json

# 삭제
npx wrangler r2 object delete euclide-geometry/old-file.js
```
