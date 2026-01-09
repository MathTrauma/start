## Problem 006: 각의 이등분과 비율

### 문제
정사각형 $ABCD$의 변 $CD$의 중점을 $M$이라 하고, $AD$ 위의 점 $E$에 대해서
$\angle BEM = \angle DEM$이라고 할 때,
$\frac{\overline{EP}}{\overline{BP}}$를 구하여라.

## 도형에 대한 정보

### 기본 점 (Base Points)

- **A** (-2, 2) - 정사각형 좌상단 꼭짓점
- **B** (-2, -2) - 정사각형 좌하단 꼭짓점
- **C** (2, -2) - 정사각형 우하단 꼭짓점
- **D** (2, 2) - 정사각형 우상단 꼭짓점

---

### 계산된 점 (Computed Points)

- **M** - CD의 중점
  - 계산: `M = (C + D) / 2 = ((2,-2) + (2,2)) / 2 = (2, 0)`

- **E** - AD를 3:1로 내분하는 점 (D쪽이 3)
  - 계산: `E = (1×A + 3×D) / 4 = (1×(-2,2) + 3×(2,2)) / 4 = (4, 8) / 4 = (1, 2)`
  - 조건: ∠BEM = ∠DEM (각의 이등분)

- **P** - 직선 AM과 직선 BE의 교점
  - 직선 AM: A(-2,2)와 M(2,0)을 지나는 직선
  - 직선 BE: B(-2,-2)와 E(1,2)를 지나는 직선

---

## 문제 기술 단계 (Problem Phases)

### Phase 1: 정사각형 ABCD (duration: 2.0초)
- 점 A, B, C, D 표시
- 정사각형 ABCD 그리기 (AB, BC, CD, DA)

### Phase 2: 중점 M과 점 E (duration: 2.0초)
- CD의 중점 M 표시
- AD 위의 점 E 표시
- 선분 BE, EM 그리기

### Phase 3: 교점 P와 보조선 (duration: 1.5초)
- 선분 AM 그리기
- AM과 BE의 교점 P 표시
- 각 BEM, DEM 표시 (∠BEM = ∠DEM)

---

## 풀이 단계 (Solution Phases)

(문제 기술 단계까지만 작성)

---
