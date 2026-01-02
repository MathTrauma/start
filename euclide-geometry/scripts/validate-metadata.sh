#!/bin/bash
# 메타데이터 일관성 검사 스크립트
# Usage: ./scripts/validate-metadata.sh

cd "$(dirname "$0")/.." || exit 1

echo "=== 메타데이터 일관성 검사 ==="

# 1. problem.tex에서 level 추출
echo -e "\n[1] problem.tex levels:"
for dir in problems/*/; do
  id=$(basename "$dir")
  if [ -f "$dir/problem.tex" ]; then
    level=$(head -1 "$dir/problem.tex" | grep -oE "level [0-9]" | cut -d' ' -f2)
    contest=$(head -1 "$dir/problem.tex" | grep -q "contest" && echo " (contest)" || echo "")
    echo "  $id: level $level$contest"
  fi
done

# 2. config.json에서 level 추출
echo -e "\n[2] config.json levels:"
for dir in problems/*/; do
  id=$(basename "$dir")
  if [ -f "$dir/config.json" ]; then
    level=$(jq -r '.level' "$dir/config.json")
    echo "  $id: level $level"
  fi
done

# 3. index.json에서 level 추출
echo -e "\n[3] problems/index.json levels:"
jq -r '.problems[] | "  \(.id): level \(.level)"' problems/index.json

# 4. 불일치 검사
echo -e "\n[4] 불일치 검사..."
has_mismatch=false
for dir in problems/*/; do
  id=$(basename "$dir")
  if [ -f "$dir/problem.tex" ] && [ -f "$dir/config.json" ]; then
    tex_level=$(head -1 "$dir/problem.tex" | grep -oE "level [0-9]" | cut -d' ' -f2)
    config_level=$(jq -r '.level' "$dir/config.json")
    index_level=$(jq -r ".problems[] | select(.id==\"$id\") | .level" problems/index.json)

    if [ "$tex_level" != "$config_level" ] || [ "$tex_level" != "$index_level" ]; then
      echo "  ⚠️  $id: tex=$tex_level, config=$config_level, index=$index_level"
      has_mismatch=true
    fi
  fi
done

if [ "$has_mismatch" = false ]; then
  echo "  ✅ 모든 메타데이터 일치"
fi

# 5. stats 검증
echo -e "\n[5] stats 검증:"
echo "  index.json stats:"
jq '.stats' problems/index.json

# 실제 카운트 계산
echo -e "\n  실제 카운트:"
for level in 1 2 3; do
  count=$(jq "[.problems[] | select(.level==$level)] | length" problems/index.json)
  echo "    level $level: $count"
done

echo -e "\n검사 완료!"
