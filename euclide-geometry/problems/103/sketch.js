// Problem 006: 각의 이등분과 비율
// 클래스 기반 애니메이션

let p5Instance;

const sketch = (p) => {
    // Points
    let A, B, C, D, M, E, P;

    // Animation objects
    let prob = {};  // Problem phases
    let sol = {};   // Solution phases

    p5Instance = p;
    window._p5Instance = p;

    p.setup = () => {
        const canvas = p.createCanvas(800, 600);
        canvas.parent('canvas-wrapper');
        p.angleMode(p.DEGREES);

        // Base points - 정사각형 ABCD
        A = p.createVector(-2, 2);
        B = p.createVector(-2, -2);
        C = p.createVector(2, -2);
        D = p.createVector(2, 2);

        // M: CD의 중점
        M = p5.Vector.lerp(C, D, 0.5);

        // E: AD를 3:1로 내분 (D쪽이 3)
        E = p5.Vector.lerp(A, D, 0.75);

        // P: AM과 BE의 교점
        P = intersectLines(A, M, B, E);

        // Calculate scale from all points
        calculateScaleFromPoints([A, B, C, D, M, E, P], p.width, p.height, 60);

        initAnimations();
        resetAnimation();
    };

    function initAnimations() {
        // ===== Problem Phases =====
        // Phase 1: 정사각형 ABCD
        prob.pointA = new MPoint(p, A, "A", -15, 15);
        prob.pointB = new MPoint(p, B, "B", -15, -10);
        prob.pointC = new MPoint(p, C, "C", 10, -10);
        prob.pointD = new MPoint(p, D, "D", 10, 15);

        prob.segAB = new MSegment(p, A, B);
        prob.segBC = new MSegment(p, B, C);
        prob.segCD = new MSegment(p, C, D);
        prob.segDA = new MSegment(p, D, A);

        // Phase 2: 중점 M과 점 E
        prob.pointM = new MPoint(p, M, "M", 15, 0);
        prob.pointE = new MPoint(p, E, "E", -15, 15);
        prob.segBE = new MSegment(p, B, E, { color: [100, 100, 200] });
        prob.segEM = new MSegment(p, E, M, { color: [100, 100, 200] });

        // Phase 3: 교점 P와 보조선
        prob.segAM = new MSegment(p, A, M, { color: [200, 100, 100] });
        prob.pointP = new MPoint(p, P, "P", 0, -15);
        prob.angleBEM = new MAngleDot(p, B, E, M, { distance: 0.3, size: 4 });
        prob.angleDEM = new MAngleDot(p, D, E, M, { distance: 0.3, size: 4 });

        // ===== Solution Phases =====
        // TODO: Solution phases will be added later
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
        // Phase 1: 정사각형 ABCD
        prob.pointA.display(0.2);
        prob.pointB.display(0.2);
        prob.pointC.display(0.2);
        prob.pointD.display(0.2);

        if (prob.pointD.completed) {
            prob.segAB.display(0.4);
        }
        if (prob.segAB.completed) {
            prob.segBC.display(0.4);
        }
        if (prob.segBC.completed) {
            prob.segCD.display(0.4);
        }
        if (prob.segCD.completed) {
            prob.segDA.display(0.4);
        }

        // Phase 2: 중점 M과 점 E
        if (prob.segDA.completed) {
            prob.pointM.display(0.2);
        }
        if (prob.pointM.completed) {
            prob.pointE.display(0.2);
        }
        if (prob.pointE.completed) {
            prob.segBE.display(0.6);
        }
        if (prob.segBE.completed) {
            prob.segEM.display(0.6);
        }

        // Phase 3: 교점 P와 보조선
        if (prob.segEM.completed) {
            prob.segAM.display(0.5);
        }
        if (prob.segAM.completed) {
            prob.pointP.display(0.2);
        }
        if (prob.pointP.completed) {
            prob.angleBEM.display(0.3);
        }
        if (prob.angleBEM.completed) {
            prob.angleDEM.display(0.3);
        }
    }

    // ===== Problem Static =====
    function drawProblemStatic() {
        prob.pointA.displayStatic();
        prob.pointB.displayStatic();
        prob.pointC.displayStatic();
        prob.pointD.displayStatic();
        prob.segAB.displayStatic();
        prob.segBC.displayStatic();
        prob.segCD.displayStatic();
        prob.segDA.displayStatic();
        prob.pointM.displayStatic();
        prob.pointE.displayStatic();
        prob.segBE.displayStatic();
        prob.segEM.displayStatic();
        prob.segAM.displayStatic();
        prob.pointP.displayStatic();
        prob.angleBEM.displayStatic();
        prob.angleDEM.displayStatic();
    }

    // ===== Problem Phase Only =====
    function drawProblemPhaseOnly(phase) {
        if (phase === 1) {
            // Phase 1 animation
            prob.pointA.display(0.2);
            prob.pointB.display(0.2);
            prob.pointC.display(0.2);
            prob.pointD.display(0.2);

            if (prob.pointD.completed) prob.segAB.display(0.4);
            if (prob.segAB.completed) prob.segBC.display(0.4);
            if (prob.segBC.completed) prob.segCD.display(0.4);
            if (prob.segCD.completed) prob.segDA.display(0.4);
        } else if (phase === 2) {
            // Phase 1 static
            prob.pointA.displayStatic();
            prob.pointB.displayStatic();
            prob.pointC.displayStatic();
            prob.pointD.displayStatic();
            prob.segAB.displayStatic();
            prob.segBC.displayStatic();
            prob.segCD.displayStatic();
            prob.segDA.displayStatic();

            // Phase 2 animation
            prob.pointM.display(0.2);
            if (prob.pointM.completed) prob.pointE.display(0.2);
            if (prob.pointE.completed) prob.segBE.display(0.6);
            if (prob.segBE.completed) prob.segEM.display(0.6);
        } else if (phase === 3) {
            // Phases 1-2 static
            prob.pointA.displayStatic();
            prob.pointB.displayStatic();
            prob.pointC.displayStatic();
            prob.pointD.displayStatic();
            prob.segAB.displayStatic();
            prob.segBC.displayStatic();
            prob.segCD.displayStatic();
            prob.segDA.displayStatic();
            prob.pointM.displayStatic();
            prob.pointE.displayStatic();
            prob.segBE.displayStatic();
            prob.segEM.displayStatic();

            // Phase 3 animation
            prob.segAM.display(0.5);
            if (prob.segAM.completed) prob.pointP.display(0.2);
            if (prob.pointP.completed) prob.angleBEM.display(0.3);
            if (prob.angleBEM.completed) prob.angleDEM.display(0.3);
        }
    }

    // ===== Solution Phases =====
    function drawSolutionPhases() {
        // TODO: Solution phases will be added later
    }

    // ===== Solution Phase Only =====
    function drawSolutionPhaseOnly(phase) {
        // TODO: Solution phases will be added later
    }
};

new p5(sketch);
