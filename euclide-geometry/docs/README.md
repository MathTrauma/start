# Euclidean Geometry Problems

유클리드 기하학 문제를 단계별 애니메이션으로 시각화하는 프로젝트입니다.

## 프로젝트 구조

```
euclide-geometry/
├── lib/                    # 공통 라이브러리 (모든 문제 공유)
├── problems/              # 문제별 폴더 (config, tex, sketch)
├── viewer.html            # 문제 뷰어
├── index.html             # 문제 목록
└── deploy-to-r2.sh        # R2 배포 스크립트
```

## 빠른 시작

### 로컬 테스트
```bash
cd euclide-geometry
npx http-server -p 8080
# http://localhost:8080/viewer.html?problem=001
```

### 새 문제 추가
```bash
# 1. 템플릿 복사
cp -r templates/problem-template problems/002

# 2. 파일 수정
# - config.json: id, title, tags 등
# - problem.tex: 문제 내용
# - sketch.js: 애니메이션 로직

# 3. index.json에 문제 정보 추가
```

### R2 배포
```bash
./deploy-to-r2.sh 001
```

## 기술 스택

- **p5.js**: 캔버스 애니메이션
- **MathJax**: LaTeX 수식 렌더링
- **Cloudflare R2**: 파일 스토리지
- **Cloudflare Workers**: HTTP 서빙

## 문서

- [QUICK_START.md](QUICK_START.md) - 빠른 시작 가이드
- [DEPLOYMENT.md](DEPLOYMENT.md) - R2 배포 가이드
