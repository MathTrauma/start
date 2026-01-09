# Problem 305: 평행보조선, 닮음

## 도형에 대한 정보

### 기본 점 (Base Points)
삼각형 ABC 정의 

- 점 A(-1, 7), B(-3.5, 0), C(3.5, 0) : 삼각형의 꼭짓점들
- 점 G 는 삼각형의 무게중심
- 점 M 은 BC 의 중점
- 점 P 는 선분 AC 를 7:11 로 내분한 점
- 점 Q 는 직선 PG 가 선분 BC 와 만나는 점
- 점 R 은 직선 PG 와 직선 AB 의 교점
- 점 X 는 점 P 를 지나면서 BC와 평행한 직선이 선분 AB 와 만나는 점  
- 점 Y 는 점 P 를 지나면서 BC와 평행한 직선이 선분 AM 와 만나는 점  

---

## 문제 기술 단계 (Problem Phases)

**PHASE 1: 삼각형 ABC**
- 삼각형 ABC 그리기 (duration: 1.5초)
- 점 A, B, C 표시 @ 1.5 (duration : 0.3)
- delay @ 1.8 (duration : 0.5)
- 점 M (BC의 중점) 표시 @ 2.3 (duration : 0.3)
- 선분 AM 그리기 @ 2.6 (duration : 1.0)

---

**PHASE 2: 직선 PG 와 직선 AB**
- 점 G 표시 (duration : 0.3)
- 점 P 표시  @ 0.3 (duration : 0.3)
- 선분 BR 을 점선으로 그리기 @ 0.6 (duration : 1.0) 
- 선분 PR 그리기 @ 1.6 (duration : 1.5)

---

## 풀이 단계 (Solution Phases)

**PHASE 1: 삼각형 ABC**
- 선분 PY 그리기 (duration : 1.0)
- 선분 PY 위에 '5x' 표시, 동시에 선분 QM 아래에 '6x' @ 1.0 (duration : 0.3)
- delay @ 1.3 (duration : 0.7)

---

**PHASE 2: 비율 정보 표시 1**
- 선분 GM 왼쪽에 '6y' 표시 (duration : 0.3)
- 선분 YG 왼쪽에 '5y' 표시 @ 0.3 (duration : 0.3)
- 선분 AG 왼쪽에 '7y' 표시 @ 0.6 (duration : 0.3)
- delay @ 0.9 (duration : 0.5)
- 선분 MC 아래에 '7분의 90 곱하기 x' 표시 @ 1.4 (duration : 0.6)
- delay @ 2.0 (duration : 1.0)

---

**PHASE 3: 비율 정보 표시 2**
- 선분 XY 그리기 (duration : 1.0)
- 선분 XY 위에 '5x' 표시 @ 1.0 (duration : 0.3)
- delay @ 1.3 (duration : 0.7)
- 선분 BQ 위에 '7분의 48 곱하기 x' 표시 @ 2.0 (duration : 0.5)

---

**PHASE 4: 닮음**
- 삼각형 RBQ 강조
- 삼각형 RXP 


