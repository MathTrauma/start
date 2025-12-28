// Main sketch

let p5Instance; // Global reference for controls

const sketch = (p) => {

    // ====== Points ======
    let A, B, C, D, E, F, M, X, O;

    p.setup = () => {
        p5Instance = p; // Store global reference
        let canvas = p.createCanvas(800, 600);
        canvas.parent('canvas-wrapper');
        p.pixelDensity(1); // Fix size across all displays
        p.angleMode(p.DEGREES);

        // base points
        B = p.createVector(-3, -3);
        C = p.createVector(3, -3);

        // isosceles triangle with base angles 55°
        let base = p5.Vector.sub(C, B);
        let len = base.mag();
        let h = (len / 2) * p.tan(55);

        let midBC = p5.Vector.add(B, C).mult(0.5);
        A = p.createVector(midBC.x, midBC.y + h);

        // midpoint D of BC
        D = midBC.copy();

        // projection E of D onto AB
        E = projectPointToLine(D, A, B);

        // midpoint F of BE
        F = p5.Vector.add(B, E).mult(0.5);

        // midpoint M of DE
        M = p5.Vector.add(D, E).mult(0.5);

        // intersection X of CE and AM
        X = intersectLines(C, E, A, M);

        // circumcenter O of triangle ADE (for solution)
        O = circumcenter(A, D, E);

        resetAnimation();
        // setupControls will be called from viewer.html after controls are rendered
    };

    p.draw = () => {
        p.background(255);

        p.translate(p.width/2, p.height/2);
        p.scale(1, -1);

        p.stroke(0);
        p.strokeWeight(1.5);
        p.noFill();

        const mode = getCurrentMode();

        if (mode === 'problem') {
            drawProblemPhases();
        } else if (mode === 'solution') {
            drawProblemPhasesStatic();
            drawSolutionPhases();
        }
    };

    function drawProblemPhases() {
        // PHASE 1: Triangle ABC (0-2 seconds)
        m_drawPoint(p, A, "A", -10, -5, 0);
        m_drawPoint(p, B, "B", -10, 15, 0.2);
        m_drawPoint(p, C, "C", 5, 15, 0.4);
        m_triangle(p, A, B, C, 0.6, 1.4);

        // PHASE 2: Point D and segment AD (2-4 seconds)
        m_drawPoint(p, D, "D", 5, -5, 2.0);
        m_segment(p, A, D, 2.3, 1.0);
        m_drawRightAngle(p, A, D, C, 0.3, 3.4);

        // PHASE 3: Segment DE (4-5 seconds)
        m_segment(p, D, E, 4.0, 1.0);
        m_drawPoint(p, E, "E", -10, 5, 4.0);
        m_drawRightAngle(p, D, E, B, 0.3, 5.0);

        // PHASE 4: Point M and segments CE, AM (5-7 seconds)
        m_drawPoint(p, M, "M", -12, 12, 5.0);
        m_segment(p, C, E, 5.3, 1.0);
        m_segment(p, A, M, 6.3, 1.0);

        // PHASE 5: Point X (7-8 seconds)
        m_drawPoint(p, X, "X", 5, -5, 7.0);
    }

    function drawProblemPhasesStatic() {
        // Draw all problem elements instantly (no animation)
        const scale = 50;

        // Points
        p.fill(0);
        p.noStroke();
        [A, B, C, D, E, M, X].forEach(pt => {
            p.circle(pt.x * scale, pt.y * scale, 6);
        });

        // Labels
        p.scale(1, -1);
        p.text("A", A.x * scale - 10, -A.y * scale - 5);
        p.text("B", B.x * scale - 10, -B.y * scale + 15);
        p.text("C", C.x * scale + 5, -C.y * scale + 15);
        p.text("D", D.x * scale + 5, -D.y * scale + 15);
        p.text("E", E.x * scale - 10, -E.y * scale + 5);
        p.text("M", M.x * scale - 12, -M.y * scale + 12);
        p.text("X", X.x * scale + 5, -X.y * scale - 5);
        p.scale(1, -1);

        // Lines
        p.stroke(0);
        p.noFill();
        p.beginShape();
        p.vertex(A.x * scale, A.y * scale);
        p.vertex(B.x * scale, B.y * scale);
        p.vertex(C.x * scale, C.y * scale);
        p.vertex(A.x * scale, A.y * scale);
        p.endShape();

        p.line(A.x * scale, A.y * scale, D.x * scale, D.y * scale);
        p.line(D.x * scale, D.y * scale, E.x * scale, E.y * scale);
        p.line(C.x * scale, C.y * scale, E.x * scale, E.y * scale);
        p.line(A.x * scale, A.y * scale, M.x * scale, M.y * scale);

        // Right angles
        drawRightAngleStatic(A, D, C, 0.3);
        drawRightAngleStatic(D, E, B, 0.3);
    }

    function drawRightAngleStatic(P1, V, P2, s) {
        const scale = 50;
        let v1 = p5.Vector.sub(P1, V).normalize();
        let v2 = p5.Vector.sub(P2, V).normalize();
        let a = p5.Vector.add(V, p5.Vector.mult(v1, s));
        let b = p5.Vector.add(a, p5.Vector.mult(v2, s));
        let c = p5.Vector.add(V, p5.Vector.mult(v2, s));

        p.line(scale * a.x, scale * a.y, scale * b.x, scale * b.y);
        p.line(scale * b.x, scale * b.y, scale * c.x, scale * c.y);
    }

    function drawSolutionPhases() {
        // PHASE 1: 닮음 찾기 (0-4.0s)
        m_drawPoint(p, F, "F", -10, 10, 0);
        m_segment(p, D, F, 0.2, 1.0);

        // Filled triangles
        drawFilledTriangle(p, B, D, F, 'blue', 1.3, 1.0, false, 100);
        drawFilledTriangle(p, B, C, E, 'red', 2.4, 1.0, false, 100);

        // Angle markers (dots)
        drawAngleDot(p, B, D, F, 3.5, 0.5);
        drawAngleDot(p, B, C, E, 3.5, 0.5);

        // PHASE 2: 추가 닮음 찾기 (4.0-6.6s)
        // 투명도를 높여서 더 옅은 색으로
        // BDE, BCE with fade out at 1.8s (5.8s absolute)
        drawFilledTriangleWithFadeOut(p, B, D, E, 'blue', 4.3, 1.0, 5.8, 0.4, false, 60);
        drawFilledTriangleWithFadeOut(p, B, C, E, 'red', 4.3, 1.0, 5.8, 0.4, true, 60); // emission on stroke

        drawFilledTriangle(p, B, D, F, 'blue', 5.4, 1.0, false, 60);
        drawFilledTriangle(p, D, A, M, 'red', 5.4, 1.0, false, 60);

        drawAngleDot(p, D, A, M, 6.4, 0.2);

        // PHASE 3: 공원점 (6.6-8.8s)
        drawCircleThroughPoints(p, A, C, D, 6.6, 1.5);
        m_drawPoint(p, X, "", 0, 0, 8.2); // X already drawn in problem, no label needed
        m_drawRightAngle(p, C, X, A, 0.3, 8.5);
    }

    function drawFilledTriangle(p, v1, v2, v3, color, phaseStart, phaseDuration, emission = false, maxAlpha = 100) {
        let t = getPhaseProgress(p, phaseStart, phaseDuration);
        if (t < 0) return;

        const scale = 50;
        let alpha = t * maxAlpha; // Semi-transparent

        p.push();
        if (color === 'blue') {
            p.fill(100, 100, 200, alpha);
        } else if (color === 'red') {
            p.fill(200, 100, 100, alpha);
        }

        if (emission) {
            p.stroke(255, 150, 150); // Bright emission effect for stroke
            p.strokeWeight(2);
        } else {
            p.stroke(0);
            p.strokeWeight(1.5);
        }

        p.triangle(
            v1.x * scale, v1.y * scale,
            v2.x * scale, v2.y * scale,
            v3.x * scale, v3.y * scale
        );
        p.pop();
    }

    function drawFilledTriangleWithFadeOut(p, v1, v2, v3, color, phaseStart, phaseDuration, fadeOutStart, fadeOutDuration, emission = false, maxAlpha = 100) {
        let t = getPhaseProgress(p, phaseStart, phaseDuration);
        if (t < 0) return;

        const scale = 50;
        let alpha = t * maxAlpha;

        // Calculate fade out
        let fadeT = getPhaseProgress(p, fadeOutStart, fadeOutDuration);
        if (fadeT >= 0) {
            alpha = alpha * (1 - fadeT); // Fade out
            if (fadeT >= 1) return; // Completely faded
        }

        p.push();
        if (color === 'blue') {
            p.fill(100, 100, 200, alpha);
        } else if (color === 'red') {
            p.fill(200, 100, 100, alpha);
        }

        if (emission) {
            p.stroke(255, 150, 150, alpha); // Bright emission with alpha
            p.strokeWeight(2);
        } else {
            p.stroke(0, alpha);
            p.strokeWeight(1.5);
        }

        p.triangle(
            v1.x * scale, v1.y * scale,
            v2.x * scale, v2.y * scale,
            v3.x * scale, v3.y * scale
        );
        p.pop();
    }

    function drawAngleDot(p, v1, vertex, v2, phaseStart, phaseDuration) {
        let t = getPhaseProgress(p, phaseStart, phaseDuration);
        if (t < 0) return;

        const scale = 50;
        let alpha = t * 255;

        // Calculate angle position
        let dir1 = p5.Vector.sub(v1, vertex).normalize().mult(0.5);
        let dir2 = p5.Vector.sub(v2, vertex).normalize().mult(0.5);
        let avgDir = p5.Vector.add(dir1, dir2).normalize().mult(0.4);
        let dotPos = p5.Vector.add(vertex, avgDir);

        p.push();
        p.fill(0, alpha);
        p.noStroke();
        p.circle(dotPos.x * scale, dotPos.y * scale, 4);
        p.pop();
    }

    function drawCircleThroughPoints(p, p1, p2, p3, phaseStart, phaseDuration) {
        let t = getPhaseProgress(p, phaseStart, phaseDuration);
        if (t < 0) return;

        const scale = 50;

        // Calculate circumcenter and radius
        let center = circumcenter(p1, p2, p3);
        let radius = p5.Vector.dist(center, p1) * scale;

        p.push();
        p.noFill();
        p.stroke(150, 100, 200); // Purple circle
        p.strokeWeight(1.5);

        if (t < 1) {
            p.arc(center.x * scale, center.y * scale, radius * 2, radius * 2, 0, t * 360);
        } else {
            p.circle(center.x * scale, center.y * scale, radius * 2);
        }

        p.pop();
    }

    function circumcenter(p1, p2, p3) {
        // Calculate circumcenter of triangle p1, p2, p3
        let ax = p1.x, ay = p1.y;
        let bx = p2.x, by = p2.y;
        let cx = p3.x, cy = p3.y;

        let d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));

        let ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
        let uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;

        return p.createVector(ux, uy);
    }
};

new p5(sketch);

// Setup UI controls
function setupControls() {
    // Restart button
    document.getElementById('btn-restart').addEventListener('click', () => {
        resetAnimation();
    });

    // Play/Pause button
    const playPauseBtn = document.getElementById('btn-play-pause');
    playPauseBtn.addEventListener('click', () => {
        const paused = togglePause(p5Instance);
        playPauseBtn.textContent = paused ? 'Play' : 'Pause';
    });

    // Mode toggle buttons
    document.getElementById('btn-mode-problem').addEventListener('click', () => {
        if (setMode('problem')) {
            renderPhaseButtons('problem', problemPhaseCount);
            attachPhaseButtonListeners();
            setActiveButton('btn-all');
            setActiveModeButton('btn-mode-problem');
        }
    });

    const solutionBtn = document.getElementById('btn-mode-solution');
    if (solutionBtn && !solutionBtn.disabled) {
        solutionBtn.addEventListener('click', () => {
            if (setMode('solution')) {
                renderPhaseButtons('solution', solutionPhaseCount);
                attachPhaseButtonListeners();
                setActiveButton('btn-all');
                setActiveModeButton('btn-mode-solution');
            }
        });
    }

    // Attach initial phase button listeners
    attachPhaseButtonListeners();
}

function attachPhaseButtonListeners() {
    // All button
    const allBtn = document.getElementById('btn-all');
    if (allBtn) {
        allBtn.replaceWith(allBtn.cloneNode(true)); // Remove old listeners
        document.getElementById('btn-all').addEventListener('click', () => {
            setPhase('all');
            setActiveButton('btn-all');
        });
    }

    // Phase buttons
    const count = getCurrentPhaseCount();
    for (let i = 1; i <= count; i++) {
        const btn = document.getElementById(`btn-phase-${i}`);
        if (btn) {
            btn.replaceWith(btn.cloneNode(true)); // Remove old listeners
            document.getElementById(`btn-phase-${i}`).addEventListener('click', () => {
                setPhase(i);
                setActiveButton(`btn-phase-${i}`);
            });
        }
    }
}

function setActiveButton(activeId) {
    // Remove active class from all phase buttons
    document.getElementById('btn-all').classList.remove('active');
    const count = getCurrentPhaseCount();
    for (let i = 1; i <= count; i++) {
        const btn = document.getElementById(`btn-phase-${i}`);
        if (btn) btn.classList.remove('active');
    }
    // Add active class to clicked button
    const activeBtn = document.getElementById(activeId);
    if (activeBtn) activeBtn.classList.add('active');
}

function setActiveModeButton(activeId) {
    document.getElementById('btn-mode-problem').classList.remove('active');
    document.getElementById('btn-mode-solution').classList.remove('active');
    document.getElementById(activeId).classList.add('active');
}
