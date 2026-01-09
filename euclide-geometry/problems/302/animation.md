## Problem 007: 내심과 외접원

### 문제
삼각형 $ABC$에서 $\overline{AC}=440$이다.
점 $D$는 변 $AB$ 위의 점으로 $\overline{AD}=1$이다.
삼각형 $ABC$의 내심을 $I$라 할 때,
직선 $CI$가 삼각형 $ADI$의 외접원에 접한다.
삼각형 $ADI$의 외접원이 변 $AC$와 점 $E(\not=A)$에서 만나고,
중심 $I$이고 점 $E$를 지나는 원이 변 $AC$와 $F(\not=E)$에서 만난다.
$\overline{IE}=20$일 때, $\overline{EF}$의 값을 구하여라.

## 도형에 대한 정보

### 기본 점 (Base Points)

- **B** (0, 0) - 삼각형 좌하단 꼭짓점
- **C** (8, 0) - 삼각형 우하단 꼭짓점
- **A** (2, 5) - 삼각형 상단 꼭짓점

---

### 계산된 점 (Computed Points)

- **I** - 삼각형 ABC의 내심
  - 계산: `\tkzDefCircle[in](A,B,C)` - 내접원의 중심

- **O** - 삼각형 ADI의 외접원의 중심
  - 계산 과정:
    1. CI에 수직인 직선 구하기: `\tkzDefPointWith[orthogonal normed, K=2](I,C)`
    2. AI의 수직이등분선 구하기: `\tkzDefLine[mediator](A,I)`
    3. 두 직선의 교점이 O

- **D** - AB 위의 점 (삼각형 ADI의 외접원이 AB와 만나는 점)
  - 계산: `\tkzInterLC(A,B)(O,I)` - 직선 AB와 원 O(중심 O, 반지름 OI)의 교점

- **E** - AC 위의 점 (삼각형 ADI의 외접원이 AC와 만나는 점, A가 아닌 점)
  - 계산: `\tkzInterLC(A,C)(O,I)` - 직선 AC와 원 O의 교점

- **F** - AC 위의 점 (중심 I, 반지름 IE인 원이 AC와 만나는 점, E가 아닌 점)
  - 계산: `\tkzInterLC(A,C)(I,E)` - 직선 AC와 원 I(중심 I, 반지름 IE)의 교점

---

## 문제 기술 단계 (Problem Phases)

### Phase 1: 삼각형 ABC와 내심 I (duration: 2.5초)
- 점 A, B, C 표시
- 삼각형 ABC 그리기
- 내심 I 표시
- 직선 CI 그리기

### Phase 2: 삼각형 ADI의 외접원 (duration: 2.5초)
- 점 D 표시
- 삼각형 ADI의 외접원 그리기
- CI가 외접원에 접함 표시

### Phase 3: 점 E와 원 I (duration: 2.0초)
- AC와 외접원의 교점 E 표시
- 중심 I, 반지름 IE인 원 그리기 (빨간색)
- AC와 원 I의 교점 F 표시

---

## 풀이 단계 (Solution Phases)

(문제 기술 단계까지만 작성)

---
