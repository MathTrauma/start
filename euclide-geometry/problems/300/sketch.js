// sketch_001.js - 이등변삼각형의 직교성
import p5 from 'p5';
import { Animator } from '../../lib/animator.js';
import { TPoint, TSegment, TPolygon, TRightAngle, TAngleMarker, TCircle } from '../../lib/t_object.js';
import { calculateScaleFromPoints, applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { projectPointToLine, intersectLines, getCircumcenter } from '../../lib/geometry.js';

const sketch = (p) => {
    let animator;
    let isAutoPlay = false;
    let A, B, C, D, E, F, M, X, O;
    let allPoints = [];
    
    // Global reference for viewer.html and ui-controls.js
    window.p5Instance = p;
    
    // Problem Phase Objects
    let triABC, pA, pB, pC;
    let pD, segAD, rightADC;
    let segDE, pE, rightBED;
    let pM, segCE, segAM;
    let pX;
    
    // Solution Phase Objects
    let pF, segDF;
    let triBDF, triBCE, angleFDB, angleECB;
    let triBDE, triDAE, angleADE, angleDBE;
    let triBDF2, triDAM, angleMAD;
    let circleACD, rightCXA;

    p.setup = () => {
        const size = getCanvasSize(800, 20);
        p.createCanvas(size, size).parent('canvas-wrapper');
        p.pixelDensity(1);
        animator = new Animator(p);

        // Theme 적용
        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 1. 기하학 구조 정의
        B = p.createVector(-3, -3);
        C = p.createVector(3, -3);
        
        // 이등변삼각형의 꼭짓점 A (BC의 중점에서 수직으로)
        const midBC = p5.Vector.add(B, C).mult(0.5);
        const angle = 55; // degrees
        const height = (C.x - B.x) / 2 * Math.tan(angle * Math.PI / 180);
        A = p.createVector(midBC.x, midBC.y + height);
        
        // D: BC의 중점 (이등변삼각형이므로 A에서 BC로의 수선의 발)
        D = midBC.copy();
        
        E = projectPointToLine(D, A, B);
        
        // M: DE의 중점
        M = p5.Vector.add(D, E).mult(0.5);
        
        // F: B와 E의 중점 (solution phase)
        F = p5.Vector.add(B, E).mult(0.5);
        
        // X: CE와 AM의 교점
        X = intersectLines(C, E, A, M);
        
        // O: A, C, D의 외접원 중심
        O = getCircumcenter(A, C, D);
        const radius = p5.Vector.dist(O, A);

        allPoints = [A, B, C, D, E, F, M, X, O];
        calculateScaleFromPoints(p, allPoints, p.width, p.height, 60);

        // Theme 접근
        const t = p.theme;

        // ===== Problem Phase Objects =====
        
        // Phase 1: 삼각형 ABC
        pA = new TPoint(p, A, "A", { dx: -10, dy: -10 });
        pB = new TPoint(p, B, "B", { dx: -10, dy: 15 });
        pC = new TPoint(p, C, "C", { dx: 10, dy: 15 });
        triABC = new TPolygon(p, [A, B, C], { color: t.stroke, weight: 2 });
        
        // Phase 2: 수선의 발 D
        pD = new TPoint(p, D, "D", { dx: 0, dy: 15 });
        segAD = new TSegment(p, A, D, { color: t.stroke });
        rightADC = new TRightAngle(p, A, D, C, 0.3, { color: t.stroke });
        
        // Phase 3: 사영점 E
        segDE = new TSegment(p, D, E, { color: t.stroke });
        pE = new TPoint(p, E, "E", { dx: -10, dy: 5 });
        rightBED = new TRightAngle(p, D, E, B, 0.3, { color: t.stroke });
        
        // Phase 4: 중점 M과 보조선
        pM = new TPoint(p, M, "M", { dx: -12, dy: 12 });
        segCE = new TSegment(p, C, E, { color: t.stroke });
        segAM = new TSegment(p, A, M, { color: t.stroke });
        
        // Phase 5: 교점 X (라벨 없음)
        pX = new TPoint(p, X, "", { dx: 10, dy: 10 });
        
        // ===== Solution Phase Objects =====
        
        // Solution Phase 1: 닮음 찾기
        pF = new TPoint(p, F, "F", { dx: -10, dy: 10 });
        segDF = new TSegment(p, D, F, { color: t.stroke });
        triBDF = new TPolygon(p, [B, D, F], { 
            filled: true, 
            fillColor: [...t.fillBlue.slice(0, 3), 40], 
            color: [...t.fillBlue.slice(0, 3), 180]
        });
        triBCE = new TPolygon(p, [B, C, E], { 
            filled: true, 
            fillColor: [...t.fillRed.slice(0, 3), 40], 
            color: [...t.fillRed.slice(0, 3), 180]
        });
        angleFDB = new TAngleMarker(p, F, D, B, { distance: 0.8, showDot: true, size: 5, fillColor: t.stroke });
        angleECB = new TAngleMarker(p, E, C, B, { distance: 0.8, showDot: true, size: 5, fillColor: t.stroke });
        
        // Solution Phase 2: 추가 닮음 찾기
        triBDE = new TPolygon(p, [B, D, E], { 
            filled: true, 
            fillColor: [...t.fillBlue.slice(0, 3), 30], 
            color: [...t.fillBlue.slice(0, 3), 150]
        });
        triDAE = new TPolygon(p, [D, A, E], { 
            filled: true, 
            fillColor: [...t.fillRed.slice(0, 3), 30], 
            color: [...t.fillRed.slice(0, 3), 150]
        });
        angleADE = new TAngleMarker(p, A, D, E, { distance: 0.8, emoji: '🔺', size: 15, fillColor: t.stroke });
        angleDBE = new TAngleMarker(p, D, B, E, { distance: 0.8, emoji: '🔺', size: 15, fillColor: t.stroke });

        triBDF2 = new TPolygon(p, [B, D, F], { 
            filled: true, 
            fillColor: [...t.fillBlue.slice(0, 3), 40], 
            color: [...t.fillBlue.slice(0, 3), 180]
        });
        triDAM = new TPolygon(p, [D, A, M], { 
            filled: true, 
            fillColor: [...t.fillRed.slice(0, 3), 40], 
            color: [...t.fillRed.slice(0, 3), 180]
        });
        angleMAD = new TAngleMarker(p, M, A, D, { distance: 0.8, showDot: true, size: 5, fillColor: t.stroke });

        // Solution Phase 3: 공원점
        circleACD = new TCircle(p, O, radius, { color: [150, 100, 200], weight: 1.5 });
        rightCXA = new TRightAngle(p, C, X, A, 0.3, { color: '#FF0000' });

        // ===== 시퀀스 등록 =====
        
        // Problem Phases
        animator.registerSequence("prob-1", [
            { target: triABC, duration: 1.5 },
            { group: [{ target: pA }, { target: pB }, { target: pC }], duration: 0.3 }
        ]);
        
        animator.registerSequence("prob-2", [
            { target: pD, duration: 0.3 },
            { target: segAD, duration: 1.0 },
            { target: rightADC, duration: 0.3 },
            { target: null, duration: 0.5 } // delay
        ]);
        
        animator.registerSequence("prob-3", [
            { target: segDE, duration: 1.0 },
            { target: pE, duration: 0.3 },
            { target: rightBED, duration: 0.3 },
            { target: null, duration: 0.5 } // delay
        ]);
        
        animator.registerSequence("prob-4", [
            { target: pM, duration: 0.3 },
            { target: segCE, duration: 1.2 },
            { target: segAM, duration: 1.2 }
        ]);
        
        animator.registerSequence("prob-5", [
            { target: pX, duration: 0.3 }
        ]);
        
        // Solution Phases
        animator.registerSequence("sol-1", [
            { target: pF, duration: 0.3 },
            { target: segDF, duration: 1.0 },
            { target: triBDF, duration: 1.0 },
            { target: triBCE, duration: 1.0 },
            { group: [
                { target: triBDF, mode: 'travel', duration: 2.0 },
                { target: triBCE, mode: 'travel', duration: 2.0 }
            ]},
            { group: [
                { target: triBDF, mode: 'pulse', duration: 1.0 },
                { target: triBCE, mode: 'pulse', duration: 1.0 }
            ]},
            { target: null, duration: 0.5 }, // delay
            { group: [{ target: angleFDB }, { target: angleECB }], duration: 0.5 }
        ]);
        
        animator.registerSequence("sol-2", [
            { group: [
                { target: triBDF, mode: 'fadeOut', duration: 0.2 },
                { target: triBCE, mode: 'fadeOut', duration: 0.2 }
            ]},
            { group: [
                { target: triBDE, duration: 1.5 },
                { target: triDAE, duration: 1.5 }
            ]},
            { group: [
                { target: triBDE, mode: 'pulse', duration: 1.0 },
                { target: triDAE, mode: 'pulse', duration: 1.0 }
            ]},
            { group: [{ target: angleADE }, { target: angleDBE }], duration: 0.7 },
            { target: null, duration: 1.0 }, // delay
            { group: [
                { target: triBDE, mode: 'fadeOut', duration: 0.3 },
                { target: triDAE, mode: 'fadeOut', duration: 0.3 }
            ]},
            { group: [
                { target: triBDF2, duration: 1.0 },
                { target: triDAM, duration: 1.0 }
            ]},
            { group: [
                { target: triBDF2, mode: 'pulse', duration: 1.0 },
                { target: triDAM, mode: 'pulse', duration: 1.0 }
            ]},
            { target: null, duration: 1.0 }, // delay
            { target: angleMAD, duration: 0.5 }
        ]);
        
        animator.registerSequence("sol-3", [
            { target: circleACD, duration: 1.5 },
            { target: pX, duration: 0.3 },
            { target: rightCXA, duration: 0.3 }
        ]);

        // playPhase 함수 등록
        window.playPhase = (name) => {
            const phases = [
                'prob-1', 'prob-2', 'prob-3', 'prob-4', 'prob-5',
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
        
        // Legacy compatibility functions for ui-controls.js
        window.resetAnimation = () => {
            isAutoPlay = true;
            window.playPhase('prob-1');
        };
        window.togglePause = (p) => {
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
        window.problemPhaseCount = 5;
        window.solutionPhaseCount = 3;
    };

    p.draw = () => {
        p.background(p.theme.background);
        
        p.push();
        p.translate(p.width / 2, p.height / 2 - 40);
        p.scale(1, -1);
        animator.updateAndDraw();
        p.pop();
        
        // Auto-play Logic
        if (isAutoPlay) {
            const problemPhases = ['prob-1', 'prob-2', 'prob-3', 'prob-4', 'prob-5'];
            const solutionPhases = ['sol-1', 'sol-2', 'sol-3'];
            
            const currentSeqName = animator.currentSequenceName;
            
            // Problem phase 내에서만 자동 진행
            const probIdx = problemPhases.indexOf(currentSeqName);
            if (probIdx >= 0 && probIdx < problemPhases.length - 1) {
                if (isSequenceComplete(currentSeqName)) {
                    const nextPhaseIndex = probIdx + 1;
                    window.playPhase(problemPhases[nextPhaseIndex]);
                }
            }
            
            // Solution phase 내에서만 자동 진행
            const solIdx = solutionPhases.indexOf(currentSeqName);
            if (solIdx >= 0 && solIdx < solutionPhases.length - 1) {
                if (isSequenceComplete(currentSeqName)) {
                    const nextPhaseIndex = solIdx + 1;
                    window.playPhase(solutionPhases[nextPhaseIndex]);
                    
                    // 자동 재생 시에도 solution text 업데이트
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