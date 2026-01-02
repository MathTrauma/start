# UI Controls Refactoring

## 목적
모든 sketch.js 파일에서 중복되는 UI 컨트롤 코드를 별도 파일로 분리하여 유지보수성 향상

## 변경 사항

### 1. 새로운 공통 파일 생성
- **파일**: `lib/ui-controls.v1.0.0.js`
- **포함 함수**:
  - `setupControls()` - 메인 컨트롤 버튼 설정
  - `attachPhaseButtonListeners()` - 페이즈 버튼 리스너 연결
  - `setActiveButton(activeId)` - 활성 페이즈 버튼 스타일
  - `setActiveModeButton(activeId)` - 활성 모드 버튼 스타일

### 2. viewer.html 수정
- `<script src="...ui-controls.v1.0.0.js"></script>` 추가
- 모든 문제 페이지에서 자동으로 로드됨

### 3. 각 sketch.js 파일에서 제거할 코드
각 문제 폴더의 sketch.js 파일에서 다음 코드 블록을 **삭제**:

```javascript
// ===== UI Controls =====
function setupControls() {
    document.getElementById('btn-restart').addEventListener('click', () => {
        resetAnimation();
    });
    // ... (약 90줄)
}

function attachPhaseButtonListeners() {
    // ... (약 30줄)
}

function setActiveButton(activeId) {
    // ... (약 10줄)
}

function setActiveModeButton(activeId) {
    // ... (약 5줄)
}
```

### 4. 수정 대상 파일 목록
- [ ] problems/001/sketch.js (line 432~)
- [ ] problems/002/sketch.js (line 405~)
- [ ] problems/003/sketch.js (line 265~)
- [ ] problems/004/sketch.js (line 354~)
- [ ] problems/005/sketch.js (line 237~)
- [ ] problems/006/sketch.js (line 250~)
- [ ] problems/007/sketch.js (line 253~)
- [x] problems/008/sketch.js (이미 없음)
- [ ] problems/009/sketch.js (line 255~)
- [ ] problems/010/sketch.js (line 298~)

## 주의사항
1. **setupControls()** 함수는 삭제하되, viewer.html의 `renderControls()`에서 호출하는 부분은 유지
2. 각 sketch.js는 여전히 문제별 고유 로직(점 정의, 애니메이션)만 포함
3. R2에 배포 후 모든 문제 페이지 테스트 필요

## 배포 순서
1. ui-controls.v1.0.0.js를 R2에 업로드
2. viewer.html을 R2에 업로드
3. 각 sketch.js 파일 수정 및 R2 업로드
4. 테스트: 각 문제 페이지에서 컨트롤 동작 확인

## 예상 효과
- 코드 중복 제거: ~140줄 x 10개 = 약 1,400줄 감소
- 유지보수 용이: UI 변경 시 한 곳만 수정
- 버전 관리: ui-controls.v1.x.x로 독립적 관리
