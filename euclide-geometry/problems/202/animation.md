# Problem 011: 외심관련각

## 도형에 대한 정보

### 기본 점 (Base Points)
삼각형 ABC 정의 

- 점 B (-3.5, 0) , 점 C (3.5, 0) : 삼각형의 밑변
- 점 A 는 계산해야 함. 선분 AB = 10, 선분 AC = 8 을 만족 
- 점 O 는 A,B,C 의 외심

- 점 D,E,F 는 각각 A,B,C 에서 내린 수선의 발(표시되지 않는 점들)
- 점 H 는 수심

- 직선 AO 가 선분 BC 와 만나는 점 G  (표시하지 않음)
- 선분 AG와 BE 의 교점 P, 선분 AG와 CF 의 교점 Q 계산

---

## 문제 기술 단계 (Problem Phases)

**PHASE 1: 삼각형 ABC**
- 삼각형 ABC 그리기 (duration: 2.0초)
- 점 A, B, C 표시 @ 2.0 (duration : 0.3)
- 선분 AD, BE, CF 그리기 @ 2.3 (duration : 1.5)
- 점 H (수심) 표시 @ 3.8 (duration : 0.3)
- delay @ 4.1 ( duration : 0.5)

**PHASE 2: 직선 AG**
- 점 O 표시 (duration : 0.3)
- 선분 AG 그리기 @ 0.3 (duration : 1.5)
- 선분 AG 와 BE 의 교점 P 표시 @ 1.8 (duration : 0.3)
- 선분 AG 와 CF 의 교점 Q 표시 @ 2.1 (duration : 0.3)


---