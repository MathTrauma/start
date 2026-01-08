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

## 배포 규칙

### R2 배포 대상
**중요**: `lib/`, `problems/` 폴더의 파일들은 `.md` 파일을 제외하고 해시값이 변경되면 **예외 없이** 모두 업로드해야 함.

| 폴더 | 업로드 대상 | 제외 |
|------|------------|------|
| `lib/` | `*.js`, `*.css` | `*.md` |
| `problems/*/` | `*.js`, `*.json`, `*.tex`, `*.png` | `*.md` |

### Git만 배포 (R2에 배포 금지!)
다음 파일들은 **Git에만 커밋**하고 **R2에는 절대 업로드하지 않음**:
- `index.html` (문제 목록 페이지)
- `viewer.html` (문제 뷰어 페이지)
- `styles/*.css` (CSS 파일들)
- `templates/*` (템플릿 파일들)

**이유**: 이 파일들은 Cloudflare Pages가 Git에서 직접 읽어서 배포함. R2에 올리면 중복되고 동기화 문제 발생.

**주의**: GitHub 배포는 확인 후 작업하기 - 일반적으로 사용자가 직접 수행.

## 파일 배포

### 자동 배포 (권장)
```bash
./deploy-to-r2.sh 001

# 해시 비교로 변경된 파일만 업로드
# - 공통 라이브러리 (lib/)
# - 문제 파일 (problems/001/)
# - 풀이 파일 (problems/001/solution-phase-*.tex)
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
  --file=problems/001/sketch.js \
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
