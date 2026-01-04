#!/bin/bash
# problem.tex → config.json → index.json 메타데이터 동기화
# Usage: ./scripts/sync-metadata.sh <problem_id>
# Example: ./scripts/sync-metadata.sh 007

cd "$(dirname "$0")/.." || exit 1

PROBLEM_ID=$1

if [ -z "$PROBLEM_ID" ]; then
  echo "Usage: ./scripts/sync-metadata.sh <problem_id>"
  echo "Example: ./scripts/sync-metadata.sh 007"
  echo ""
  echo "전체 동기화: ./scripts/sync-metadata.sh all"
  exit 1
fi

sync_problem() {
  local id=$1
  local PROBLEM_DIR="problems/$id"
  local TEX_FILE="$PROBLEM_DIR/problem.tex"
  local HTML_FILE="$PROBLEM_DIR/problem.html"
  local CONFIG_FILE="$PROBLEM_DIR/config.json"
  local INDEX_FILE="problems/index.json"

  if [ ! -f "$TEX_FILE" ]; then
    echo "  ⚠️  $TEX_FILE 없음"
    return 1
  fi

  if [ ! -f "$CONFIG_FILE" ]; then
    echo "  ⚠️  $CONFIG_FILE 없음"
    return 1
  fi

  # 1. problem.tex에서 level 추출
  FIRST_LINE=$(head -1 "$TEX_FILE")
  LEVEL=$(echo "$FIRST_LINE" | grep -oE "level [0-9]" | cut -d' ' -f2)

  if [ -z "$LEVEL" ]; then
    echo "  ⚠️  $id: level을 찾을 수 없음"
    return 1
  fi

  echo "  $id: level $LEVEL"

  # 2. config.json 업데이트
  jq ".level = $LEVEL" "$CONFIG_FILE" > /tmp/config_$id.json && mv /tmp/config_$id.json "$CONFIG_FILE"

  # 3. problem.html 읽기 (존재하는 경우)
  if [ -f "$HTML_FILE" ]; then
    # HTML을 JSON 문자열로 변환 (jq의 -R -s로 raw input, slurp)
    PROBLEM_HTML=$(cat "$HTML_FILE" | jq -R -s '.')

    # 4. index.json 업데이트 (level과 problemHtml)
    jq "(.problems[] | select(.id == \"$id\")) |= (.level = $LEVEL | .problemHtml = $PROBLEM_HTML)" "$INDEX_FILE" > /tmp/index_$id.json && mv /tmp/index_$id.json "$INDEX_FILE"
  else
    echo "  ⚠️  $id: $HTML_FILE 없음 (level만 업데이트)"
    # 3. index.json 업데이트 (level만)
    jq "(.problems[] | select(.id == \"$id\")).level = $LEVEL" "$INDEX_FILE" > /tmp/index_$id.json && mv /tmp/index_$id.json "$INDEX_FILE"
  fi
}

echo "=== 메타데이터 동기화 ==="

if [ "$PROBLEM_ID" = "all" ]; then
  echo "전체 문제 동기화..."
  for dir in problems/*/; do
    id=$(basename "$dir")
    sync_problem "$id"
  done
else
  sync_problem "$PROBLEM_ID"
fi

# 4. stats 재계산
echo -e "\nstats 재계산..."
INDEX_FILE="problems/index.json"

# level별 카운트 계산
level1=$(jq '[.problems[] | select(.level==1)] | length' "$INDEX_FILE")
level2=$(jq '[.problems[] | select(.level==2)] | length' "$INDEX_FILE")
level3=$(jq '[.problems[] | select(.level==3)] | length' "$INDEX_FILE")
total=$(jq '.problems | length' "$INDEX_FILE")

# stats 업데이트
jq ".stats.total = $total | .stats.byLevel.\"1\" = $level1 | .stats.byLevel.\"2\" = $level2 | .stats.byLevel.\"3\" = $level3" "$INDEX_FILE" > /tmp/index_stats.json && mv /tmp/index_stats.json "$INDEX_FILE"

echo "  Level 1: $level1"
echo "  Level 2: $level2"
echo "  Level 3: $level3"
echo "  Total: $total"

echo -e "\n동기화 완료!"
