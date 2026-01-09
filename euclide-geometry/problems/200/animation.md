## Problem 009: 이등변삼각형과 수선

### 문제
삼각형 $ABC$에서 $\angle{ABC} = 5\angle{ACB}$,
점 $D$은 선분 $AC$위의 점이고 $\overline{AB}= \overline{AD}$를 만족한다.
점 $H$는 $A$에서 선분 $BD$에 내린 수선의 발,
점 $M$은 선분 $BC$의 중점이고
점 $E$는 $D$에서 선분 $BC$에 내린 수선의 발이다.
$\overline{DE} \perp \overline{BC}$일 때,
$\overline{BD} = 2\overline{EM}$임을 보여라.

## 도형에 대한 정보

### 기본 점 (Base Points)

- **B** (0, 0) - 삼각형 좌하단 꼭짓점
- **C** (6, 0) - 삼각형 우하단 꼭짓점

---

### 계산된 점 (Computed Points)

- **A** - 삼각형의 꼭짓점
  - 계산 과정:
    1. 보조점 a: `\tkzDefPoint(120:3){a}` - B에서 120도 방향
    2. 보조점 x: `\tkzDefPoint(9,0){x}` - C 오른쪽
    3. X: C에서 x를 156도 회전 `\tkzDefPointBy[rotation = center C angle 156](x)`
    4. A: 직선 aB와 직선 CX의 교점 `\tkzInterLL(a,B)(C,X)`

- **D** - AC 위의 점 (AB = AD를 만족)
  - 계산: `\tkzInterLC(A,C)(A,B)` - 직선 AC와 원 A(중심 A, 반지름 AB)의 교점

- **M** - BC의 중점
  - 계산: `\tkzDefMidPoint(B,C)` - BC의 중점

- **H** - A에서 BD에 내린 수선의 발
  - 계산: `\tkzDefPointBy[projection=onto B--D](A)` - A를 BD에 정사영

- **E** - D에서 BC에 내린 수선의 발
  - 계산: `\tkzDefPointBy[projection=onto B--C](D)` - D를 BC에 정사영

- **N** - DC의 중점 (풀이 단계에서 사용)
  - 계산: `\tkzDefMidPoint(D,C)` - DC의 중점

---

## 문제 기술 단계 (Problem Phases)

### Phase 1: 삼각형 ABC와 기본 점들 (duration: 2.5초)
- 점 A, B, C 표시
- 삼각형 ABC 그리기
- BC의 중점 M 표시

### Phase 2: 이등변삼각형과 점 D (duration: 2.0초)
- AC 위의 점 D 표시 (AB = AD)
- 선분 BD 그리기

### Phase 3: 수선의 발 H, E (duration: 2.0초)
- A에서 BD에 내린 수선 AH 그리기
- 수선의 발 H 표시
- D에서 BC에 내린 수선 DE 그리기
- 수선의 발 E 표시

---

## 풀이 단계 (Solution Phases)

(문제 기술 단계까지만 작성)

---
