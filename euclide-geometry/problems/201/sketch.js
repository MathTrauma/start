// Problem 010: 접선과 각의 이등분
// 클래스 기반 애니메이션

let p5Instance;

const sketch = (p) => {
    // Points
    let A, B, C, O, D, E;

    // Animation objects
    let prob = {};  // Problem phases
    let sol = {};   // Solution phases

    p5Instance = p;
    window._p5Instance = p;

    p.setup = () => {
        const canvas = p.createCanvas(800, 600);
        canvas.parent('canvas-wrapper');
        p.angleMode(p.DEGREES);

        // Base points - 각도로 정의된 점들
        let radius = 3;
        B = p.createVector(
            radius * p.cos(-128),
            radius * p.sin(-128)
        );
        C = p.createVector(
            radius * p.cos(-52),
            radius * p.sin(-52)
        );
        A = p.createVector(
            radius * p.cos(90),
            radius * p.sin(90)
        );

        // O: 삼각형 ABC의 외심
        O = getCircumcenter(A, B, C);

        // D: B에서의 접선과 직선 AC의 교점
        // BO에 수직인 방향 (접선 방향)
        let dirBO = p5.Vector.sub(O, B);
        let perpBO = p.createVector(-dirBO.y, dirBO.x).normalize();
        let tangentPoint = p5.Vector.add(B, perpBO);

        // 접선과 AC의 교점
        D = intersectLines(B, tangentPoint, A, C);

        // E: D를 BC에 대해 대칭이동한 점과 B를 잇는 직선과 AC의 교점
        let reflectedD = reflectPoint(D, B, C);
        E = intersectLines(B, reflectedD, A, C);

        // Calculate scale from all points
        calculateScaleFromPoints([A, B, C, O, D, E], p.width, p.height, 60);

        initAnimations();
        resetAnimation();
    };

    function initAnimations() {
        // ===== Problem Phases =====
        // Phase 1: 이등변삼각형 ABC와 외접원
        prob.pointA = new MPoint(p, A, "A", 0, 20);
        prob.pointB = new MPoint(p, B, "B", -20, -15);
        prob.pointC = new MPoint(p, C, "C", 15, -15);

        prob.segAB = new MSegment(p, A, B);
        prob.segBC = new MSegment(p, B, C);
        prob.segCA = new MSegment(p, C, A);

        let radiusO = p5.Vector.dist(O, A);
        prob.circleO = new MCircle(p, O, radiusO, { color: [100, 100, 200] });

        // Phase 2: 접선과 점 D
        // 접선 그리기 (B에서 D 방향으로)
        prob.tangent = new MSegment(p, B, D, { color: [200, 100, 100] });
        prob.pointD = new MPoint(p, D, "D", -20, 20);
        prob.segCD = new MSegment(p, C, D);

        // Phase 3: 각의 이등분과 점 E
        prob.segBE = new MSegment(p, B, E, { color: [100, 200, 100], dashed: true });
        prob.pointE = new MPoint(p, E, "E", 15, 10);
        prob.angleDBC = new MAngleDot(p, D, B, C, { distance: 0.35, size: 4 });
        prob.angleCBE = new MAngleDot(p, C, B, E, { distance: 0.35, size: 4 });

        // ===== Solution Phases =====
        // Phase 1: 접현각 표시
        sol.angleBAC = new MAngleDot(p, B, A, C, { distance: 0.4, size: 4 });
        sol.angleDBC_sol = new MAngleDot(p, D, B, C, { distance: 0.35, size: 4 });

        // Phase 2: 닮음 삼각형 강조
        sol.triABC = new MFadingTriangle(p, A, B, C, {
            fillColor: COLORS.TRIANGLE_BLUE,
            maxAlpha: COLORS.ALPHA_LIGHT,
            emission: true,
            emissionColor: COLORS.EMISSION_BLUE
        });
        sol.triBCE = new MFadingTriangle(p, B, C, E, {
            fillColor: COLORS.TRIANGLE_RED,
            maxAlpha: COLORS.ALPHA_LIGHT,
            emission: true,
            emissionColor: COLORS.EMISSION_RED
        });
    }

    function resetAllAnimations() {
        Object.values(prob).forEach(obj => obj.reset());
        Object.values(sol).forEach(obj => obj.reset());
    }

    const originalResetAnimation = window.resetAnimation;
    window.resetAnimation = function() {
        if (originalResetAnimation) originalResetAnimation();
        if (Object.keys(prob).length > 0) {
            resetAllAnimations();
        }
    };

    p.draw = () => {
        p.background(255);

        p.push();
        p.translate(p.width / 2, p.height / 2);
        p.scale(1, -1);

        const currentMode = getCurrentMode();
        const phase = selectedPhase;

        if (currentMode === 'problem') {
            if (phase === 'all') {
                drawProblemPhases();
            } else {
                drawProblemPhaseOnly(phase);
            }
        } else {
            drawProblemStatic();
            if (phase === 'all') {
                drawSolutionPhases();
            } else {
                drawSolutionPhaseOnly(phase);
            }
        }

        p.pop();
    };

    // ===== Problem Phases =====
    function drawProblemPhases() {
        // Phase 1: 이등변삼각형 ABC와 외접원
        prob.pointA.display(0.2);
        prob.pointB.display(0.2);
        prob.pointC.display(0.2);

        if (prob.pointC.completed) {
            prob.segAB.display(0.6);
        }
        if (prob.segAB.completed) {
            prob.segBC.display(0.6);
        }
        if (prob.segBC.completed) {
            prob.segCA.display(0.6);
        }
        if (prob.segCA.completed) {
            prob.circleO.display(1.0);
        }

        // Phase 2: 접선과 점 D
        if (prob.circleO.completed) {
            prob.tangent.display(0.6);
        }
        if (prob.tangent.completed) {
            prob.pointD.display(0.2);
        }
        if (prob.pointD.completed) {
            prob.segCD.display(0.6);
        }

        // Phase 3: 각의 이등분과 점 E
        if (prob.segCD.completed) {
            prob.segBE.display(0.8);
        }
        if (prob.segBE.completed) {
            prob.pointE.display(0.2);
        }
        if (prob.pointE.completed) {
            prob.angleDBC.display(0.2);
            prob.angleCBE.display(0.2);
        }
    }

    // ===== Problem Static =====
    function drawProblemStatic() {
        prob.pointA.displayStatic();
        prob.pointB.displayStatic();
        prob.pointC.displayStatic();
        prob.segAB.displayStatic();
        prob.segBC.displayStatic();
        prob.segCA.displayStatic();
        prob.circleO.displayStatic();
        prob.tangent.displayStatic();
        prob.pointD.displayStatic();
        prob.segCD.displayStatic();
        prob.segBE.displayStatic();
        prob.pointE.displayStatic();
        prob.angleDBC.displayStatic();
        prob.angleCBE.displayStatic();
    }

    // ===== Problem Phase Only =====
    function drawProblemPhaseOnly(phase) {
        if (phase === 1) {
            // Phase 1 animation
            prob.pointA.display(0.2);
            prob.pointB.display(0.2);
            prob.pointC.display(0.2);

            if (prob.pointC.completed) prob.segAB.display(0.6);
            if (prob.segAB.completed) prob.segBC.display(0.6);
            if (prob.segBC.completed) prob.segCA.display(0.6);
            if (prob.segCA.completed) prob.circleO.display(1.0);
        } else if (phase === 2) {
            // Phase 1 static
            prob.pointA.displayStatic();
            prob.pointB.displayStatic();
            prob.pointC.displayStatic();
            prob.segAB.displayStatic();
            prob.segBC.displayStatic();
            prob.segCA.displayStatic();
            prob.circleO.displayStatic();

            // Phase 2 animation
            prob.tangent.display(0.6);
            if (prob.tangent.completed) prob.pointD.display(0.2);
            if (prob.pointD.completed) prob.segCD.display(0.6);
        } else if (phase === 3) {
            // Phases 1-2 static
            prob.pointA.displayStatic();
            prob.pointB.displayStatic();
            prob.pointC.displayStatic();
            prob.segAB.displayStatic();
            prob.segBC.displayStatic();
            prob.segCA.displayStatic();
            prob.circleO.displayStatic();
            prob.tangent.displayStatic();
            prob.pointD.displayStatic();
            prob.segCD.displayStatic();

            // Phase 3 animation
            prob.segBE.display(0.8);
            if (prob.segBE.completed) prob.pointE.display(0.2);
            if (prob.pointE.completed) {
                prob.angleDBC.display(0.2);
                prob.angleCBE.display(0.2);
            }
        }
    }

    // ===== Solution Phases =====
    function drawSolutionPhases() {
        // Phase 1: 접현각 표시
        sol.angleBAC.display(0.5);
        if (sol.angleBAC.completed) {
            sol.angleDBC_sol.display(0.5);
        }

        // Phase 2: 닮음 삼각형 강조
        if (sol.angleDBC_sol.completed) {
            sol.triABC.display(1.5);
        }
        if (sol.triABC.completed) {
            sol.triBCE.display(1.5);
        }
    }

    // ===== Solution Phase Only =====
    function drawSolutionPhaseOnly(phase) {
        if (phase === 1) {
            // Phase 1 animation
            sol.angleBAC.display(0.5);
            if (sol.angleBAC.completed) {
                sol.angleDBC_sol.display(0.5);
            }
        } else if (phase === 2) {
            // Phase 1 static
            sol.angleBAC.displayStatic();
            sol.angleDBC_sol.displayStatic();

            // Phase 2 animation
            sol.triABC.display(1.5);
            if (sol.triABC.completed) sol.triBCE.display(1.5);
        }
    }
};

new p5(sketch);
