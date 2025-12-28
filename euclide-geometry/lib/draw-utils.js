// Drawing utility functions

const scale = 50;

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

function getPhaseProgress(p, phaseStart, phaseDuration) {
    if (!startTime) startTime = p.millis();

    let currentTime = p.millis();
    if (isPaused) {
        currentTime = pausedTime;
    }

    let elapsed = (currentTime - startTime - totalPausedDuration) / 1000; // seconds

    // Phase filtering
    if (selectedPhase !== 'all') {
        let phase = PHASES[currentMode][selectedPhase];

        // Draw previous phases completely
        if (phaseStart < phase.start) {
            return 1; // Already completed
        }

        // Don't draw future phases
        if (phaseStart >= phase.end) {
            return -1; // Don't draw
        }

        // Animate current phase once
        if (elapsed > phase.duration) {
            return 1; // Animation complete, show final state
        }
        elapsed = Math.max(0, elapsed);
        phaseStart = 0; // Reset phase start for single phase view
    }

    if (elapsed < phaseStart) return 0;
    if (elapsed >= phaseStart + phaseDuration) return 1;
    return (elapsed - phaseStart) / phaseDuration;
}

// Draw triangle with animation
function m_triangle(p, v1, v2, v3, phaseStart, phaseDuration) {
    let t = getPhaseProgress(p, phaseStart, phaseDuration);
    if (t < 0) return;

    p.beginShape();
    p.vertex(scale * v1.x, scale * v1.y);

    if (t < 0.33) {
        let t2 = t / 0.33;
        p.vertex(p.lerp(scale * v1.x, scale * v2.x, t2),
                 p.lerp(scale * v1.y, scale * v2.y, t2));
    } else if (t < 0.66) {
        p.vertex(scale * v2.x, scale * v2.y);
        let t2 = (t - 0.33) / 0.33;
        p.vertex(p.lerp(scale * v2.x, scale * v3.x, t2),
                 p.lerp(scale * v2.y, scale * v3.y, t2));
    } else {
        p.vertex(scale * v2.x, scale * v2.y);
        p.vertex(scale * v3.x, scale * v3.y);
        if (t >= 1) {
            p.vertex(scale * v1.x, scale * v1.y);
        } else {
            let t2 = (t - 0.66) / 0.34;
            p.vertex(p.lerp(scale * v3.x, scale * v1.x, t2),
                     p.lerp(scale * v3.y, scale * v1.y, t2));
        }
    }
    p.endShape();
}

// Draw line segment with animation
function m_segment(p, v1, v2, phaseStart, phaseDuration) {
    let t = getPhaseProgress(p, phaseStart, phaseDuration);
    if (t < 0) return;

    t = p.constrain(t, 0, 1);

    let sx = scale * v1.x,
        sy = scale * v1.y,
        ex = scale * v2.x,
        ey = scale * v2.y;

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
    p.circle(P.x * scale, P.y * scale, 6);
    p.fill(0, alpha);
    p.scale(1, -1);
    p.text(label, P.x * scale + dx, -P.y * scale + dy);
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

    p.line(scale * a.x, scale * a.y, scale * b.x, scale * b.y);
    p.line(scale * b.x, scale * b.y, scale * c.x, scale * c.y);
}
