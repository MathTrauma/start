#!/bin/bash
# git status 기반 변경 파일 R2 배포
# Usage: ./scripts/deploy-changes.sh

cd "$(dirname "$0")/.." || exit 1

echo "=== 변경 파일 R2 배포 ==="

# 변경된 파일 목록 (수정 + 신규)
changed_files=$(git status --porcelain | grep -E "^\s*M|^\?\?" | awk '{print $2}')

if [ -z "$changed_files" ]; then
  echo "변경된 파일 없음"
  exit 0
fi

echo "변경된 파일:"
echo "$changed_files"
echo ""

# 사용자 확인
read -p "위 파일들을 R2에 배포하시겠습니까? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "배포 취소"
  exit 0
fi

# 각 파일 R2 업로드
success_count=0
fail_count=0

for file in $changed_files; do
  if [ -f "$file" ]; then
    r2_path="euclide-geometry/$file"
    echo -n "배포: $file → $r2_path ... "

    if npx wrangler r2 object put "$r2_path" --file="$file" > /dev/null 2>&1; then
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
