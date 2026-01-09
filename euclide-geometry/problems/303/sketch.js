// Problem 008: 수심의 성질
// 문제 기술 단계만 구현 (Phase 1, 2)

let p5Instance;

const sketch = (p) => {
    // Points
    let A, B, C, O, D, E;
    let circumcircleCenter, circumcircleRadius;

    // Animation objects
    let prob = {};  // Problem phases

    p5Instance = p;
    window._p5Instance = p;

    p.setup = () => {
        const canvas = p.createCanvas(800, 600);
        canvas.parent('canvas-wrapper');
        p.angleMode(p.DEGREES);

        // Base points - 원의 중심과 원 위의 점들 (극좌표)
        // tkz-euclide: \tkzDefPoint(0,0){O}, \tkzDefPoint(68:3){A}, etc.
        O = p.createVector(0, 0);
        A = p.createVector(3 * p.cos(68), 3 * p.sin(68));
        B = p.createVector(3 * p.cos(-128), 3 * p.sin(-128));
        C = p.createVector(3 * p.cos(-52), 3 * p.sin(-52));

        // 외접원 Ω: 삼각형 BCO의 외접원
        circumcircleCenter = getCircumcenter(B, C, O);
        circumcircleRadius = p5.Vector.dist(circumcircleCenter, O);

        // D: AB와 원 Ω의 교점 (B가 아닌 점)
        let intersectAB = circleLineIntersection(
            circumcircleCenter,
            circumcircleRadius,
            A,
            B
        );
        // B로부터 더 먼 점을 선택 (B가 아닌 점이 D)
        D = p5.Vector.dist(intersectAB[0], B) > p5.Vector.dist(intersectAB[1], B)
            ? intersectAB[0]
            : intersectAB[1];

        // E: AC와 원 Ω의 교점 (C가 아닌 점)
        let intersectAC = circleLineIntersection(
            circumcircleCenter,
            circumcircleRadius,
            A,
            C
        );
        // C로부터 더 먼 점을 선택 (C가 아닌 점이 E)
        E = p5.Vector.dist(intersectAC[0], C) > p5.Vector.dist(intersectAC[1], C)
            ? intersectAC[0]
            : intersectAC[1];

        // Calculate scale from all points
        calculateScaleFromPoints([A, B, C, O, D, E], p.width, p.height, 60);

        initAnimations();
        resetAnimation();
    };

    function initAnimations() {
        // ===== Phase 1: 기본 원과 점들 =====
        // 삼각형 ABC
        prob.segAB = new MSegment(p, A, B);
        prob.segBC = new MSegment(p, B, C);
        prob.segCA = new MSegment(p, C, A);

        // 점 A, B, C (tkz-euclide 레이블 위치 기준)
        prob.pointA = new MPoint(p, A, "A", 0, 15);        // above
        prob.pointB = new MPoint(p, B, "B", -15, -10);     // below left
        prob.pointC = new MPoint(p, C, "C", 15, -10);      // below right

        // 점 O와 원 O
        prob.pointO = new MPoint(p, O, "O", 5, -15);       // below
        prob.circleO = new MCircle(p, O, 3, {
            color: [150, 150, 150],
            weight: 1.5
        });

        // ===== Phase 2: 외접원 Ω와 교점 =====
        prob.circleOmega = new MCircle(p, circumcircleCenter, circumcircleRadius, {
            color: [100, 100, 200]
        });

        // 점 D, E (tkz-euclide 레이블 위치 기준)
        prob.pointD = new MPoint(p, D, "D", -15, 0);       // left
        prob.pointE = new MPoint(p, E, "E", 15, 0);        // right
    }

    function resetAllAnimations() {
        Object.values(prob).forEach(obj => obj.reset());
    }

    const originalResetAnimation = window.resetAnimation;
    window.resetAnimation = function() {
        if (originalResetAnimation) originalResetAnimation();
        if (Object.keys(prob).length > 0) {
            resetAllAnimations();
        }
    };

    function drawProblemPhases() {
        // Phase 1: 삼각형 ABC (duration: 1.5)
        prob.segAB.display(0.5);
        prob.segBC.display(0.5);
        prob.segCA.display(0.5);

        // 점 A, B, C (duration: 0.3)
        if (prob.segCA.completed) {
            prob.pointA.display(0.1);
            prob.pointB.display(0.1);
            prob.pointC.display(0.1);
        }

        // 점 O (duration: 0.3)
        if (prob.pointC.completed) {
            prob.pointO.display(0.3);
        }

        // 원 O (duration: 2.0)
        if (prob.pointO.completed) {
            prob.circleO.display(2.0);
        }

        // Phase 2: 외접원 Ω (duration: 1.5)
        if (prob.circleO.completed) {
            prob.circleOmega.display(1.5);
        }

        // 점 D, E (duration: 0.3)
        if (prob.circleOmega.completed) {
            prob.pointD.display(0.15);
            prob.pointE.display(0.15);
        }
    }

    function drawProblemPhaseOnly(phaseNum) {
        switch (phaseNum) {
            case 1:
                // Phase 1: 삼각형 ABC, 점 A,B,C,O, 원 O
                prob.segAB.displayStatic();
                prob.segBC.displayStatic();
                prob.segCA.displayStatic();
                prob.pointA.displayStatic();
                prob.pointB.displayStatic();
                prob.pointC.displayStatic();
                prob.pointO.displayStatic();
                prob.circleO.displayStatic();
                break;
            case 2:
                // Phase 2: Phase 1 + 외접원 Ω, 점 D, E
                prob.segAB.displayStatic();
                prob.segBC.displayStatic();
                prob.segCA.displayStatic();
                prob.pointA.displayStatic();
                prob.pointB.displayStatic();
                prob.pointC.displayStatic();
                prob.pointO.displayStatic();
                prob.circleO.displayStatic();
                prob.circleOmega.displayStatic();
                prob.pointD.displayStatic();
                prob.pointE.displayStatic();
                break;
        }
    }

    function drawProblemStatic() {
        Object.values(prob).forEach(obj => obj.displayStatic());
    }

    function drawSolutionPhases() {
        // TODO: Solution phases will be implemented later
        drawProblemStatic();
    }

    function drawSolutionPhaseOnly(phaseNum) {
        // TODO: Solution phases will be implemented later
        drawProblemStatic();
    }

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
        } else if (currentMode === 'solution') {
            if (phase === 'all') {
                drawSolutionPhases();
            } else {
                drawSolutionPhaseOnly(phase);
            }
        }

        p.pop();
    };
};

new p5(sketch);
