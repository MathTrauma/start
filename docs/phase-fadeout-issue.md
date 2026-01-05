# Phase별 실행 시 FadeOut 로직 문제

## 문제 발생일
2025-12-28

## 문제 현상
- **전체 실행** (`selectedPhase === 'all'`)과 **단일 phase 선택** 시 fadeOut 동작이 다름
- Phase 1 선택: 삼각형이 fadeOut 없이 계속 표시됨
- Phase 2 선택: 삼각형이 처음부터 즉시 사라짐

## 근본 원인

`getPhaseProgress()` 함수가 "그리기 시작"과 "fadeOut 시작"을 동일한 로직으로 처리:

```javascript
// 기존 코드 (draw-utils.js:142-177)
function getPhaseProgress(p, phaseStart, phaseDuration) {
    // ...
    if (selectedPhase !== 'all') {
        // 미래 phase: phaseStart >= phase.end → return -1
        // 현재 phase: phaseStart = 0 으로 리셋
    }
}
```

**케이스 분석:**

| Phase 선택 | fadeOutStart | 조건 | 결과 |
|-----------|--------------|------|------|
| Phase 1 (end=4.0) | 4.0 | `4.0 >= 4.0` → return -1 | fadeOut 미적용 |
| Phase 2 (start=4.0) | 4.0 | 현재 phase, phaseStart=0 리셋 | 즉시 fadeOut |

## 해결책 (2025-12-28 적용)

**1. `isFadeOut` 파라미터 추가:**
```javascript
function getPhaseProgress(p, phaseStart, phaseDuration, isFadeOut = false) {
    // fadeOut: phaseStart > phase.end 일 때만 return -1 (경계값 포함)
    // 그리기: phaseStart >= phase.end 일 때 return -1
}
```

**2. 상대 시간 변환 방식 변경:**
```javascript
// Before
phaseStart = 0;

// After
phaseStart = Math.max(0, phaseStart - phase.start);
```

## 수정된 파일
- `lib/draw-utils.js`: getPhaseProgress() 수정
- `problems/001/sketch.js`: drawFilledTriangleWithFadeOut() 내 fadeOut 호출 시 `true` 전달

## 현재 상태
- 기본적인 수정 적용됨
- 추가 검토 필요 (미묘한 문제 있음)

---

# Problem 002: 전체 보기에서 미래 Phase가 즉시 그려지는 문제

## 문제 발생일
2025-12-29

## 문제 현상
- Solution 모드에서 `All` 선택 시 Phase 3의 삼각형(GFC, GFO)이 **0초부터** 보임
- 개별 Phase 3 선택 시에는 정상 동작 (5.8초부터 그려짐)

## 근본 원인

`getPhaseProgress()` 함수에서 `elapsed < phaseStart`일 때 `0`을 반환:

```javascript
// 기존 코드 (잘못됨)
if (elapsed < phaseStart) return 0;

// sketch.js에서의 사용
let t = getPhaseProgress(p, 5.8, 1.5);
if (t < 0) return;  // t=0이면 이 체크를 통과해버림!
```

**문제:**
- `return 0`은 "진행률 0%"를 의미 → 그리기 시작
- `return -1`은 "아직 그리지 마라"를 의미 → 그리기 안 함

## p5.js 특성으로 인한 어려움

1. **상태 없는 draw 루프**: p5.js의 `draw()`는 매 프레임 호출되며, 이전 프레임의 상태를 기억하지 않음
2. **객체화 불가**: 삼각형, 선분 등을 객체로 만들어 show/hide 할 수 없음
3. **시간 기반 조건문 필수**: 모든 그리기 요소가 매 프레임마다 "지금 그려야 하는가?"를 판단해야 함
4. **반환값 의미 혼동**: 0과 -1의 의미가 명확하지 않으면 버그 발생

## 해결책 (2025-12-29 적용)

```javascript
// 수정된 코드
if (elapsed < phaseStart) return -1;  // "아직 시작 안 함, 그리지 마라"
```

## 교훈

- `getPhaseProgress()` 반환값:
  - `-1`: 아직 시작 전 → 그리지 않음
  - `0~1`: 진행 중 → 진행률에 따라 그림
  - `1`: 완료 → 최종 상태로 그림
- 모든 그리기 함수에서 `if (t < 0) return;` 체크 필수
