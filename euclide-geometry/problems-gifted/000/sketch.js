
import p5 from 'p5';
import { applyTheme, getCanvasSize, calculateViewport } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XCircle, XRightAngle, XAngleMarker, XSegmentMarker } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let O, A, B, N, S, X;
    let animator;
    const RADIUS = 4;
    const ANGLE_A = (180 + 25) * Math.PI / 180;  // 205° (= -155°)
    const ANGLE_B = 335 * Math.PI / 180;         // 335°
    const ANGLE_C = 50 * Math.PI / 180;          // 50° (Phase 2 종료점)
    const ANGLE_P_START = 0;                      // P 시작점: (4, 0)
    const ANGLE_OFFSET = 5 * Math.PI / 180;      // A 직전 5° 오프셋

    // P의 현재 각도 (애니메이션용)
    let currentAngleP = ANGLE_P_START;


    /**
     * B를 P 중심으로 시계 반대 방향 회전하여 직선 AP 위에 처음 놓이는 점 Q 계산
     */
    function calculateQ(P, A, B) {
        const Vector = P.constructor;

        // P에서 B로의 벡터
        const PB = Vector.sub(B, P);
        const distPB = PB.mag();

        // P에서 B 방향 각도
        const angleB = Math.atan2(PB.y, PB.x);

        // P에서 A 방향 각도
        const PA = Vector.sub(A, P);
        const angleA = Math.atan2(PA.y, PA.x);

        // 직선 AP의 두 방향: angleA와 angleA + π
        const dir1 = angleA;
        const dir2 = angleA + Math.PI;

        // 각 방향으로 가는 데 필요한 회전량 (반시계 방향, 양수)
        let theta1 = (dir1 - angleB) % (2 * Math.PI);
        if (theta1 <= 0) theta1 += 2 * Math.PI;

        let theta2 = (dir2 - angleB) % (2 * Math.PI);
        if (theta2 <= 0) theta2 += 2 * Math.PI;

        // 더 작은 회전량 선택 (처음 도달)
        const theta = Math.min(theta1, theta2);
        const targetAngle = angleB + theta;

        // Q 위치 계산
        return new Vector(
            P.x + distPB * Math.cos(targetAngle),
            P.y + distPB * Math.sin(targetAngle)
        );
    }

    p.setup = function () {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본 점 정의
        O = p.createVector(0, 0);
        A = p.createVector(RADIUS * Math.cos(ANGLE_A), RADIUS * Math.sin(ANGLE_A));
        B = p.createVector(RADIUS * Math.cos(ANGLE_B), RADIUS * Math.sin(ANGLE_B));
        N = p.createVector(0, 4);
        S = p.createVector(0, -4);

        // X: AB와 NS의 교점 (NS는 y축이므로 x=0인 점)
        // 직선 AB의 방정식: y - A.y = ((B.y - A.y)/(B.x - A.x)) * (x - A.x)
        // x = 0일 때: y = A.y + ((B.y - A.y)/(B.x - A.x)) * (0 - A.x)
        const slope = (B.y - A.y) / (B.x - A.x);
        X = p.createVector(0, A.y - slope * A.x);

        // P 초기 위치 (4, 0)
        let P = p.createVector(RADIUS, 0);

        // Q 초기 위치
        let Q = calculateQ(P, A, B);

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, N], size, 60);

        // ===== Problem Phases =====

        // Phase 1: 원과 고정점
        animator.registerPhase('problem1', [
            { id: 'circle', object: XCircle(p, O, RADIUS), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.3 },
            {
                group: [
                    { id: 'pointA', object: new XPoint(p, A, 'A', { center: O }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { center: O }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // Phase 2: 점 P(4,0), Q와 선분들
        animator.registerPhase('problem2', [
            { id: 'pointP', object: new XPoint(p, P, 'P', { center: O }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.2 },
            {
                group: [
                    { id: 'segAP', object: XSegment(p, A, P), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'segBP', object: XSegment(p, B, P), animate: { mode: 'draw', duration: 0.5 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            // Q 표시 전 바운딩박스 업데이트 [A, B, N, Q]
            { action: 'setBounds', points: [A, B, N, Q], duration: 0.5 },
            { id: 'pointQ', object: new XPoint(p, Q, 'Q', { center: O }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.2 },
            { id: 'segPQ', object: XSegment(p, P, Q, { dashed: true }), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 1.0 }
        ]);

        // ===== Solution Phases =====

        // Solution Phase 1: P가 (4,0)에서 A까지 반시계방향 이동
        animator.registerPhase('solution1', [
            // update 콜백 설정
            {
                id: 'pointP',
                setFrameCallback: function (self) {
                    self.pos.x = RADIUS * Math.cos(currentAngleP);
                    self.pos.y = RADIUS * Math.sin(currentAngleP);
                }
            },
            {
                id: 'pointQ',
                setFrameCallback: function (self) {
                    const pointP = animator.get('pointP');
                    if (pointP) {
                        const newQ = calculateQ(pointP.pos, A, B);
                        self.pos.x = newQ.x;
                        self.pos.y = newQ.y;
                    }
                }
            },
            {
                id: 'segAP',
                setFrameCallback: function (self) {
                    const pointP = animator.get('pointP');
                    if (pointP) {
                        self.vertices[1].x = pointP.pos.x;
                        self.vertices[1].y = pointP.pos.y;
                    }
                }
            },
            {
                id: 'segBP',
                setFrameCallback: function (self) {
                    const pointP = animator.get('pointP');
                    if (pointP) {
                        self.vertices[1].x = pointP.pos.x;
                        self.vertices[1].y = pointP.pos.y;
                    }
                }
            },
            {
                id: 'segPQ',
                setFrameCallback: function (self) {
                    const pointP = animator.get('pointP');
                    const pointQ = animator.get('pointQ');
                    if (pointP && pointQ) {
                        self.vertices[0].x = pointP.pos.x;
                        self.vertices[0].y = pointP.pos.y;
                        self.vertices[1].x = pointQ.pos.x;
                        self.vertices[1].y = pointQ.pos.y;
                    }
                }
            },
            // P 이동 애니메이션 (반시계방향: 0° → 205°)
            {
                id: '_moveP1',
                object: {
                    visible: false,
                    progress: 0,
                    mode: 'default',
                    frameCallback: function (self) {
                        // 반시계방향: 0° → ANGLE_A - OFFSET (A 직전까지)
                        currentAngleP = ANGLE_P_START + (ANGLE_A - ANGLE_OFFSET) * self.progress;

                        // 동적 바운딩박스 업데이트 [A, B, N, Q]
                        const pointQ = animator.get('pointQ');
                        if (pointQ) {
                            const points = [A, B, N, pointQ.pos];
                            animator.boundingPoints = points;
                            const params = calculateViewport(points, p.width, p.height, animator.viewport.margin);
                            animator.viewport.scale = params.scale;
                            animator.viewport.centerX = params.centerX;
                            animator.viewport.centerY = params.centerY;
                            animator._updateP5Transform();
                        }
                    },
                    render: function () { }
                },
                animate: { mode: 'default', duration: 4.0, from: 0, to: 1 }
            },
            // O_1: 중심 N, B를 지나는 원 (opacity=0으로 추가)
            {
                id: 'circleO1',
                object: XCircle(p, N, p.dist(N.x, N.y, B.x, B.y), { opacity: 0 })
            },
            { delay: 2.0 }
        ]);

        // Solution Phase 2: AB/NS 점선, N/S 표시, 직각 BXN, O_1 표시, NA/NB(yellow) + NP/NQ, P→C
        animator.registerPhase('solution2', [
            // AB, NS 점선 (dashed, thin)
            {
                group: [
                    { id: 'segAB', object: XSegment(p, A, B, { dashed: true, weight: 1 }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'segNS', object: XSegment(p, N, S, { dashed: true, weight: 1 }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            { delay: 0.2 },
            // 점 N, S 표시 + 직각 BXN
            {
                group: [
                    { id: 'pointN', object: new XPoint(p, N, 'N', { center: O }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'pointS', object: new XPoint(p, S, 'S', { center: O }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'rightBXN', object: new XRightAngle(p, B, X, N, 0.3, { pixel: true }), animate: { mode: 'draw', duration: 0.5 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // O_1 표시 (opacity 0.5)
            { id: 'circleO1', set: { opacity: 0.5, visible: true } },
            { delay: 0.5 },
            // NA, NB, NQ (yellow) + NP 선분
            {
                group: [
                    { id: 'segNA', object: XSegment(p, N, A, { color: 'yellow' }), animate: { mode: 'draw', duration: 0.75 } },
                    { id: 'segNB', object: XSegment(p, N, B, { color: 'yellow' }), animate: { mode: 'draw', duration: 0.75 } },
                    {
                        id: 'segNQ',
                        object: XSegment(p, N, calculateQ(
                            p.createVector(RADIUS * Math.cos(ANGLE_A - ANGLE_OFFSET), RADIUS * Math.sin(ANGLE_A - ANGLE_OFFSET)), A, B
                        ), { color: 'yellow' }),
                        animate: { mode: 'draw', duration: 0.75 }
                    },
                    {
                        id: 'segNP',
                        object: XSegment(p, N, p.createVector(RADIUS * Math.cos(ANGLE_A - ANGLE_OFFSET), RADIUS * Math.sin(ANGLE_A - ANGLE_OFFSET))),
                        animate: { mode: 'draw', duration: 0.75 }
                    }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // NP, NQ에 update 설정
            {
                id: 'segNP',
                setFrameCallback: function (self) {
                    const pointP = animator.get('pointP');
                    if (pointP) {
                        self.vertices[1].x = pointP.pos.x;
                        self.vertices[1].y = pointP.pos.y;
                    }
                }
            },
            {
                id: 'segNQ',
                setFrameCallback: function (self) {
                    const pointQ = animator.get('pointQ');
                    if (pointQ) {
                        self.vertices[1].x = pointQ.pos.x;
                        self.vertices[1].y = pointQ.pos.y;
                    }
                }
            },
            // P 이동 애니메이션 (시계방향: A직전 → C(50°), 0°를 지나감)
            {
                id: '_moveP2',
                object: {
                    visible: false,
                    progress: 0,
                    mode: 'default',
                    // 시계방향 거리: (ANGLE_A - OFFSET) → ANGLE_C (200° → 50° = 150°)
                    _startAngle: ANGLE_A - ANGLE_OFFSET,
                    _clockwiseDist: (ANGLE_A - ANGLE_OFFSET) - ANGLE_C,  // 200° - 50° = 150°
                    frameCallback: function (self) {
                        // 시계방향: (ANGLE_A - OFFSET) → ANGLE_C
                        currentAngleP = self._startAngle - self._clockwiseDist * self.progress;

                        // 동적 바운딩박스 업데이트 [A, B, N, Q]
                        const pointQ = animator.get('pointQ');
                        if (pointQ) {
                            const points = [A, B, N, pointQ.pos];
                            animator.boundingPoints = points;
                            const params = calculateViewport(points, p.width, p.height, animator.viewport.margin);
                            animator.viewport.scale = params.scale;
                            animator.viewport.centerX = params.centerX;
                            animator.viewport.centerY = params.centerY;
                            animator._updateP5Transform();
                        }
                    },
                    render: function () { }
                },
                animate: { mode: 'default', duration: 3.0, from: 0, to: 1 }
            },
            { delay: 1.0 }
        ]);

        // Solution Phase 3: fade AP/circle, draw BQ/PM, angles, segment markers
        // C: P의 최종 위치 (ANGLE_C)
        const C = p.createVector(RADIUS * Math.cos(ANGLE_C), RADIUS * Math.sin(ANGLE_C));
        // Q at C position
        const Q_atC = calculateQ(C, A, B);
        // M: midpoint of B and Q_atC
        const M_mid = p5.Vector.add(B, Q_atC).div(2);

        animator.registerPhase('solution3', [
            // fade segAP, circle
            { action: 'fade', targets: ['segAP', 'circle'], opacity: 0.3, duration: 0.7 },
            // draw BQ || draw PM
            {
                group: [
                    { id: 'segBQ', object: XSegment(p, B, Q_atC), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segPM', object: XSegment(p, C, M_mid), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            // draw right angle QMN
            { id: 'rightQMN', object: new XRightAngle(p, Q_atC, M_mid, N, 15, { pixel: true }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 0.5 },
            // draw angles MPQ, BPM with markc (○)
            {
                group: [
                    { id: 'angleMPQ', object: new XAngleMarker(p, M_mid, C, Q_atC, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'angleBPM', object: new XAngleMarker(p, B, C, M_mid, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } }
                ],
                parallel: true
            },
            // add mark[2] to NQ, NB, NA
            {
                group: [
                    { id: 'markNQ', object: new XSegmentMarker(p, N, Q_atC, { mark: 2 }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'markNB', object: new XSegmentMarker(p, N, B, { mark: 2 }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'markNA', object: new XSegmentMarker(p, N, A, { mark: 2 }), animate: { mode: 'draw', duration: 0.5 } }
                ],
                parallel: true
            },
            { delay: 1.5 }
        ]);

        const phaseMap = {
            problem: {
                1: 'problem1',
                2: 'problem2'
            },
            solution: {
                1: 'solution1',
                2: 'solution2',
                3: 'solution3'
            }
        };

        sketchContext.register({
            p5Instance: p,
            animator: animator,
            phaseMap: phaseMap,
            problemPhaseCount: 2,
            solutionPhaseCount: 3
        });
    };

    p.draw = function () {
        p.background(p.theme.background);

        p.push();
        p.translate(p.width / 2, p.height / 2);
        p.scale(1, -1);

        if (animator) {
            animator.updateAndDraw();
        }

        p.pop();
    };
};

new p5(sketch, 'canvas-wrapper');
