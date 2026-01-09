## Problem 002: 등적변환

### 문제
볼록 사각형 $ABCD$에서 대각선 $\overline{AC}, \overline{BD}$의 중점을 각각 $M,N$이라 하고, \\ 
$M,N$을 지나고 $\overline{BD}, \overline{AC}$에 평행한 두 직선의 교점을 $O$라 할 때, 
$O$를 각 변의 중점과 연결하면 $ABDC$의 넓이는 이들 네 선분에 의해 4등분 됨을 보여라.\\

## 도형에 대한 정보
점 A(-2,-2), B(3,-2), C(1,2.3), D(-1.25, 1.4),
점 M 은 대각선 AC의 중점, 점 N은 대각선 BD 의 중점,
점 M 을 지나고 BD 에 평행한 직선과 점 N 을 지나고 AC 에 평행한 직선의 교점을 O,
선분 OM 과 선분 ON 은 점선,
점 E,F,G,H 는 차례로 선분 AB, BC, CD, DA 의 중점들

---

## 문제 기술 단계 (Problem Phases)

**PHASE 1: 사각형 ABCD**

- 사각형 ABCD 그리기 (duration: 1.5)
- 점 A, B, C, D 표시 (duration : 0.3)

---

**PHASE 2: 두 대각선과 그 중점들**

- 대각선 AC와 대각선 BD 그리기 (duration : 1.0)
- 두 점 M, N표시 (duration: 0.3)
- 선분 MO, 선분 NO 그리기 (duration : 0.5)
- 점 O 표시 (duration : 0.2)

---

**PHASE 3: O 에서 각 꼭지점을 잇는 선분들**

- 점 O 에서 점 E,F,G,H 로 동시에 붉은색 선분 그리기 (duration: 1.0초)

---

## 풀이 단계 (Solution Phases)

**PHASE 1: 등적변환-1**

- 삼각형 GHD 와 삼각형 GHO 를 채워서 동시에 그리기 (duration : 1.5)
- 두 삼각형 위를 빛나는 원이 두 바퀴 돔 (duration : 2.0)
- 삼각형 GHO 의 꼭짓점 O 를 선분 ON 을 따라 N 으로 이동 최종 삼각형 GHN (duration : 1.5)
- delay  (duration : 0.5)

---

**PHASE 2: 다른 방식으로 삼각형으로 분해**

- PHASE 1에서 그려진 두 삼각형을 지우고 두 삼각형 DNG 와 DNH 을  채워서 동시에 그리기 (duration : 1.5)
- 두 삼각형에 pulse 적용 (duration : 1.0)
- 삼각형 DNG 와 삼각형 DBC 에 travel 적용 (duration : 1.0) 
- delay (duration : 0.5)

---

**PHASE 3: 등적변환-2**

- phase 2 에서 그린 두 삼각형 지우기 (duration : 0.3)
- 삼각형 GFC 와 삼각형 GFO 를 동시에 그리기  (duration : 1.5)
- 삼각형 GFO 의 꼭짓점 O 를 선분 OM 을 따라 M 으로 이동 최종 삼각형 GFM  (duration : 1.5)


