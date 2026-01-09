## Problem 010: 접선과 각의 이등분

### 문제
삼각형 $ABC$에서 $\overline{AB} = \overline{AC}$이고 $\angle ABC \gt \angle CAB$이다.
점 $B$에서 삼각형 $ABC$의 외접원에 접하는 직선이 직선 $AC$와 점 $D$에서 만난다.
선분 $AC$ 위의 점 $E$는 $\angle DBC = \angle CBE$ 를 만족하는 점이다.
$\overline{BE}=40$, $\overline{CD}=50$일 때,
$\overline{AE}$의 값을 구하여라.

## 도형에 대한 정보

### 기본 점 (Base Points)

- **B** (-128도 방향, 반지름 3) - 삼각형 좌하단 꼭짓점
- **C** (-52도 방향, 반지름 3) - 삼각형 우하단 꼭짓점
- **A** (90도 방향, 반지름 3) - 삼각형 상단 꼭짓점

---

### 계산된 점 (Computed Points)

- **O** - 삼각형 ABC의 외심
  - 계산: `\tkzDefCircle[circum](A,B,C)` - 외접원의 중심

- **D** - B에서의 접선과 직선 AC의 교점
  - 계산 과정:
    1. BO에 수직인 방향 벡터 구하기: `\tkzDefPointWith[orthogonal normed](B,O)`
    2. B를 지나고 위 방향으로의 직선과 AC의 교점

- **E** - AC 위의 점 (∠DBC = ∠CBE를 만족)
  - 계산 과정:
    1. D를 BC에 대해 대칭이동: `\tkzDefPointBy[reflection= over B--C](D)`
    2. B와 대칭점을 잇는 직선과 AC의 교점

---

## 문제 기술 단계 (Problem Phases)

### Phase 1: 이등변삼각형 ABC와 외접원 
- 삼각형 ABC 그리기 (duration : 1.5)
- 점 A, B, C 동시 표시 (duration : 0.2)

### Phase 2: 접선과 점 D 
- 외접원 그리기 (파란색)(duration : 1.5)
- 선분 BD, 선분 CD 동시에 그리기 (duration : 1.0)
- 점 D 표시 (duration : 0.2)

### Phase 3: 각의 이등분과 점 E 
- 선분 BE 그리기 (점선) (duration : 1.0)
- 점 E 표시 (duration : 0.2)
- ∠DBC = ∠CBE  ⭕️ 표시 (duration : 0.2)

---

## 풀이 단계 (Solution Phases)

### Phase 1: 접현각 표시과 같은 각 표시
- 각 BAC ⭕️ 표시 및 깜빡임  (duration : 1)

### Phase 2: 이등변삼각형 ABC와 
- 삼각형 ABC 투명한 파란색 채워 그리기(테두리 강조할 방법이 있나?) (duration : 1.5)
- 삼각형 BCE 투명한 붉은색 채워 그리기(테두리 강조할 방법이 있나?) (duration : 1.5)

---
