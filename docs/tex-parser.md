# LaTeX 파서

## 역할
problem.tex 파일을 파싱하여 animation.md 초안 생성

---

## 입력
- `problems/XXX/problem.tex` 파일

## 출력
- animation.md의 "도형에 대한 정보" 섹션 초안

---

## 작업 내용

1. **problem.tex 첫 줄 확인**
   - `% level N` - 난이도
   - `% contest` - 콘테스트 문제 여부

2. **LaTeX 수식 파싱**
   - 점 이름 추출: `$A$`, `$B$`, `$C$`
   - 선분: `$\overline{AB}$`
   - 삼각형: `$\triangle ABC$`
   - 각도: `$\angle ABC$`

3. **tkz-euclide 주석에서 기하 정보 추출**
   ```latex
   % \tkzDefPoint(0,0){A}
   % \tkzDefMidPoint(A,B) \tkzGetPoint{M}
   % \tkzDefCircle[circum](A,B,C)
   ```

4. **animation.md 초안 구조**
   ```markdown
   ## 도형에 대한 정보

   ### 점
   - A: 삼각형 꼭짓점
   - B: 밑변 왼쪽
   - C: 밑변 오른쪽
   - M: AB의 중점

   ### 선분
   - AB, BC, CA: 삼각형 변

   ### 원
   - (A, B, C): 외접원
   ```

---

## 사용법

```
문제 XXX의 problem.tex를 파싱해서 animation.md 초안 작성해줘
```
