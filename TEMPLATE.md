# Animation Template

이 템플릿은 주어진 점과 원으로부터 새로운 기하학 애니메이션을 만들기 위한 가이드입니다.

## 1. 초기 설정 (setup)

### 1.1 주어진 점들 정의
```javascript
// 예: 점 A, B, C가 주어진 경우
A = p.createVector(x1, y1);
B = p.createVector(x2, y2);
C = p.createVector(x3, y3);
```

### 1.2 주어진 원 정의
```javascript
// 예: 중심 O, 반지름 r인 원이 주어진 경우
let circle1 = {
    center: p.createVector(ox, oy),
    radius: r
};
```

## 2. Phase 정의 (draw-utils.js)

### 2.1 PHASES 객체 업데이트
```javascript
const PHASES = {
    1: { start: 0, duration: 2.0, end: 2.0 },      // Phase 1: 0-2초
    2: { start: 2.0, duration: 2.0, end: 4.0 },    // Phase 2: 2-4초
    3: { start: 4.0, duration: 1.5, end: 5.5 },    // Phase 3: 4-5.5초
    // 필요한 만큼 추가...
};
```

**규칙:**
- `start`: 이전 phase의 `end` 값과 동일
- `end`: `start + duration`
- 시간 단위는 초(seconds)

## 3. Phase별 애니메이션 작성

### Phase 템플릿 구조
```javascript
// PHASE N: [설명] (시작시간-종료시간)
// 예: PHASE 1: 삼각형 ABC 그리기 (0-2 seconds)

// 3.1 점 그리기
m_drawPoint(p, A, "A", dx, dy, phaseStart);
// dx, dy: 라벨 위치 오프셋
// phaseStart: 점이 나타나는 시간

// 3.2 선분 그리기
m_segment(p, A, B, phaseStart, duration);
// phaseStart: 선분 그리기 시작 시간
// duration: 애니메이션 지속 시간

// 3.3 삼각형 그리기
m_triangle(p, A, B, C, phaseStart, duration);

// 3.4 원 그리기
m_circle(p, center, radius, phaseStart, duration);

// 3.5 직각 표시
m_drawRightAngle(p, P1, V, P2, size, phaseStart);
// P1, P2: 직각을 이루는 두 점
// V: 직각의 꼭짓점
// size: 직각 마커 크기
```

## 4. 새로운 그리기 함수 추가 (필요시)

### 4.1 원 그리기 함수 예시
```javascript
// draw-utils.js에 추가
function m_circle(p, center, radius, phaseStart, phaseDuration) {
    let t = getPhaseProgress(p, phaseStart, phaseDuration);
    if (t < 0) return;

    t = p.constrain(t, 0, 1);

    // 원을 시계방향으로 그리는 애니메이션
    p.noFill();
    p.arc(
        scale * center.x,
        scale * center.y,
        scale * radius * 2,
        scale * radius * 2,
        0,
        t * p.TWO_PI
    );

    // 완성된 경우 전체 원 그리기
    if (t >= 1) {
        p.circle(scale * center.x, scale * center.y, scale * radius * 2);
    }
}
```

### 4.2 호(Arc) 그리기 함수 예시
```javascript
function m_arc(p, center, radius, startAngle, endAngle, phaseStart, phaseDuration) {
    let t = getPhaseProgress(p, phaseStart, phaseDuration);
    if (t < 0) return;

    t = p.constrain(t, 0, 1);
    let currentAngle = p.lerp(startAngle, endAngle, t);

    p.noFill();
    p.arc(
        scale * center.x,
        scale * center.y,
        scale * radius * 2,
        scale * radius * 2,
        startAngle,
        currentAngle
    );
}
```

## 5. 완전한 예시

```javascript
// draw.js 내부 p.draw()
p.draw = () => {
    p.background(255);
    p.translate(p.width/2, p.height/2);
    p.scale(1, -1);
    p.stroke(0);
    p.strokeWeight(1.5);
    p.noFill();

    // PHASE 1: 주어진 점들 표시 (0-1초)
    m_drawPoint(p, A, "A", -10, -5, 0);
    m_drawPoint(p, B, "B", 10, -5, 0.2);
    m_drawPoint(p, C, "C", 0, 10, 0.4);

    // PHASE 2: 삼각형 ABC 그리기 (1-3초)
    m_triangle(p, A, B, C, 1.0, 2.0);

    // PHASE 3: 새로운 점 D 구성 (3-4초)
    m_drawPoint(p, D, "D", 5, -5, 3.0);
    m_segment(p, A, D, 3.2, 0.8);

    // PHASE 4: 원 그리기 (4-5초)
    m_circle(p, O, r, 4.0, 1.0);

    // PHASE 5: 교점 표시 (5-6초)
    m_drawPoint(p, X, "X", 5, 5, 5.0);
    m_drawRightAngle(p, A, X, B, 0.3, 5.5);
};
```

## 6. 타이밍 조정 가이드

### 권장 타이밍:
- **점 표시**: 0.2-0.3초 (페이드인)
- **짧은 선분**: 0.5-1.0초
- **긴 선분**: 1.0-1.5초
- **삼각형**: 1.0-2.0초
- **원**: 1.0-2.0초
- **직각 마커**: 0.3초 (페이드인)

### 연속성 유지:
```javascript
// 나쁜 예: 시간 간격이 있음
m_drawPoint(p, A, "A", 0, 0, 0);
m_segment(p, A, B, 2.0, 1.0);  // 0-2초 사이 아무것도 안 일어남

// 좋은 예: 자연스러운 흐름
m_drawPoint(p, A, "A", 0, 0, 0);
m_segment(p, A, B, 0.3, 1.0);  // 점이 나타난 직후 선분 그리기 시작
```

## 7. 체크리스트

- [ ] 모든 점에 라벨이 있는가?
- [ ] Phase 타이밍이 겹치지 않는가?
- [ ] PHASES 객체가 올바르게 정의되었는가?
- [ ] 직각이나 특수한 관계는 표시되었는가?
- [ ] 애니메이션 흐름이 자연스러운가?
- [ ] 각 Phase가 논리적 순서를 따르는가?

## 8. 디버깅 팁

### console.log로 타이밍 확인
```javascript
function getPhaseProgress(p, phaseStart, phaseDuration) {
    // ... existing code ...

    // 디버깅용 (임시)
    if (selectedPhase !== 'all') {
        console.log(`Phase ${selectedPhase}, elapsed: ${elapsed.toFixed(2)}s`);
    }

    // ... rest of code ...
}
```

### 특정 Phase만 테스트
- UI에서 해당 Phase 버튼을 클릭하여 독립적으로 확인
- Restart 버튼으로 애니메이션 재시작

## 9. 추가 기능

### 9.1 텍스트 주석 추가
```javascript
function m_drawAnnotation(p, position, text, phaseStart) {
    let t = getPhaseProgress(p, phaseStart, 0.3);
    if (t < 0) return;

    let alpha = p.constrain(t * 255, 0, 255);
    p.fill(100, 100, 100, alpha);
    p.scale(1, -1);
    p.textSize(14);
    p.text(text, scale * position.x, -scale * position.y);
    p.scale(1, -1);
    p.noFill();
}
```

### 9.2 점선 그리기
```javascript
function m_dashedSegment(p, v1, v2, phaseStart, phaseDuration) {
    let t = getPhaseProgress(p, phaseStart, phaseDuration);
    if (t < 0) return;

    t = p.constrain(t, 0, 1);

    p.drawingContext.setLineDash([5, 5]);
    p.line(
        scale * v1.x, scale * v1.y,
        p.lerp(scale * v1.x, scale * v2.x, t),
        p.lerp(scale * v1.y, scale * v2.y, t)
    );
    p.drawingContext.setLineDash([]);
}
```
