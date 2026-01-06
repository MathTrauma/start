# 레이아웃 안정화

## 문제점

### 1. p5 캔버스 떨림
- `setTimeout(100ms)`은 p5.js setup() 완료를 보장하지 않음
- 캔버스 크기 결정 전에 visible 되면서 레이아웃 재계산 발생

### 2. Solution Panel 레이아웃 점프
- phase 진행 시 `updateProblemText()`로 내용 교체
- phase별 HTML 높이가 다르면 전체 레이아웃이 상하로 이동

## 해결책

### CSS: `contain` 속성
```css
.element {
    contain: layout paint;
}
```
- `layout`: 내부 레이아웃 변화가 외부로 전파되지 않음
- `paint`: 자식이 경계 밖으로 그려지지 않음 (GPU 최적화 힌트)

**주의**: `contain: layout`을 쓰려면 고정 크기(`min-height` 등)가 필요

### CSS: 고정 높이
```css
.solution-panel {
    min-height: 300px;  /* 공간 미리 확보 */
}
```

### JS: 이벤트 기반 캔버스 표시
```javascript
// sketch.js - setup 완료 시
window.dispatchEvent(new CustomEvent('p5-ready'));

// viewer.html - 이벤트 수신 후 표시
window.addEventListener('p5-ready', () => {
    canvasWrapper.style.opacity = '1';
});
```
