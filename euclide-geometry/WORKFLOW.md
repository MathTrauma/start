# 문제 추가 워크플로우 (Sub-Agent 기반)

## 개요

문제 추가 작업을 전문화된 sub-agent들이 독립적으로 수행하고, main agent는 배포와 조율만 담당합니다.

---

## ⚠️ 변경 추적 프로토콜 (필수!)

### 핵심 원칙
> **"problem.tex가 Single Source of Truth"**
>
> problem.tex 첫 줄의 level, contest 정보가 모든 다른 파일에 자동 반영되어야 함.

### 작업 시작 전
1. `git status` 실행하여 현재 상태 확인
2. 작업 대상 문제의 problem.tex 첫 줄 확인 (level, contest 여부)

### 작업 완료 후 (필수!)
1. **메타데이터 동기화**: `./scripts/sync-metadata.sh <problem_id>` 또는 `all`
2. **일관성 검사**: `./scripts/validate-metadata.sh`
3. **R2 배포**: `./scripts/deploy-changes.sh`
4. 로컬 브라우저에서 테스트

### R2 업로드 제외 규칙 (필수!)
> **README.md를 제외한 모든 .md 파일은 R2에 업로드하지 않음**

다음 파일들은 R2 버킷에 업로드하지 말 것:
- `WORKFLOW.md` - 개발 워크플로우 문서
- `UI-CONTROLS-REFACTOR.md` - 리팩토링 문서
- `problems/XXX/animation.md` - 애니메이션 명세 (개발용)
- 기타 개발/문서화 목적의 `.md` 파일들

**허용되는 .md 파일:**
- `README.md` - 프로젝트 설명 (공개용)

### 스크립트 사용법

```bash
# 메타데이터 일관성 검사
./scripts/validate-metadata.sh

# 특정 문제 메타데이터 동기화 (problem.tex → config.json → index.json)
./scripts/sync-metadata.sh 007

# 전체 문제 동기화
./scripts/sync-metadata.sh all

# 변경된 파일 R2 배포
./scripts/deploy-changes.sh
```

### 메타데이터 동기화 규칙

| 소스 | 대상 | 동기화 항목 |
|------|------|------------|
| problem.tex 첫 줄 | config.json | level |
| config.json | problems/index.json | level, tags, title |
| config.json | metadata/problems-index.json | level, tags, title |
| index.json | stats.byLevel | 자동 재계산 |

---

## Sub-Agent 구조

### 1. **animation-creator** Agent (애니메이션 생성)

**역할:** 문제의 animation.md를 읽고 모든 애니메이션 관련 파일 생성

**입력:**
- `problems/XXX/animation.md` 파일
- `problems/XXX/problem.tex` 파일 (기하 정보용)

**출력:**
- `problems/XXX/config.json` - 타이밍과 메타데이터
- `problems/XXX/sketch.js` - 애니메이션 구현
- `problems/XXX/solution-phase-N.tex` - 각 풀이 단계별 설명 파일 (N = 1, 2, 3, ...)

**작업 내용:**
1. animation.md 파싱하여 문제 기술 단계(problem phases)와 풀이 단계(solution phases) 추출
2. config.json 생성:
   - 각 phase의 타이밍 계산 (startTime, duration, endTime)
   - geometry 정보 추출 (problem.tex의 tkz-euclide 주석 참고)
3. sketch.js 생성:
   - `initAnimations()` 함수: 모든 애니메이션 객체 생성
   - `drawProblemPhases()` / `drawProblemPhaseOnly(phase)` 구현
   - `drawSolutionPhases()` / `drawSolutionPhaseOnly(phase)` 구현
4. **solution-phase-N.tex 파일 자동 생성 (중요!):**
   - animation.md의 "풀이 단계" 섹션에서 각 phase별 설명 추출
   - LaTeX 형식으로 변환:
     - "점 B 와 E" → `점 $B, E$`
     - "중점 점 F" → `중점을 $F$`
     - "선분 DF" → `선분 $\overline{DF}$`
     - "삼각형 BDF" → `삼각형 $\triangle BDF$`
     - "각 BDF" → `$\angle BDF$`
   - 각 phase에 해당하는 설명을 `solution-phase-N.tex`로 저장

**호출 방법:**
```
Main Agent → Task tool with subagent_type="animation-creator"
Prompt: "problems/XXX/animation.md를 읽고 config.json, sketch.js, solution-phase-N.tex 파일들을 생성해줘"
```

**중요 규칙:**
- 색상은 항상 `COLORS.TRIANGLE_BLUE`, `COLORS.TRIANGLE_RED` 등 표준 색상 사용
- 투명도는 `COLORS.ALPHA_LIGHT`, `COLORS.ALPHA_MEDIUM`, `COLORS.ALPHA_HEAVY` 사용
- 각도 마커는 일관되게 `MAngleDot` 사용 (별 모양 금지)
- solution-phase-N.tex 파일 생성은 필수!

---

### 2. **geometry-builder** Agent (기하 함수 추가)

**역할:** 새로운 기하학적 계산 함수를 geometry.js에 추가

**입력:**
- 필요한 기하 함수 명세 (예: "내접원의 중심 구하기", "원과 직선의 교점")

**출력:**
- `lib/geometry.js` 업데이트 (pure math functions 추가)

**작업 내용:**
1. 요청된 기하 함수를 순수 수학 함수로 구현
2. p5.js instance mode 호환성 확인:
   - `new p5.Vector()` 사용 (createVector() 금지)
   - `.copy().mult()` 패턴 사용 (원본 벡터 변형 방지)
3. JSDoc 주석 추가
4. 기존 코드와의 일관성 유지

**호출 방법:**
```
Main Agent → Task tool with subagent_type="geometry-builder"
Prompt: "원의 중심과 반지름이 주어졌을 때 원 위의 특정 각도 위치 점을 반환하는 함수 추가해줘"
```

---

### 3. **tex-parser** Agent (LaTeX 파서)

**역할:** problem.tex 파일을 파싱하여 구조화된 정보 추출

**입력:**
- `problems/XXX/problem.tex` 파일

**출력:**
- 문제 텍스트 추출
- tkz-euclide 주석에서 기하 정보 추출 (점, 선, 원 등)
- animation.md의 "도형에 대한 정보" 섹션 초안 생성

**작업 내용:**
1. LaTeX 수식 파싱
2. 주석 처리된 tikz 코드에서 기하 구성 추출
3. 점의 정의, 선분, 원 등을 구조화

**호출 방법:**
```
Main Agent → Task tool with subagent_type="tex-parser"
Prompt: "problems/XXX/problem.tex를 파싱하여 animation.md의 도형 정보 섹션 작성해줘"
```

---

### 4. **deployment-manager** Agent (배포 관리)

**역할:** R2 배포 자동화 및 검증

**입력:**
- 배포할 문제 번호 (예: "001")
- 배포 타입: "full" | "libs-only" | "problem-only"

**출력:**
- R2 배포 실행 및 결과 보고
- 배포 후 URL 검증
- index.json 업데이트 확인

**작업 내용:**
1. `./deploy-to-r2.sh XXX` 실행
2. Worker URL 테스트
3. index.json이 R2에 올라갔는지 확인
4. 배포 실패 시 문제 진단 및 재시도

**호출 방법:**
```
Main Agent → Task tool with subagent_type="deployment-manager"
Prompt: "Problem 010을 R2에 배포하고 검증해줘"
```

---

## Main Agent 역할

Main agent는 **조율자(Coordinator)** 역할만 수행:

1. **사용자 요청 분석**
   - 어떤 sub-agent를 호출해야 하는지 결정

2. **Sub-agent 호출 순서 결정**
   ```
   예: 새 문제 추가 시
   1. tex-parser → animation.md 초안 생성
   2. (사용자가 animation.md 완성)
   3. geometry-builder → 필요한 기하 함수 추가
   4. animation-creator → config.json, sketch.js, solution-phase-*.tex 생성
   5. deployment-manager → R2 배포
   ```

3. **Sub-agent 결과 확인 및 통합**
   - 각 agent의 출력이 올바른지 검증
   - 오류 발생 시 해당 agent에 수정 요청

4. **배포만 직접 수행**
   - `./deploy-to-r2.sh` 실행
   - problems/index.json 업데이트
   - 배포 결과 사용자에게 보고

---

## 워크플로우 예시

### 사용자: "010번 문제 추가해줘"

**Main Agent:**
```
1. tex-parser 호출 → animation.md 도형 정보 초안 작성
2. 사용자에게 animation.md 완성 요청
```

**사용자:** animation.md 작성 완료

**Main Agent:**
```
3. animation.md 확인
4. 필요한 기하 함수 확인 (getCircumcenter, reflectPoint 등)
5. geometry-builder 호출 → geometry.js에 함수 추가
6. animation-creator 호출 → config.json, sketch.js, solution-phase-*.tex 생성
7. deployment-manager 호출 → R2 배포 및 검증
8. 사용자에게 완료 보고 (배포 URL 포함)
```

---

## 제안: 추가 Sub-Agent

### 5. **color-standardizer** Agent (색상 표준화)

**역할:** 기존 문제들의 하드코딩된 색상을 COLORS 상수로 변환

**작업 내용:**
- 모든 sketch.js 파일에서 `fillColor: [100, 100, 200]` 패턴 찾기
- `COLORS.TRIANGLE_BLUE` 등으로 자동 변환
- maxAlpha도 COLORS.ALPHA_* 상수로 변환

### 6. **test-validator** Agent (테스트 검증)

**역할:** 배포 전 로컬 테스트 자동화

**작업 내용:**
- 로컬 서버 시작 (`npx http-server`)
- 각 문제 페이지 접근 테스트
- JavaScript 에러 확인
- 애니메이션 재생 테스트

---

## 파일 구조

```
problems/XXX/
├── animation.md           # 사용자 작성 (애니메이션 명세)
├── problem.tex           # 사용자 작성 (문제 LaTeX)
├── config.json           # animation-creator 생성
├── sketch.js             # animation-creator 생성
├── solution-phase-1.tex  # animation-creator 생성 ⚠️ 중요!
├── solution-phase-2.tex  # animation-creator 생성
└── solution-phase-3.tex  # animation-creator 생성
```

---

## 체크리스트 (Main Agent용)

새 문제 추가 시 확인 사항:

- [ ] tex-parser 실행 완료
- [ ] animation.md 완성 확인
- [ ] geometry-builder 실행 (필요 시)
- [ ] animation-creator 실행 완료
  - [ ] config.json 생성 확인
  - [ ] sketch.js 생성 확인
  - [ ] **solution-phase-N.tex 파일들 생성 확인** ⚠️ 중요!
- [ ] problems/index.json 업데이트 확인
- [ ] deployment-manager 실행 완료
- [ ] Worker URL 테스트 완료

---

## 문제 해결 가이드

### 문제: solution-phase-N.tex 파일이 생성되지 않음

**원인:**
- animation-creator agent가 풀이 단계 섹션을 무시함
- animation.md에 풀이 단계가 없음

**해결:**
1. animation.md에 "## 풀이 단계 (Solution Phases)" 섹션 확인
2. animation-creator agent에 명시적으로 요청:
   ```
   "animation.md의 풀이 단계를 읽고 solution-phase-N.tex 파일들을 생성해줘"
   ```

### 문제: 홈페이지에 새 문제가 안 보임

**원인:**
- problems/index.json이 R2에 배포되지 않음

**해결:**
1. deployment-manager agent 호출
2. 또는 수동 배포:
   ```bash
   ./deploy-to-r2.sh XXX
   ```
3. 브라우저 캐시 지우고 새로고침 (Cmd+Shift+R)

### 문제: 색상이 일관되지 않음

**원인:**
- 하드코딩된 색상 값 사용

**해결:**
1. color-standardizer agent 호출
2. 또는 수동으로 COLORS.* 상수 사용하도록 수정
