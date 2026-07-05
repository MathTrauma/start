#!/bin/bash

# e-HighSchool Cloudflare R2 배포 스크립트
# 사용법:
#   ./scripts/deploy.sh          # 전체 동기화 (--delete 포함)
#   ./scripts/deploy.sh --dryrun # 변경사항 미리보기

cd "$(dirname "$0")/.." || exit 1

BUCKET="s3://e-highschool"
ENDPOINT="https://c1e4805bf381532b26cc9cb26cfe80bd.r2.cloudflarestorage.com"
PROFILE="r2"

EXCLUDES=(
    --exclude ".git/*"
    --exclude ".DS_Store"
    --exclude "scripts/*"
    --exclude "e-HighSchool-worker/*"
    --exclude ".claude/*"
    --exclude ".wrangler/*"
    --exclude "node_modules/*"
    --exclude "*.tex"
    --exclude "*.pdf"
    --exclude "*.aux"
    --exclude "*.fdb_latexmk"
    --exclude "*.fls"
    --exclude "*.log"
    --exclude "*.synctex.gz"
    --exclude "*.out"
    --exclude "*.toc"
    --exclude "*.bak"
    --exclude "*.txt"
)

echo "=== e-HighSchool R2 동기화 ==="
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
echo "Worker URL: https://e-highschool-worker.painfultrauma.workers.dev"
