# 문제 추가 워크플로우

## 단계 개요

```
1. problem.tex 작성 (사용자)
2. animation.md 초안 생성 (tex-parser)
3. animation.md 완성 (사용자)
4. 애니메이션 파일 생성 (animator)
5. .tex → .html 변환 (convert-tex)
6. 메타데이터 동기화 (sync-metadata)
7. R2 배포 (deployer)
```

---

## 상세 단계

### 1단계: problem.tex 작성
사용자가 `problems/XXX/problem.tex` 작성

첫 줄 형식:
```latex
% level 2
% #태그1 #태그2
```

### 2단계: animation.md 초안
```
"XXX번 problem.tex 파싱해서 animation.md 초안 만들어줘"
```
→ docs/tex-parser.md 참조

### 3단계: animation.md 완성
사용자가 animation.md에 문제/풀이 단계 작성

### 4단계: 애니메이션 생성
```
"XXX번 animation.md로 sketch.js 만들어줘"
```
→ docs/animator.md 참조

### 5단계: LaTeX → HTML 변환
```bash
node scripts/convert-tex.js XXX
```

### 6단계: 메타데이터 동기화
```bash
./scripts/sync-metadata.sh XXX
./scripts/validate-metadata.sh
```
→ docs/metadata.md 참조

### 7단계: R2 배포
```bash
./scripts/deploy-changes.sh
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
