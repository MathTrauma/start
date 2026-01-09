# Problem 013: 닮음

## 기본 점 (Base Points)
- 점 B ( -15,  0) 는 지름의 왼쪽 끝.
- 점 C ( 15,  0) 는 지름의 오른쪽 끝.


## 계산된 점 (Computed Points)
- 점 M 은 B,C 의 중점
- 점 A 는 선분 AB 의 길이 27, 선분 AC 의 길이는 39 를 만족해야 함.
- 점 D는 BC 를 지금으로 하는 원과 선분 AB 의 교점 

- 점 $E$ 는 직선 $CD$ 과 변 $AB$ 의 교점
- 점 $F$ 는 직선 $BD$ 와 변 $AC$ 의 교점

- 점 $G$ 는 직선 $AD$ 와 변 $EF$ 의 교점


---

## 문제 기술 단계 (Problem Phases)

**PHASE 1 : 삼각형 ABC과 반원**
- 삼각형 ABC 그리기 (duration: 1.0)  
- 점 A,B,C 동시에 표시 (duration: 0.3)
- 딜레이 (duration: 0.5)
- 점 M 을 중심으로 하고 반지름 15 인 반원(위쪽 y 좌표가 0 이상) 그리기 (duration : 1.0)
- 선분 AM 그리기 (duration : 1.0)
- 점 D 표시 (duration : 0.3)

---

**PHASE 2 : 보조선들**
- 선분 BE, 선분 CF 동시에 그리기 (duration : 1.0)
- 점 E, F 동시 표시 (duration: 0.3)
- 선분 EF 그리기 (duration: 1.0)

- 삼각형 MBC , 삼각형 MFE 동시에 그리기 
- 선분 DM 의 중점 오른쪽에 길이 15 표시 (duration : 0.5)
- 선분 GD 의 중점 오른쪽에 길이 5 표시 (duration : 0.5)
