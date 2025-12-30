#!/bin/bash

# Cloudflare R2에 파일 배포하는 스크립트
# 사용법: ./deploy-to-r2.sh [problem-id]

BUCKET_NAME="euclide-geometry"
PROBLEM_ID=${1:-"001"}

echo "=== Deploying to Cloudflare R2 ==="
echo "Bucket: $BUCKET_NAME"
echo "Problem: $PROBLEM_ID"
echo ""

# wrangler 설치 확인 (npx 사용)
if ! command -v npx &> /dev/null; then
    echo "Error: npx not found."
    echo "Install Node.js first."
    exit 1
fi

# 파일 해시 계산 함수
get_local_hash() {
    local file=$1
    if [[ "$OSTYPE" == "darwin"* ]]; then
        md5 -q "$file"
    else
        md5sum "$file" | cut -d' ' -f1
    fi
}

# R2 파일 존재 확인 및 ETag 가져오기
get_r2_etag() {
    local path=$1
    npx wrangler r2 object get "$BUCKET_NAME/$path" --remote --pipe 2>/dev/null | grep -i "etag:" | cut -d':' -f2 | tr -d ' "'
}

# 조건부 업로드 함수
upload_if_changed() {
    local local_file=$1
    local r2_path=$2
    local content_type=$3
    local cache_control=$4

    if [ ! -f "$local_file" ]; then
        echo "  ⚠️  Skip: $local_file not found"
        return
    fi

    local local_hash=$(get_local_hash "$local_file")
    local r2_etag=$(get_r2_etag "$r2_path")

    if [ "$local_hash" == "$r2_etag" ]; then
        echo "  ⏭️  Skip: $r2_path (unchanged)"
    else
        echo "  ⬆️  Upload: $r2_path"
        npx wrangler r2 object put "$BUCKET_NAME/$r2_path" \
            --file="$local_file" \
            --content-type="$content_type" \
            --cache-control="$cache_control" \
            --remote
    fi
}

# 1. 공통 라이브러리 배포 (버전 관리)
echo "Step 1: 공통 라이브러리 배포..."

VERSION="1.0.0"

# Geometry library
upload_if_changed \
    "lib/geometry.js" \
    "lib/geometry.v$VERSION.js" \
    "application/javascript" \
    "public, max-age=31536000, immutable"

# Draw utilities
upload_if_changed \
    "lib/draw-utils.js" \
    "lib/draw-utils.v$VERSION.js" \
    "application/javascript" \
    "public, max-age=31536000, immutable"

# Animation classes
upload_if_changed \
    "lib/animation.js" \
    "lib/animation.v$VERSION.js" \
    "application/javascript" \
    "public, max-age=31536000, immutable"

# Styles - common.css
upload_if_changed \
    "lib/styles/common.css" \
    "lib/styles/common.v$VERSION.css" \
    "text/css" \
    "public, max-age=31536000, immutable"

# Styles - index.css
upload_if_changed \
    "lib/styles/index.css" \
    "lib/styles/index.v$VERSION.css" \
    "text/css" \
    "public, max-age=31536000, immutable"

echo "✓ 공통 라이브러리 처리 완료"

# 2. 문제별 파일 배포
echo ""
echo "Step 2: 문제 $PROBLEM_ID 배포..."

PROBLEM_PATH="problems/$PROBLEM_ID"

# config.json
upload_if_changed \
    "$PROBLEM_PATH/config.json" \
    "problems/$PROBLEM_ID/config.json" \
    "application/json" \
    "public, max-age=300"

# problem.tex
upload_if_changed \
    "$PROBLEM_PATH/problem.tex" \
    "problems/$PROBLEM_ID/problem.tex" \
    "text/plain; charset=utf-8" \
    "public, max-age=300"

# sketch.js
upload_if_changed \
    "$PROBLEM_PATH/sketch.js" \
    "problems/$PROBLEM_ID/sketch.js" \
    "application/javascript" \
    "public, max-age=300"

# solution-phase-*.tex (있는 경우)
for solution_file in "$PROBLEM_PATH"/solution-phase-*.tex; do
    if [ -f "$solution_file" ]; then
        filename=$(basename "$solution_file")
        upload_if_changed \
            "$solution_file" \
            "problems/$PROBLEM_ID/$filename" \
            "text/plain; charset=utf-8" \
            "public, max-age=300"
    fi
done

# thumbnail (있는 경우)
if [ -f "$PROBLEM_PATH/thumbnail.png" ]; then
    upload_if_changed \
        "$PROBLEM_PATH/thumbnail.png" \
        "problems/$PROBLEM_ID/thumbnail.png" \
        "image/png" \
        "public, max-age=86400"
fi

echo "✓ 문제 파일 처리 완료"

# 3. 인덱스 파일 업데이트
echo ""
echo "Step 3: 인덱스 파일 업데이트..."

upload_if_changed \
    "problems/index.json" \
    "metadata/problems-index.json" \
    "application/json" \
    "public, max-age=300"

echo "✓ 인덱스 파일 처리 완료"

echo ""
echo "=== 배포 완료! ==="
echo ""
echo "배포된 URL:"
echo "- Worker: https://euclide-worker.painfultrauma.workers.dev"
echo "- Config: https://euclide-worker.painfultrauma.workers.dev/problems/$PROBLEM_ID/config.json"
echo "- Test: https://euclide-worker.painfultrauma.workers.dev/lib/geometry.v$VERSION.js"
echo ""
