## Problem 008: 수심의 성질

### 문제
중심이 $O$ 인 원 위에 서로 다른 세 점 $A, B, C$ 가 있고 세 점 $B, C, O$ 는 한 직선 위에 있지 않다.
삼각형 $BCO$의 외접원을 $\Omega$ 라 할 때,
선분 $AB, AC$ 는 원 $\Omega$ 와 각각 점 $D(\not= B) , E(\not= C)$에서 만난다.
점 $O$가 삼각형 $ADE$의 수심임을 보여라.

## 도형에 대한 정보

### 기본 점 (Base Points)
- **O** (0, 0) - 원의 중심
- **A** (68°, r=3) - 원 O 위의 점, 극좌표로 정의
- **B** (-128°, r=3) - 원 O 위의 점, 극좌표로 정의
- **C** (-52°, r=3) - 원 O 위의 점, 극좌표로 정의

### 계산된 점 (Computed Points)
- **X** - 삼각형 BCO의 외심
  - 계산: `getCircumcenter(B, C, O)`

- **원 Ω** - 삼각형 BCO의 외접원
  - 중심: X
  - 반지름: `dist(X, O)`

- **D** - 선분 AB와 원 Ω의 교점 (B가 아닌 점)
  - 계산 과정:
    1. `circleLineIntersection(X, radius, A, B)` 호출 (2개의 교점 반환)
    2. A로부터 더 먼 점을 선택 (B가 더 가까우므로 나머지 점이 D) 
    <!-- 2는 거짓말이다. B가 아닌 점을 선택한다 했으니 B와 비교하여 먼 점을 선택해야 한다. -->

- **E** - 선분 AC와 원 Ω의 교점 (C가 아닌 점)
  - 계산 과정:
    1. `circleLineIntersection(X, radius, A, C)` 호출 (2개의 교점 반환)
    2. A로부터 더 먼 점을 선택 (C가 더 가까우므로 나머지 점이 E)
    <!-- 2는 거짓말이다. B가 아닌 점을 선택한다 했으니 B와 비교하여 먼 점을 선택해야 한다. -->

- **P** - 직선 DO와 AC의 교점 (DO⊥AE를 보이기 위한 수선의 발)
  - 계산: `intersectLines(D, O, A, C)` (선택적 표시)

- **Q** - 직선 EO와 AB의 교점 (EO⊥AD를 보이기 위한 수선의 발)
  - 계산: `intersectLines(E, O, A, B)` (선택적 표시)

## 문제 기술 단계 (Problem Phases)

### Phase 1: 기본 원과 점들 
- 삼각형 ABC 그리기 (duration: 1.5) 
- 세 점 A,B,C 표시 - 레이블 위치는 \tkzLabelPoint 의 옵션을 이용  (duration:0.3)
- 점 O 표시 (duration:0.3), 동시에 원 O(ABC 의 외접원) 그리기(duration : 2.0)


### Phase 2: 삼각형 OBC와 외접원 Ω (duration: 2.0초)
- 세 점 OBC 의 외접원 Ω 그리기 (duration : 1.5)
- AB, AC와 외접원 Ω 의 교점 D, E를 표시 - 점의 레이블은 tkzLabelPoint 의 옵션(left, above등) 이용 @ 1.5 (duration : 0.3)

