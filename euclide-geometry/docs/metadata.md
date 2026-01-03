# 메타데이터 관리

## Single Source of Truth
> **problem.tex 첫 줄이 기준**

```latex
% level 2
% #medium #right-angles #concyclic-points
```

---

## 동기화 흐름

```
problem.tex → config.json → problems/index.json -> metadata/problem-index.json
```

| 소스 | 대상 | 항목 |
|------|------|------|
| problem.tex 첫 줄 | config.json | level, contest |
| config.json | index.json | level, tags, title |

---

## 스크립트

```bash
# 특정 문제 동기화
./scripts/sync-metadata.sh 007

# 전체 동기화
./scripts/sync-metadata.sh all

# 일관성 검사
./scripts/validate-metadata.sh
```

---

## config.json 필수 필드

```json
{
  "id": "001",
  "title": "문제 제목",
  "level": 2,
  "tags": ["태그1", "태그2"],
  "contest": false,
  "resources": {
    "problem": "problem.html",
    "sketch": "sketch.js"
  }
}
```

---

## 체크리스트

- [ ] problem.tex 첫 줄에 level 있는지
- [ ] config.json의 level이 problem.tex와 일치하는지
- [ ] contest 문제면 config.json에 `"contest": true` 있는지
- [ ] index.json에 문제가 등록되어 있는지
