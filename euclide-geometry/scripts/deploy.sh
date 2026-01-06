#!/bin/bash

# Cloudflare R2 배포 스크립트
# Usage:
#   ./scripts/deploy.sh <problem_id>  # 특정 문제 배포
#   ./scripts/deploy.sh all            # 전체 문제 배포
#   ./scripts/deploy.sh lib            # 라이브러리만 배포
#   ./scripts/deploy.sh index          # index.json만 배포

cd "$(dirname "$0")/.." || exit 1

BUCKET_NAME="euclide-geometry"
TARGET=$1

if [ -z "$TARGET" ]; then
  echo "Usage:"
  echo "  ./scripts/deploy.sh <problem_id>  # 특정 문제 배포"
  echo "  ./scripts/deploy.sh all            # 전체 문제 배포"
  echo "  ./scripts/deploy.sh lib            # 라이브러리만 배포"
  echo "  ./scripts/deploy.sh index          # index.json만 배포"
  exit 1
fi

# wrangler 설치 확인
if ! command -v npx &> /dev/null; then
    echo "Error: npx not found."
    echo "Install Node.js first."
    exit 1
fi

success_count=0
fail_count=0

# 파일 해시 계산 함수
get_file_hash() {
    local file=$1
    if [[ "$OSTYPE" == "darwin"* ]]; then
        md5 -q "$file"
    else
        md5sum "$file" | cut -d' ' -f1
    fi
}

# R2 파일 해시 가져오기 (임시 파일로 다운로드해서 비교)
get_r2_hash() {
    local path=$1
    local temp_file=$(mktemp)
    
    if npx wrangler r2 object get "$BUCKET_NAME/$path" --remote --pipe > "$temp_file" 2>/dev/null; then
        local hash=$(get_file_hash "$temp_file")
        rm -f "$temp_file"
        echo "$hash"
    else
        rm -f "$temp_file"
        echo ""
    fi
}

# 조건부 업로드 함수
upload_if_changed() {
    local local_file=$1
    local r2_path=$2
    local content_type=$3
    local cache_control=$4

    if [ ! -f "$local_file" ]; then
        echo "  ⚠️  Skip: $local_file not found"
        return 1
    fi

    local local_hash=$(get_file_hash "$local_file")
    local r2_hash=$(get_r2_hash "$r2_path")

    if [ -n "$r2_hash" ] && [ "$local_hash" == "$r2_hash" ]; then
        echo "  ⏭️  Skip: $r2_path (unchanged)"
        return 0
    else
        echo "  ⬆️  Upload: $r2_path"
        if npx wrangler r2 object put "$BUCKET_NAME/$r2_path" \
            --file="$local_file" \
            --content-type="$content_type" \
            --cache-control="$cache_control" \
            --remote > /dev/null 2>&1; then
            ((success_count++))
            return 0
        else
            echo "  ❌ Failed: $r2_path"
            ((fail_count++))
            return 1
        fi
    fi
}

# 라이브러리 배포
deploy_lib() {
    echo "=== 라이브러리 배포 ==="
    echo ""
    
    # JavaScript libraries
    upload_if_changed \
        "lib/geometry.js" \
        "lib/geometry.js" \
        "application/javascript" \
        "public, max-age=300"
    
    upload_if_changed \
        "lib/draw-utils.js" \
        "lib/draw-utils.js" \
        "application/javascript" \
        "public, max-age=300"
    
    upload_if_changed \
        "lib/animator.js" \
        "lib/animator.js" \
        "application/javascript" \
        "public, max-age=300"
    
    upload_if_changed \
        "lib/t_object.js" \
        "lib/t_object.js" \
        "application/javascript" \
        "public, max-age=300"
    
    upload_if_changed \
        "lib/ui-controls.js" \
        "lib/ui-controls.js" \
        "application/javascript" \
        "public, max-age=300"
    
    echo "✓ 라이브러리 배포 완료"
    echo ""
}

# 문제 배포
deploy_problem() {
    local id=$1
    local dir="problems/$id"

    if [ ! -d "$dir" ]; then
        echo "  ⚠️  $dir 폴더 없음"
        return 1
    fi

    echo "=== 문제 $id 배포 ==="
    echo ""
    
    # config.json
    upload_if_changed \
        "$dir/config.json" \
        "problems/$id/config.json" \
        "application/json" \
        "public, max-age=300"
    
    # sketch.js
    upload_if_changed \
        "$dir/sketch.js" \
        "problems/$id/sketch.js" \
        "application/javascript" \
        "public, max-age=300"
    
    # problem.html
    upload_if_changed \
        "$dir/problem.html" \
        "problems/$id/problem.html" \
        "text/html; charset=utf-8" \
        "public, max-age=300"
    
    # solution-phase-*.html (있는 경우)
    for solution_file in "$dir"/solution-phase-*.html; do
        if [ -f "$solution_file" ]; then
            filename=$(basename "$solution_file")
            upload_if_changed \
                "$solution_file" \
                "problems/$id/$filename" \
                "text/html; charset=utf-8" \
                "public, max-age=300"
        fi
    done
    
    # thumbnail.png (있는 경우)
    if [ -f "$dir/thumbnail.png" ]; then
        upload_if_changed \
            "$dir/thumbnail.png" \
            "problems/$id/thumbnail.png" \
            "image/png" \
            "public, max-age=86400"
    fi
    
    echo "✓ 문제 $id 배포 완료"
    echo ""
}

# 인덱스 배포
deploy_index() {
    echo "=== 인덱스 배포 ==="
    echo ""
    
    upload_if_changed \
        "problems/index.json" \
        "problems/index.json" \
        "application/json" \
        "public, max-age=300"
    
    echo "✓ 인덱스 배포 완료"
    echo ""
}

# 메인 실행
echo "=== Cloudflare R2 배포 시작 ==="
echo "Bucket: $BUCKET_NAME"
echo ""

case $TARGET in
    all)
        echo "전체 배포 모드"
        echo ""
        deploy_lib
        for dir in problems/*/; do
            if [ -d "$dir" ]; then
                id=$(basename "$dir")
                deploy_problem "$id"
            fi
        done
        deploy_index
        ;;
    lib)
        deploy_lib
        ;;
    index)
        deploy_index
        ;;
    *)
        # 문제 번호로 간주
        deploy_problem "$TARGET"
        deploy_index
        ;;
esac

echo "=== 배포 결과 ==="
echo "  성공: $success_count"
echo "  실패: $fail_count"
echo ""

if [ $fail_count -gt 0 ]; then
    echo "일부 파일 배포 실패"
    exit 1
fi

echo "배포 완료!"
echo ""
echo "배포된 URL:"
echo "- Worker: https://euclide-worker.painfultrauma.workers.dev"
if [ "$TARGET" != "all" ] && [ "$TARGET" != "lib" ] && [ "$TARGET" != "index" ]; then
    echo "- Config: https://euclide-worker.painfultrauma.workers.dev/problems/$TARGET/config.json"
fi
echo ""
