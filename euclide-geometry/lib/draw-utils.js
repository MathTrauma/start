// Drawing utility functions

let scale = 50;           // 동적 변경 가능
let offsetX = 0;          // 중심 맞추기용
let offsetY = 0;

// 표준 색상 정의 (모든 문제에서 일관되게 사용)
const COLORS = {
    // 삼각형 채우기 색상 (RGB 값)
    TRIANGLE_BLUE: [100, 150, 255],      // 파란색 삼각형
    TRIANGLE_RED: [255, 100, 100],       // 빨간색 삼각형
    TRIANGLE_GREEN: [100, 200, 100],     // 초록색 삼각형
    TRIANGLE_YELLOW: [255, 200, 100],    // 노란색 삼각형

    // 테두리 강조 색상 (emission용)
    EMISSION_BLUE: [50, 100, 255],
    EMISSION_RED: [255, 50, 50],
    EMISSION_GREEN: [50, 200, 50],
    EMISSION_YELLOW: [255, 180, 50],

    // 투명도 (maxAlpha)
    ALPHA_LIGHT: 50,      // 옅은 투명도
    ALPHA_MEDIUM: 80,     // 중간 투명도
    ALPHA_HEAVY: 120      // 진한 투명도
};

// Animation control state
let startTime = null;
let isPaused = false;
let pausedTime = 0;
let totalPausedDuration = 0;
let selectedPhase = 'all'; // 'all', 1, 2, 3, 4, 5

// Mode control state
let currentMode = 'problem'; // 'problem' | 'solution'
let problemPhaseCount = 5;
let solutionPhaseCount = 0;

// Phase definitions (start time, duration) - nested by mode
const PHASES = {
    problem: {
        1: { start: 0, duration: 2.0, end: 2.0 },
        2: { start: 2.0, duration: 2.0, end: 4.0 },
        3: { start: 4.0, duration: 1.0, end: 5.0 },
        4: { start: 5.0, duration: 2.0, end: 7.0 },
        5: { start: 7.0, duration: 1.0, end: 8.0 }
    },
    solution: {}
};

function resetAnimation() {
    startTime = null;
    isPaused = false;
    pausedTime = 0;
    totalPausedDuration = 0;
}

function togglePause(p) {
    isPaused = !isPaused;
    if (isPaused) {
        pausedTime = p.millis();
    } else {
        totalPausedDuration += (p.millis() - pausedTime);
    }
    return isPaused;
}

function setPhase(phase) {
    selectedPhase = phase;
    resetAnimation();
}

// Initialize phases from config
function initializePhases(config) {
    // Backward compatibility: if config has 'phases' instead of 'problemPhases'
    if (config.phases && !config.problemPhases) {
        config.problemPhases = config.phases;
    }

    // Build problem phases map
    if (config.problemPhases) {
        PHASES.problem = {};
        problemPhaseCount = config.problemPhases.length;
        config.problemPhases.forEach(phase => {
            PHASES.problem[phase.id] = {
                start: phase.startTime,
                duration: phase.duration,
                end: phase.endTime
            };
        });
    }

    // Build solution phases map
    if (config.solutionPhases && config.solutionPhases.length > 0) {
        PHASES.solution = {};
        solutionPhaseCount = config.solutionPhases.length;
        config.solutionPhases.forEach(phase => {
            PHASES.solution[phase.id] = {
                start: phase.startTime,
                duration: phase.duration,
                end: phase.endTime
            };
        });
    } else {
        solutionPhaseCount = 0;
        PHASES.solution = {};
    }
}

// Switch between problem and solution modes
function setMode(mode) {
    if (currentMode !== mode) {
        currentMode = mode;
        selectedPhase = 'all';
        resetAnimation();
        return true; // Mode changed
    }
    return false; // Mode unchanged
}

function getCurrentMode() {
    return currentMode;
}

function getCurrentPhaseCount() {
    return currentMode === 'problem' ? problemPhaseCount : solutionPhaseCount;
}

// Calculate scale and offset from points array
function calculateScaleFromPoints(points, canvasWidth, canvasHeight, padding = 50) {
    if (!points || points.length === 0) return;

    // Bounding box 계산
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    points.forEach(pt => {
        if (pt) {
            minX = Math.min(minX, pt.x);
            maxX = Math.max(maxX, pt.x);
            minY = Math.min(minY, pt.y);
            maxY = Math.max(maxY, pt.y);
        }
    });

    const rangeX = maxX - minX;
    const rangeY = maxY - minY;

    if (rangeX === 0 || rangeY === 0) return;

    // Scale 계산 (패딩 고려)
    const availableWidth = canvasWidth - padding * 2;
    const availableHeight = canvasHeight - padding * 2;

    scale = Math.min(availableWidth / rangeX, availableHeight / rangeY);

    // 중심 오프셋 계산
    offsetX = (minX + maxX) / 2;
    offsetY = (minY + maxY) / 2;
}

// Get current animation time in seconds (for use without p5 instance)
// Note: requires startTime to be initialized by getPhaseProgress first
function getAnimationTime() {
    if (startTime === null || !window._p5Instance) return 0;

    let currentTime = window._p5Instance.millis();
    if (isPaused) {
        currentTime = pausedTime;
    }

    return (currentTime - startTime - totalPausedDuration) / 1000;
}

function getPhaseProgress(p, phaseStart, phaseDuration, isFadeOut = false) {
    if (startTime === null) startTime = p.millis();

    let currentTime = p.millis();
    if (isPaused) {
        currentTime = pausedTime;
    }

    let elapsed = (currentTime - startTime - totalPausedDuration) / 1000; // seconds

    // Phase filtering (only when specific phase selected)
    if (selectedPhase !== 'all') {
        let phase = PHASES[currentMode][selectedPhase];

        // Draw previous phases completely
        if (phaseStart < phase.start) {
            return 1; // Already completed
        }

        // Don't draw future phases
        // fadeOut: 경계값은 현재 phase에 포함 (> 사용)
        // 그리기: 경계값은 미래 phase (>= 사용)
        if (isFadeOut) {
            if (phaseStart > phase.end) {
                return -1; // Don't fade out yet
            }
        } else {
            if (phaseStart >= phase.end) {
                return -1; // Don't draw
            }
        }

        // Animate current phase once
        if (elapsed > phase.duration) {
            return 1; // Animation complete, show final state
        }

        // 상대 시간 계산: 절대→상대 변환
        elapsed = Math.max(0, elapsed);
        phaseStart = Math.max(0, phaseStart - phase.start);
    }

    if (elapsed < phaseStart) return -1;  // Not started yet, don't draw
    if (elapsed >= phaseStart + phaseDuration) return 1;
    return (elapsed - phaseStart) / phaseDuration;
}

// Helper to transform coordinates
function tx(v) { return scale * (v.x - offsetX); }
function ty(v) { return scale * (v.y - offsetY); }

// Draw triangle with animation
function m_triangle(p, v1, v2, v3, phaseStart, phaseDuration) {
    let t = getPhaseProgress(p, phaseStart, phaseDuration);
    if (t < 0) return;

    p.beginShape();
    p.vertex(tx(v1), ty(v1));

    if (t < 0.33) {
        let t2 = t / 0.33;
        p.vertex(p.lerp(tx(v1), tx(v2), t2),
                 p.lerp(ty(v1), ty(v2), t2));
    } else if (t < 0.66) {
        p.vertex(tx(v2), ty(v2));
        let t2 = (t - 0.33) / 0.33;
        p.vertex(p.lerp(tx(v2), tx(v3), t2),
                 p.lerp(ty(v2), ty(v3), t2));
    } else {
        p.vertex(tx(v2), ty(v2));
        p.vertex(tx(v3), ty(v3));
        if (t >= 1) {
            p.vertex(tx(v1), ty(v1));
        } else {
            let t2 = (t - 0.66) / 0.34;
            p.vertex(p.lerp(tx(v3), tx(v1), t2),
                     p.lerp(ty(v3), ty(v1), t2));
        }
    }
    p.endShape();
}

// Draw line segment with animation
function m_segment(p, v1, v2, phaseStart, phaseDuration) {
    let t = getPhaseProgress(p, phaseStart, phaseDuration);
    if (t < 0) return;

    t = p.constrain(t, 0, 1);

    let sx = tx(v1), sy = ty(v1);
    let ex = tx(v2), ey = ty(v2);

    p.line(
        sx, sy,
        p.lerp(sx, ex, t),
        p.lerp(sy, ey, t)
    );
}

// Draw point with label and fade-in animation
function m_drawPoint(p, P, label, dx, dy, phaseStart) {
    let t = getPhaseProgress(p, phaseStart, 0.3);
    if (t < 0) return;

    let alpha = p.constrain(t * 255, 0, 255);
    p.fill(0, alpha);
    p.noStroke();
    p.circle(tx(P), ty(P), 6);
    p.fill(0, alpha);
    p.scale(1, -1);
    p.text(label, tx(P) + dx, -ty(P) + dy);
    p.scale(1, -1);
    p.noFill();
    p.stroke(0, alpha);
}

// Draw right angle marker
function m_drawRightAngle(p, P1, V, P2, s, phaseStart) {
    let t = getPhaseProgress(p, phaseStart, 0.3);
    if (t < 0) return;

    let alpha = p.constrain(t * 255, 0, 255);
    p.stroke(0, alpha);

    let v1 = p5.Vector.sub(P1, V).normalize();
    let v2 = p5.Vector.sub(P2, V).normalize();
    let a = p5.Vector.add(V, p5.Vector.mult(v1, s));
    let b = p5.Vector.add(a, p5.Vector.mult(v2, s));
    let c = p5.Vector.add(V, p5.Vector.mult(v2, s));

    p.line(tx(a), ty(a), tx(b), ty(b));
    p.line(tx(b), ty(b), tx(c), ty(c));
}
