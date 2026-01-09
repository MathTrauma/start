## Problem 001: 이등변삼각형의 직교성

### 문제
$\overline{AB}=\overline{AC}$인 이등변삼각형 $ABC$에서
$A$에서 선분 $BC$에 내린 수선의 발을 $D$라 하자.
$D$에서 선분 $AB$에 내린 수선의 발을 $E$라 하고 선분 $DE$의 중점은 $M$이라 하자.
이때 $\overline{AM} \perp \overline{EC}$임을 보여라.

---

## 문제 기술 단계 (Problem Phases)

**PHASE 1: 삼각형 ABC**

- 삼각형 ABC 그리기  (duration: 1.5)
- 점 A, B, C 표시 (duration: 0.3)

---

**PHASE 2: 수선의 발 D**

- 점 D (BC의 중점) 표시 (duration: 0.3)
- 선분 AD 그리기 (duration: 1.0초)
- 직각 ADC 표시 (duration: 0.3)
- delay (duration : 0.5)

---

**PHASE 3: 사영점 E**

- 선분 DE 그리기 (duration: 1.0초)
- 점 E (D의 AB 사영) 표시 (duration: 0.3)
- 직각 BED 표시 (duration: 0.3)
- delay (duration : 0.5)

---

**PHASE 4: 중점 M과 보조선**

- 점 M (DE의 중점) 표시 (duration: 0.3)
- 선분 CE 그리기 (duration: 1.2초)
- 선분 AM 그리기 @ 6.3초 (duration: 1.2초)

---

**PHASE 5: 교점 X**

- 점 X (AM과 EC의 교점) 표시 @ 7.0초

---

## 풀이 단계 (Solution Phases)

**PHASE 1: 닮음 찾기**

- 점 B 와 E 의 중점 점 F 추가 및 표시 (라벨 위치: -10, +10)
- 선분 DF 그리기 (duration: 1.0초)
- 삼각형 BDF 채워그리기 (duration: 1.0초)
- 삼각형 BCE  채워그리기 (duration: 1.0초)
- 방금 그린 두 삼각형 travel 이펙트 동시에 pulse 이펙트 (duration : 2) - 두 삼각형의 닮음 강조
- delay (duration : 0.5)
- 두개의 같은 각인 각 FDB 와 각 ECB (dot으로) 표시 (duration: 0.5초)

---

**PHASE 2: 추가 닮음 찾기**
투명도를 높여서 더 옅은 색으로

- 이전 단계(phase 1) 채워진 그림 지우기 (duration: 0.2초)
- 삼각형 BDE 채워그리기, 삼각형 DAE 반투명 채워그리기 (duration : 1.5)
- 두 삼각형  pulse 이펙트  (duration: 1.0)
- 각 ADE, 각 DBE 표시후 '세모' 이모지 마커 (duration : 0.7)
- 딜레이 (duration: 1.0)

- 직전 단계에서 그린 삼각형 BDE, 삼각형 DAE 지우기 (duration: 0.3초)
- 삼각형 BDF  채워그리기, 삼각형 DAM  채워그리기 (duration: 1.0초)
- 두 삼각형  pulse 이펙트  (duration: 1.0)
- 딜레이 (duration: 1.0초)
- 단계 1에서 표시해 둔 각과 같은 각인 각 MAD 표시  (duration: 0.3초)
- 각 MAD pulse 효과 후 마커(작은 동그라미) (duration : 0.5) 


---

**PHASE 3: 공원점**
아래에서 X가 점은 표시되지만 라벨을 그리지 말 것을 당부

- 세 점 A,C,D 를 지나는 원 그리기 (duration: 1.5초)
- 선분 CE 과 선분 AM 의 교점 X dot 표시(라벨 필요없음) (duration: 0.3초)
- 직각 CXA 표시 (크기: 0.3)  (duration: 0.3초)
