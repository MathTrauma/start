## Problem 301: 공원점

### 문제
정사각형 $ABCD$에서 변 $AB$ 위의 점 $E$와 변 $AD$위의 점 $F$는 
$ \overline{AB} = 4 \overline{AE} = 4 \overline{AF} $를 만족한다. 
점 $A$에서 선분 $PD$에 내린 수선의 발을 $H$라 하자. 삼각형 $APH$의 넓이가 10일 때, 
삼각형 $HCQ$의 넓이를 구하여라.\\ 

## 도형에 대한 정보

### 기본 점 (Base Points)
| 점 | x | y | 설명 |
|----|-----|-----|------|
| A | -2 | -2 | 정사각형 꼭짓점 (좌하) |
| B | 2 | -2 | 정사각형 꼭짓점 (우하) |
| C | 2 | 2 | 정사각형 꼭짓점 (우상) |
| D | -2 | 2 | 정사각형 꼭짓점 (좌상) |


### 계산된 점 (Computed Points)
| 점 | x | y | 설명 |
|----|-----|-----|------|
| E | -1 | -2 | AB 위, AE:EB = 1:3 |
| F | -2 | -1 | AD 위, AF:FD = 1:3 |
| H | ≈-1.06 | ≈-1.76 | A에서 ED에 내린 수선의 발 |
| G | 2 | ≈0.24 | AH 연장선과 BC의 교점 |

---

## 문제 기술 단계 (Problem Phases)

**PHASE 1: 사각형 ABCD**
- 정사각형 ABCD 그리기 (duration: 1.0)  
- 점 A,B,C,D 동시에 표시 (duration: 0.3)
- 딜레이 (duration: 0.5)
- 점 E, F 동시 표시 (duration: 0.3)
- 선분 ED 그리기 (duration: 1.0)

---

**PHASE 2: 선분 ED에 수선내리기**
- 점 A에서 선분 ED에 수선내리기 (duration: 0.5)
- 수선의 발 H 표시 (duration: 0.3)
- 직각 AHE 표시 (duration: 0.5)
- 삼각형 HFC 그리기 (duration: 1.5)

---

## 풀이 단계 (Solution Phases)

**PHASE 1: 직각들 표시**
- 선분 HG 그리기 (duration: 1.0)
- 점 G 표시 (라벨 오른쪽) (duration : 0.3)
- 선분 FG 점선으로 그리기 (duration: 1.0)
- 직각 GHD, 직각 DCG 동시에 표시 (duration: 0.5)
- 직각 GHD, 직각 DCG 에 펄스 (duration: 0.9)
- 직각 GFD 표시 (duration: 0.5)

---

**PHASE 2: 공원점 - 원그리기**
- 선분 DG(지름) 그리기 (duration: 1.5)
- 세 점 C, D, R의 외접원을 R을 시작점으로 그리기 (duration: 2.0)
- 직각 GHD 지우고 직각 CHF 표시 (duration: 0.5)

---

**PHASE 3: 원주각 표시**
- 각 FCE에 ⭐ 표시 (duration: 0.3)
- 각 FDE에 ⭐ 표시 (duration: 0.3)
- 각 EAH에 ⭐ 표시 (duration: 0.3)

---
