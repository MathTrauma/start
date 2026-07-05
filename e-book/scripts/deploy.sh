#!/bin/bash

# e-book Cloudflare R2 배포 스크립트 (aws s3 sync 방식)
# e-book 전체(HTML + PDF)를 R2 'e-book' 버킷에 동기화한다.
# 공개 서빙이므로 인증 로직 없음 — e-book-worker가 그대로 서빙.
#
# 사용법:
#   ./scripts/deploy.sh          # 전체 동기화 (--delete 포함)
#   ./scripts/deploy.sh --dryrun # 변경사항 미리보기

cd "$(dirname "$0")/.." || exit 1

BUCKET="s3://e-book"
ENDPOINT="https://c1e4805bf381532b26cc9cb26cfe80bd.r2.cloudflarestorage.com"
PROFILE="r2"

EXCLUDES=(
    --exclude ".git/*"
    --exclude ".DS_Store"
    --exclude "scripts/*"
    --exclude "e-book-worker/*"
    --exclude ".claude/*"
    --exclude ".wrangler/*"
    --exclude "node_modules/*"
)

echo "=== e-book R2 동기화 ==="
echo "Bucket: $BUCKET"
echo ""

aws s3 sync . "$BUCKET" \
    --endpoint-url "$ENDPOINT" \
    --profile "$PROFILE" \
    --delete \
    "${EXCLUDES[@]}" \
    "$@"

echo ""
echo "동기화 완료!"
echo "Worker URL: https://e-book-worker.painfultrauma.workers.dev"
