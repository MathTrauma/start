// sketch_002.js - 등적변환
import p5 from 'p5';
import { Animator } from '../../lib/animator.js';
import { TPoint, TSegment, TPolygon, TRightAngle, TAngleMarker, TCircle } from '../../lib/t_object.js';
import { calculateScaleFromPoints, applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { intersectLines } from '../../lib/geometry.js';

const sketch = (p) => {
    let animator;
    let isAutoPlay = false;
    let A, B, C, D, M, N, O, E, F, G, H;
    let allPoints = [];
    
    // Global reference for legacy compatibility
    window._p5Instance = p;
    
    // Problem Phase Objects
    let polyABCD, pA, pB, pC, pD;
    let segAC, segBD, pM, pN;
    let segMO, segNO, pO;
    let segOE, segOF, segOG, segOH;
    let pE, pF, pG, pH;
    
    // Solution Phase Objects
    let triGHD, triGHO;
    let triDNG, triDNH; // Solution 2
    let triGFC, triGFO; // Solution 3

    p.setup = () => {
        const size = getCanvasSize(800, 20);
        p.createCanvas(size, size).parent('canvas-wrapper');
        p.pixelDensity(1);
        animator = new Animator(p);

        // Theme 적용
        const params = new URLSearchParams(window.location.search);
        const currentTheme = params.get('theme') || 'light';
        applyTheme(p, currentTheme);

        // 1. 기하학 구조 정의
        A = p.createVector(-2, -2);
        B = p.createVector(3, -2);
        C = p.createVector(1, 2.3);
        D = p.createVector(-1.25, 1.4);

        // M: 대각선 AC의 중점
        M = p5.Vector.add(A, C).mult(0.5);
        // N: 대각선 BD의 중점
        N = p5.Vector.add(B, D).mult(0.5);

        // O: M을 지나고 BD에 평행한 직선과 N을 지나고 AC에 평행한 직선의 교점
        const dirBD = p5.Vector.sub(D, B);
        const pointOnLine1 = p5.Vector.add(M, dirBD);

        const dirAC = p5.Vector.sub(C, A);
        const pointOnLine2 = p5.Vector.add(N, dirAC);

        O = intersectLines(M, pointOnLine1, N, pointOnLine2);

        // E,F,G,H: 각 변의 중점
        E = p5.Vector.add(A, B).mult(0.5);
        F = p5.Vector.add(B, C).mult(0.5);
        G = p5.Vector.add(C, D).mult(0.5);
        H = p5.Vector.add(D, A).mult(0.5);

        // Auto-Scale
        allPoints = [A, B, C, D, O];
        calculateScaleFromPoints(p, allPoints, p.width, p.height, 60);

        // Theme 접근
        const t = p.theme;

        // ===== Problem Phase Objects =====
        
        // Phase 1: 사각형 ABCD
        pA = new TPoint(p, A, "A", { dx: -15, dy: -5 });
        pB = new TPoint(p, B, "B", { dx: 15, dy: -5 });
        pC = new TPoint(p, C, "C", { dx: 5, dy: 15 });
        pD = new TPoint(p, D, "D", { dx: -15, dy: 10 });
        polyABCD = new TPolygon(p, [A, B, C, D], { color: t.stroke, weight: 2 });
        
        // Phase 2: 두 대각선과 그 중점들, O
        segAC = new TSegment(p, A, C, { color: t.auxiliary, dashed: true });
        segBD = new TSegment(p, B, D, { color: t.auxiliary, dashed: true });
        pM = new TPoint(p, M, "M", { dx: 5, dy: 10 });
        pN = new TPoint(p, N, "N", { dx: 5, dy: -15 });
        segMO = new TSegment(p, M, O, { color: t.stroke, dashed: true });
        segNO = new TSegment(p, N, O, { color: t.stroke, dashed: true });
        pO = new TPoint(p, O, "O", { dx: 5, dy: 5 });
        
        // Phase 3: O에서 각 중점으로
        pE = new TPoint(p, E, "E", { dx: 0, dy: -15 });
        pF = new TPoint(p, F, "F", { dx: 15, dy: 0 });
        pG = new TPoint(p, G, "G", { dx: 0, dy: 15 });
        pH = new TPoint(p, H, "H", { dx: -15, dy: 0 });
        
        segOE = new TSegment(p, O, E, { color: t.fillRed, weight: 2 });
        segOF = new TSegment(p, O, F, { color: t.fillRed, weight: 2 });
        segOG = new TSegment(p, O, G, { color: t.fillRed, weight: 2 });
        segOH = new TSegment(p, O, H, { color: t.fillRed, weight: 2 });

        // ===== Solution Phase Objects =====

        // Solution Phase 1: GHD & GHO -> GHN (Corrected from GDN)
        triGHD = new TPolygon(p, [G, H, D], {
            filled: true,
            fillColor: [...t.fillBlue.slice(0, 3), 50],
            color: t.stroke
        });
        triGHO = new TPolygon(p, [G, H, O], {
            filled: true,
            fillColor: [...t.fillRed.slice(0, 3), 50],
            color: t.stroke
        });
        
        // Solution Phase 2: DNG & DNH (Different decomposition)
        triDNG = new TPolygon(p, [D, N, G], {
            filled: true,
            fillColor: [...t.fillBlue.slice(0, 3), 50],
            color: t.stroke
        });
        triDNH = new TPolygon(p, [D, N, H], {
            filled: true,
            fillColor: [...t.fillBlue.slice(0, 3), 50],
            color: t.stroke
        });

        // Solution Phase 3: GFC & GFO -> GFM (Corrected from GDN)
        triGFC = new TPolygon(p, [G, F, C], {
            filled: true,
            fillColor: [...t.fillBlue.slice(0, 3), 50],
            color: t.stroke
        });
        triGFO = new TPolygon(p, [G, F, O], {
             filled: true,
             fillColor: [...t.fillRed.slice(0, 3), 50],
             color: t.stroke
        });


        // ===== 시퀀스 등록 =====
        
        // Problem Phases
        animator.registerSequence("prob-1", [
            { target: polyABCD, duration: 1.5 },
            { group: [{ target: pA }, { target: pB }, { target: pC }, { target: pD }], duration: 0.3 }
        ]);
        
        animator.registerSequence("prob-2", [
            { group: [{ target: segAC }, { target: segBD }], duration: 1.0 },
            { group: [{ target: pM }, { target: pN }], duration: 0.3 },
            { group: [{ target: segMO }, { target: segNO }], duration: 0.5 },
            { target: pO, duration: 0.2 }
        ]);
        
        animator.registerSequence("prob-3", [
            { group: [
                { target: segOE }, { target: segOF }, { target: segOG }, { target: segOH },
                { target: pE }, { target: pF }, { target: pG }, { target: pH }
            ], duration: 1.0 }
        ]);
        
        // Solution Phases
        animator.registerSequence("sol-1", [
            { group: [
                { target: triGHD },
                { target: triGHO }
            ], duration: 1.5 },
             { group: [
                { target: triGHD, mode: 'travel', duration: 2.0 },
                { target: triGHO, mode: 'travel', duration: 2.0 }
            ]},
            { target: triGHO, morphTo: [G, H, N], duration: 1.5 }, // Corrected target: GHN
            { target: null, duration: 0.5 }
        ]);

        animator.registerSequence("sol-2", [
            { group: [
                { target: triGHD, mode: 'fadeOut', duration: 0.3 },
                { target: triGHO, mode: 'fadeOut', duration: 0.3 } 
            ]},
            { group: [
                { target: triDNG },
                { target: triDNH }
            ], duration: 1.5 },
            { group: [
                { target: triDNG, mode: 'pulse', duration: 1.0 },
                { target: triDNH, mode: 'pulse', duration: 1.0 }
            ]},
             { group: [
                { target: triDNG, mode: 'travel', duration: 1.0 },
                { target: triDNH, mode: 'travel', duration: 1.0 }
            ]},
            { target: null, duration: 0.5 }
        ]);

        animator.registerSequence("sol-3", [
            { group: [
                { target: triDNG, mode: 'fadeOut', duration: 0.3 },
                { target: triDNH, mode: 'fadeOut', duration: 0.3 }
            ]},
            { group: [
                { target: triGFC },
                { target: triGFO }
            ], duration: 1.5 },
            { target: triGFO, morphTo: [G, F, M], duration: 1.5 } // Corrected target: GFM
        ]);


        // playPhase 함수 등록
        window.playPhase = (name) => {
            const phases = [
                'prob-1', 'prob-2', 'prob-3',
                'sol-1', 'sol-2', 'sol-3'
            ];

            const idx = phases.indexOf(name);

            if (idx === -1) {
                console.warn(`Phase '${name}' not found.`);
                return;
            }

            let opts = {};
            if (idx > 0) {
                opts.precursors = phases.slice(0, idx);
            }

            animator.play(name, opts);
        };

        // 초기 phase 실행
        isAutoPlay = true;
        window.playPhase("prob-1");
        
        // Legacy compatibility
        window.p5Instance = p;
        window.resetAnimation = () => {
            isAutoPlay = true;
            window.playPhase('prob-1');
        }
        window.togglePause = () => {
            animator.isPaused = !animator.isPaused;
            return animator.isPaused;
        };
        window.setMode = (mode) => {
            if (mode === 'problem') {
                window.playPhase('prob-1');
                return true;
            } else if (mode === 'solution') {
                window.playPhase('sol-1');
                return true;
            }
            return false;
        };
        window.getCurrentMode = () => {
            if (!animator.currentSequenceName) return 'problem';
            return animator.currentSequenceName.startsWith('sol-') ? 'solution' : 'problem';
        };
        window.setPhase = (phase) => {
            const currentMode = window.getCurrentMode();
            if (phase === 'all') {
                isAutoPlay = true;
                window.playPhase(currentMode === 'problem' ? 'prob-1' : 'sol-1');
            } else {
                isAutoPlay = false;
                const phaseName = currentMode === 'problem' ? `prob-${phase}` : `sol-${phase}`;
                window.playPhase(phaseName);
            }
        };
        window.getCurrentPhaseCount = () => {
            const currentMode = window.getCurrentMode();
            return currentMode === 'problem' ? 3 : 3;
        };
        window.problemPhaseCount = 3;
        window.solutionPhaseCount = 3;
    };

    p.draw = () => {
        p.background(p.theme.background);
        p.push();
        p.translate(p.width / 2, p.height / 2); // Center 0,0
        p.scale(1, -1);
        animator.updateAndDraw();
        p.pop();
        
        // Auto-play Logic
        if (isAutoPlay) {
            const problemPhases = ['prob-1', 'prob-2', 'prob-3'];
            const solutionPhases = ['sol-1', 'sol-2', 'sol-3'];
            const currentSeqName = animator.currentSequenceName;
            
            const probIdx = problemPhases.indexOf(currentSeqName);
            if (probIdx >= 0 && probIdx < problemPhases.length - 1) {
                if (isSequenceComplete(currentSeqName)) {
                    window.playPhase(problemPhases[probIdx + 1]);
                }
            }
            
            const solIdx = solutionPhases.indexOf(currentSeqName);
            if (solIdx >= 0 && solIdx < solutionPhases.length - 1) {
                if (isSequenceComplete(currentSeqName)) {
                    const nextPhaseIndex = solIdx + 1;
                    window.playPhase(solutionPhases[nextPhaseIndex]);
                    if (typeof updateProblemText === 'function' && typeof globalPaddedId !== 'undefined') {
                        updateProblemText('solution', nextPhaseIndex + 1, globalPaddedId, globalBaseUrl);
                    }
                }
            }
        }
    };

    function isSequenceComplete(name) {
        const seq = animator.sequences.get(name);
        return seq && animator.currentStepIndex >= seq.length;
    }

    p.windowResized = () => {
        const size = getCanvasSize(800, 20);
        p.resizeCanvas(size, size);
        calculateScaleFromPoints(p, allPoints, p.width, p.height, 60);
    };
};

new p5(sketch);