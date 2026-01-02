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
  local CONFIG_FILE="$PROBLEM_DIR/config.json"
  local INDEX_FILE="problems/index.json"
  local META_INDEX="metadata/problems-index.json"

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

  # 3. index.json 업데이트
  jq "(.problems[] | select(.id == \"$id\")).level = $LEVEL" "$INDEX_FILE" > /tmp/index_$id.json && mv /tmp/index_$id.json "$INDEX_FILE"

  # 4. problems-index.json 업데이트
  if [ -f "$META_INDEX" ]; then
    jq "(.problems[] | select(.id == \"$id\")).level = $LEVEL" "$META_INDEX" > /tmp/meta_$id.json && mv /tmp/meta_$id.json "$META_INDEX"
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

# 5. stats 재계산
echo -e "\nstats 재계산..."
INDEX_FILE="problems/index.json"
META_INDEX="metadata/problems-index.json"

# level별 카운트 계산
level1=$(jq '[.problems[] | select(.level==1)] | length' "$INDEX_FILE")
level2=$(jq '[.problems[] | select(.level==2)] | length' "$INDEX_FILE")
level3=$(jq '[.problems[] | select(.level==3)] | length' "$INDEX_FILE")
total=$(jq '.problems | length' "$INDEX_FILE")

# stats 업데이트
jq ".stats.total = $total | .stats.byLevel.\"1\" = $level1 | .stats.byLevel.\"2\" = $level2 | .stats.byLevel.\"3\" = $level3" "$INDEX_FILE" > /tmp/index_stats.json && mv /tmp/index_stats.json "$INDEX_FILE"

if [ -f "$META_INDEX" ]; then
  jq ".stats.total = $total | .stats.byLevel.\"1\" = $level1 | .stats.byLevel.\"2\" = $level2 | .stats.byLevel.\"3\" = $level3" "$META_INDEX" > /tmp/meta_stats.json && mv /tmp/meta_stats.json "$META_INDEX"
fi

echo "  Level 1: $level1"
echo "  Level 2: $level2"
echo "  Level 3: $level3"
echo "  Total: $total"

echo -e "\n동기화 완료!"
