// Problem 005: 닮음 옮기기
// 클래스 기반 애니메이션

let p5Instance;

const sketch = (p) => {
    // Points
    let A, B, C, D, E, F, G;

    // Animation objects
    let prob = {};  // Problem phases
    let sol = {};   // Solution phases

    p5Instance = p;
    window._p5Instance = p;

    p.setup = () => {
        const canvas = p.createCanvas(800, 600);
        canvas.parent('canvas-wrapper');
        p.angleMode(p.DEGREES);

        // Base points - 평행사변형 ABCD
        A = p.createVector(0, 0);
        B = p.createVector(3, 0);
        C = p.createVector(4, 1.5);
        D = p.createVector(1, 1.5);

        // F: CD를 2:1로 내분 (C쪽이 2)
        F = p5.Vector.lerp(D, C, 2/3);

        // E: BD와 AF의 교점
        E = intersectLines(B, D, A, F);

        // G: BC 연장선과 AF의 교점
        G = intersectLines(B, C, A, F);

        // Calculate scale from all points
        calculateScaleFromPoints([A, B, C, D, E, F, G], p.width, p.height, 60);

        initAnimations();
        resetAnimation();
    };

    function initAnimations() {
        // ===== Problem Phases =====
        // Phase 1: 평행사변형 ABCD
        prob.pointA = new MPoint(p, A, "A", -15, 15);
        prob.pointB = new MPoint(p, B, "B", 10, 15);
        prob.pointC = new MPoint(p, C, "C", 10, -10);
        prob.pointD = new MPoint(p, D, "D", -15, -10);

        prob.segAB = new MSegment(p, A, B);
        prob.segBC = new MSegment(p, B, C);
        prob.segCD = new MSegment(p, C, D);
        prob.segDA = new MSegment(p, D, A);

        // Phase 2: 점 F와 대각선
        prob.pointF = new MPoint(p, F, "F", 0, -15);
        prob.diagBD = new MSegment(p, B, D, { color: [128, 128, 128] });
        prob.lineAF = new MSegment(p, A, G, { color: [100, 100, 200] });

        // Phase 3: 교점 E, G
        prob.pointE = new MPoint(p, E, "E", -15, -10);
        prob.extBC = new MSegment(p, C, G, { color: [128, 128, 128], dashed: true });
        prob.pointG = new MPoint(p, G, "G", 10, 5);

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
        // Phase 1: 평행사변형 ABCD
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

        // Phase 2: 점 F와 대각선
        if (prob.segDA.completed) {
            prob.pointF.display(0.2);
        }
        if (prob.pointF.completed) {
            prob.diagBD.display(0.6);
        }
        if (prob.diagBD.completed) {
            prob.lineAF.display(0.8);
        }

        // Phase 3: 교점 E, G
        if (prob.lineAF.completed) {
            prob.pointE.display(0.2);
        }
        if (prob.pointE.completed) {
            prob.extBC.display(0.5);
        }
        if (prob.extBC.completed) {
            prob.pointG.display(0.2);
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
        prob.pointF.displayStatic();
        prob.diagBD.displayStatic();
        prob.lineAF.displayStatic();
        prob.pointE.displayStatic();
        prob.extBC.displayStatic();
        prob.pointG.displayStatic();
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
            prob.pointF.display(0.2);
            if (prob.pointF.completed) prob.diagBD.display(0.6);
            if (prob.diagBD.completed) prob.lineAF.display(0.8);
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
            prob.pointF.displayStatic();
            prob.diagBD.displayStatic();
            prob.lineAF.displayStatic();

            // Phase 3 animation
            prob.pointE.display(0.2);
            if (prob.pointE.completed) prob.extBC.display(0.5);
            if (prob.extBC.completed) prob.pointG.display(0.2);
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
