#!/bin/bash
# R2 배포 스크립트
# Usage:
#   ./scripts/deploy-changes.sh 011        # 특정 문제 배포
#   ./scripts/deploy-changes.sh all        # 전체 문제 배포
#   ./scripts/deploy-changes.sh lib        # 라이브러리만 배포
#   ./scripts/deploy-changes.sh index      # index.json만 배포

cd "$(dirname "$0")/.." || exit 1

TARGET=$1

if [ -z "$TARGET" ]; then
  echo "Usage:"
  echo "  ./scripts/deploy-changes.sh <problem_id>  # 특정 문제 배포"
  echo "  ./scripts/deploy-changes.sh all           # 전체 문제 배포"
  echo "  ./scripts/deploy-changes.sh lib           # 라이브러리만 배포"
  echo "  ./scripts/deploy-changes.sh index         # index.json만 배포"
  exit 1
fi

success_count=0
fail_count=0

upload_file() {
  local file=$1
  local r2_path="euclide-geometry/$file"

  if [ ! -f "$file" ]; then
    echo "  ⚠️  $file 없음"
    return 1
  fi

  echo -n "  $file → $r2_path ... "
  if npx wrangler r2 object put "$r2_path" --file="$file" --remote > /dev/null 2>&1; then
    echo "✅"
    ((success_count++))
    return 0
  else
    echo "❌"
    ((fail_count++))
    return 1
  fi
}

deploy_problem() {
  local id=$1
  local dir="problems/$id"

  if [ ! -d "$dir" ]; then
    echo "  ⚠️  $dir 폴더 없음"
    return 1
  fi

  echo "문제 $id 배포..."
  upload_file "$dir/config.json"
  upload_file "$dir/sketch.js"
  upload_file "$dir/problem.html"

  # solution-phase 파일들 (있으면)
  for sol in "$dir"/solution-phase-*.html; do
    [ -f "$sol" ] && upload_file "$sol"
  done
}

deploy_lib() {
  echo "라이브러리 배포..."
  for file in lib/*.js; do
    [ -f "$file" ] && upload_file "$file"
  done
  for file in lib/styles/*.css; do
    [ -f "$file" ] && upload_file "$file"
  done
}

deploy_index() {
  echo "인덱스 배포..."
  upload_file "problems/index.json"
}

echo "=== R2 배포 ==="
echo ""

case $TARGET in
  all)
    echo "전체 배포..."
    echo ""
    for dir in problems/*/; do
      id=$(basename "$dir")
      deploy_problem "$id"
      echo ""
    done
    deploy_lib
    echo ""
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
    echo ""
    deploy_index
    ;;
esac

echo ""
echo "=== 배포 결과 ==="
echo "  성공: $success_count"
echo "  실패: $fail_count"

if [ $fail_count -gt 0 ]; then
  exit 1
fi

echo -e "\n배포 완료!"
