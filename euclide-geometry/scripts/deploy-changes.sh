#!/bin/bash
# git status 기반 변경 파일 R2 배포
# Usage: ./scripts/deploy-changes.sh

cd "$(dirname "$0")/.." || exit 1

echo "=== 변경 파일 R2 배포 ==="

# 변경된 파일 목록 (수정 + 신규), .tex 파일 제외
changed_files=$(git status --porcelain | grep -E "^\s*M|^\?\?" | awk '{print $2}' | grep -v '\.tex$')

if [ -z "$changed_files" ]; then
  echo "변경된 파일 없음"
  exit 0
fi

echo "변경된 파일:"
echo "$changed_files"
echo ""

# 각 파일 R2 업로드
success_count=0
fail_count=0

for file in $changed_files; do
  if [ -f "$file" ]; then
    # 특수 경로 처리: problems/index.json → metadata/problems-index.json
    if [ "$file" = "problems/index.json" ]; then
      r2_path="euclide-geometry/metadata/problems-index.json"
    else
      r2_path="euclide-geometry/$file"
    fi
    echo -n "배포: $file → $r2_path ... "

    if npx wrangler r2 object put "$r2_path" --file="$file" --remote > /dev/null 2>&1; then
      echo "✅"
      ((success_count++))
    else
      echo "❌"
      ((fail_count++))
    fi
  fi
done

echo ""
echo "=== 배포 결과 ==="
echo "  성공: $success_count"
echo "  실패: $fail_count"

if [ $fail_count -gt 0 ]; then
  exit 1
fi

echo -e "\n배포 완료!"
