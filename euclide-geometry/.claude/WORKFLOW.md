# 문제 추가 워크플로우

## 단계 개요

```
1. problem.tex 작성 (사용자)
2. .tex → .html 변환 (MathJax SVG)
3. animation.md 초안 생성 (tex-parser)
4. animation.md 완성 (사용자)
5. 애니메이션 파일 생성 (animator)
6. 메타데이터 동기화 (sync-metadata)
7. R2 배포 (deployer)
```

---

## 각 문제 폴더 구조

`problems/XXX/` 폴더에 필요한 파일:
- `problem.tex` - 원본 LaTeX 문제
- `problem.html` - MathJax SVG로 변환된 HTML (index 카드에 표시됨)
- `config.json` - 문제 메타데이터 및 phase 정의
- `sketch.js` - p5.js 애니메이션 코드
- `animation.md` - 애니메이션 설계 문서

---

## 상세 단계

### 1단계: problem.tex 작성
사용자가 `problems/XXX/problem.tex` 작성

첫 줄 형식:
```latex
% level 2
% #태그1 #태그2
```

### 2단계: LaTeX → HTML 변환

**중요:** 서버 측 변환 없이 클라이언트에서 바로 렌더링되도록,
MathJax의 `jax="SVG"` 형식으로 미리 변환하여 저장한다.

변환 형식:
- LaTeX 수식은 `<mjx-container class="MathJax" jax="SVG">` 형태의 SVG로 변환
- 인라인 수식과 블록 수식 모두 SVG로 사전 렌더링
- 생성된 `problem.html`은 viewer.html과 index.html(문제 목록 카드)에서 사용됨
- 참고: `problems/003/problem.html`

```bash
node scripts/convert-tex.js XXX
```

### 3단계: animation.md 초안
```
"XXX번 problem.tex 파싱해서 animation.md 초안 만들어줘"
```
→ docs/tex-parser.md 참조

### 4단계: animation.md 완성
사용자가 animation.md에 문제/풀이 단계 작성

### 5단계: 애니메이션 생성
```
"XXX번 animation.md로 sketch.js 만들어줘"
```
→ docs/animator.md 참조

- lib/geometry.js, lib/animation.js, lib/draw-utils.js 활용
- Phase 구조는 config.json과 일치해야 함

### 6단계: 메타데이터 동기화
```bash
./scripts/sync-metadata.sh XXX
./scripts/validate-metadata.sh
```

이 스크립트는:
- `problem.tex`에서 level 추출하여 `config.json`과 `problems/index.json` 업데이트
- `problem.html`이 존재하면 내용을 읽어서 `problems/index.json`의 `problemHtml` 필드에 추가
- index.html에서 카드 표시 시 `problemHtml`(있으면) 또는 `description` 사용

→ docs/metadata.md 참조

### 7단계: R2 배포
```bash
./scripts/deploy.sh 011      # 특정 문제 배포
./scripts/deploy.sh all      # 전체 배포 (lib, 전체 문제, index 포함)
./scripts/deploy.sh lib      # 라이브러리만 배포
./scripts/deploy.sh index    # index.json만 배포
```
→ docs/deployer.md 참조

---

## 관련 문서

| 문서 | 설명 |
|------|------|
| docs/tex-parser.md | LaTeX 파싱 |
| docs/animator.md | 애니메이션 생성 |
| docs/metadata.md | 메타데이터 관리 |
| docs/deployer.md | R2 배포 |
| docs/troubleshooting.md | 문제 해결 |

---

## 현재 단계 확인

작업 중인 문제 번호를 알려주시면 현재 어느 단계인지 확인해드립니다.
