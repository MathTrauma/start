## Problem 005: 닮음 옮기기

### 문제
평행사변형 $ABCD$의 한 변 $CD$위의 한 점을 $F$라 하자. 
대각선 $BD$ 와 직선 $AF$ 의 교점을 $E$ , 
변 $BC$ 의 연장선과 직선 $AF$ 의 교점을 $G$ 라 하자.
$\overline{AE} = 6, \overline{FG} = 5$ 일 때, $12 \times \overline{EF}$ 의 값을 구하여라.

## 도형에 대한 정보

### 기본 점 (Base Points)

- **A** (0, 0) - 평행사변형 좌하단 꼭짓점
- **B** (3, 0) - 평행사변형 우하단 꼭짓점
- **C** (4, 1.5) - 평행사변형 우상단 꼭짓점
- **D** (1, 1.5) - 평행사변형 좌상단 꼭짓점

---

### 계산된 점 (Computed Points)

- **F** - CD를 2:1로 내분하는 점 (C쪽이 2)
  - 계산: `F = (2C + 1D) / 3 = (2×(4,1.5) + 1×(1,1.5)) / 3 = (9, 4.5) / 3 = (3, 1.5)`

- **E** - 대각선 BD와 직선 AF의 교점
  - 직선 BD: B(3,0)과 D(1,1.5)를 지나는 직선
  - 직선 AF: A(0,0)과 F(3,1.5)를 지나는 직선

- **G** - 변 BC의 연장선과 직선 AF의 교점
  - 직선 BC: B(3,0)과 C(4,1.5)를 지나는 직선의 연장
  - 직선 AF: A(0,0)과 F(3,1.5)를 지나는 직선

---

## 문제 기술 단계 (Problem Phases)

### Phase 1: 평행사변형 ABCD (duration: 2.0초)
- 점 A, B, C, D 표시
- 평행사변형 ABCD 그리기 (AB, BC, CD, DA)

### Phase 2: 점 F와 대각선 (duration: 2.0초)
- CD 위의 점 F 표시
- 대각선 BD 그리기
- 직선 AF 그리기

### Phase 3: 교점 E, G (duration: 1.5초)
- BD와 AF의 교점 E 표시
- BC 연장선 그리기
- BC 연장선과 AF의 교점 G 표시

---

## 풀이 단계 (Solution Phases)

### Phase 1: 삼각형 AED와 CFE의 닮음 (duration: 3.0초)
- 삼각형 AED 강조 (파란색)
- 삼각형 CFE 강조 (빨간색)
- AD // CF 표시
- 닮음 관계 표시

### Phase 2: 삼각형 AEB와 FEG의 닮음 (duration: 3.0초)
- 삼각형 AEB 강조 (파란색)
- 삼각형 FEG 강조 (빨간색)
- AB // FG 표시
- 닮음 관계 표시

### Phase 3: 비례식 정리 및 계산 (duration: 2.5초)
- AE:EF = AD:CF = 2:1
- AE:EF = AB:FG
- 6:EF = AB:5
- 최종 답 도출

---
