## 애니메이션 생성

**역할:** 문제의 animation.md를 읽고 모든 애니메이션 관련 파일 생성

---

**입력:**
- `problems/XXX/animation.md` 파일의 문제 기술 단계(Problem Phases)와 풀이 단계(Solution Phases)에 설명된 내용.
- `problems/XXX/problem.tex` 파일에 주석 처리된 tkzpicture 가 존재하는 경우 (대부분 tkz-euclide 사용)

---

**출력:**
- `problems/XXX/config.json` - 타이밍과 메타데이터 : 각각의 그리기 단계는 앞선 단계가 완료되었는지 여부로 판단.
- `problems/XXX/sketch.js` - 애니메이션 구현. 
    계산(외심, 수심 등 찾기)은 lib/geometry.js 의 함수 이용.
    p5 출력은 animation.js 의 클래스 이용 : 적당한 클래스가 없으면 반드시 질문할 것. 
- `problems/XXX/solution-phase-N.tex` - 각 풀이 단계(Solution Phases)별 설명 파일 (N = 1, 2, 3, ...). 
    풀이 단계만큼만 생성. 
    풀이 단계가 없으면 생성하지 않음

---

**작업 내용:**
1. animation.md 파싱하여 문제 기술 단계(problem phases)와 풀이 단계(solution phases) 추출

2. config.json 생성:
   - 앞 phase 종료가 다음 phase 시작 트리거
   - geometry 정보 추출 (problem.tex의 tkz-euclide 주석 참고)

3. sketch.js 생성:
   - `initAnimations()` 함수: 모든 애니메이션 객체 생성
   - `drawProblemPhases()` / `drawProblemPhaseOnly(phase)` 구현
   - `drawSolutionPhases()` / `drawSolutionPhaseOnly(phase)` 구현

4. **solution-phase-N.tex 파일 자동 생성 (중요!):**
   - animation.md의 "풀이 단계" 섹션에서 각 phase별 설명 추출
   - LaTeX 형식으로 변환:
     - "점 B 와 E" → `점 $B, E$`
     - "중점 F" → `중점 $F$`
     - "선분 DF" → `선분 $\overline{DF}$`
     - "삼각형 BDF" → `삼각형 $\triangle BDF$`
     - "각 BDF" → `$\angle BDF$`
   - 각 phase에 해당하는 설명을 `solution-phase-N.tex`로 저장

---

**중요 규칙:**
- 색상은 항상 `COLORS.TRIANGLE_BLUE`, `COLORS.TRIANGLE_RED` 등 표준 색상 사용
- 투명도는 `COLORS.ALPHA_LIGHT`, `COLORS.ALPHA_MEDIUM`, `COLORS.ALPHA_HEAVY` 사용
- 각도 마커는 개별 animation.md 의 지시를 따를 것. 
- solution-phase-N.tex 파일 생성은 필수!

---