## Problem 003

### 문제
사각형 $ABCD$가 중심이 $O$인 원에 내접하고  $\overline{AC} \bot \overline{BD}$일 때, 
꺾은 선 $AOC$는 사각형 $ABCD$의 넓이를 이등분한다.

## 도형에 대한 정보
V(deg:r) 은 점 V 는 점 (r, 0) 을 deg 만큼 표준방향(반시계방향)으로 회전한 점을 의미.

평면의 중심 O, 점 O 를 중심으로 하고 반지름이 2인 원,
점 A(110:2), B(160:2), C(-110:2), D(20:2),
선분 AC와 BD,

---

## 문제 기술 단계 (Problem Phases)

**PHASE 1: 사각형 ABCD**

- 사각형 ABCD 그리기  (duration: 2.0)
- 점 A, B, C, D 표시 @ 2.0 (duration : 0.3)
- 딜레이 @ 2.3 (duration : 0.5)

---

**PHASE 2: 중심과 이은 선분 그리기**

- 대각선 AC 점선으로 그리기 (duration : 1.5)
- 대각선 BD 점선으로 그리기 @ 1.5 (duration : 1.5)
- 중심 O 에서 A,B,C,D 를 잇는 네 선분 동시에 그리기 @ 3.0 (duration : 1.5)
- 점 O 표시 @ 4.5 (duration : 0.3)


---

## 풀이 단계 (Solution Phases)

**PHASE 1: 등적변환**

- 선분 BD 의 중점 M 표시 (duration : 0.3)
- 점 O 에서 점 M 으로 점선 그리기 @ 0.3 (duration : 0.7) 
- 삼각형 AOC 의 꼭짓점 O 가 선분 BD 의 중점으로 이동(계속 삼각형 유지) @ 1.0 (duration : 1.5)


