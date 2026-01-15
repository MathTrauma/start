/**
 * XAnimator - 새로운 설계 철학
 *
 * 핵심 아이디어:
 * 1. 전역 객체 풀 - 모든 객체를 ID로 관리
 * 2. Phase = 변경사항만 정의 (무엇이 달라지는가)
 * 3. 자동 유지 - 명시적으로 제거하지 않으면 계속 그려짐
 */

export class XAnimator {
    constructor(p) {
        this.p = p;
        this.objects = new Map();  // id -> XObject
        this.phases = new Map();   // name -> actions[]
        this.currentPhase = null;
        this.currentActions = [];
        this.currentActionIndex = 0;
        this.actionTimers = new Map();  // action -> startTime
        this.isPaused = false;

        // Phase 시퀀스 관리
        this.phaseSequence = [];
        this.currentPhaseInSequence = 0;

        // Viewport 상태 관리
        this.boundingPoints = [];  // 바운딩 박스 계산용 점들
        this.viewport = {
            scale: null,
            centerX: 0,
            centerY: 0,
            margin: 60
        };
    }

    /** * 객체 등록 (한 번만) */
    add(id, object) {
        this.objects.set(id, object);
        return object;
    }

    /** * ID로 객체 가져오기 */
    get(id) { return this.objects.get(id); }

    /**
     * Phase 등록
     * @param {string} name - Phase 이름
     * @param {Array} actions - 액션 배열
     *
     * Action 형식:
     * - { id: 'A', animate: { mode: 'draw', duration: 1 } }
     * - { id: 'A', action: 'remove' }
     * - { id: 'A', action: 'hide' }
     * - { id: 'A', action: 'show' }
     * - { id: 'A', set: { mode: 'pulse', progress: 0.5 } }
     * - { delay: 0.5 } // 딜레이
     * - { group: [...actions], parallel: true } // 병렬 실행
     */
    registerPhase(name, actions) { this.phases.set(name, actions); }

    /** * Phase 실행 */
    play(name) {
        if (!this.phases.has(name)) {
            console.warn(`Phase '${name}' not found.`);
            return;
        }

        this.currentPhase = name;
        this.currentActions = this.phases.get(name);
        this.currentActionIndex = 0;
        this.actionTimers.clear();
        this.isPaused = false;
    }

    /** * Phase 시퀀스 자동 실행 */
    playSequence(phaseNames) {
        this.phaseSequence = phaseNames;
        this.currentPhaseInSequence = 0;
        if (phaseNames.length > 0) {
            this.play(phaseNames[0]);
        }
    }

    /**
     * 특정 인덱스의 phase만 애니메이션 시작
     * @param {string[]} phaseNames - phase 이름 배열
     * @param {number} startIndex - 애니메이션 시작 인덱스 (이전은 완료 상태로 등록)
     */
    playFrom(phaseNames, startIndex) {
        this.reset();

        // startIndex 이전 phase들은 완료 상태로 등록
        for (let i = 0; i < startIndex && i < phaseNames.length; i++) {
            this.applyPhaseObjects(phaseNames[i]);
        }

        // startIndex phase만 애니메이션 시작
        if (startIndex < phaseNames.length) {
            this.play(phaseNames[startIndex]);
        }
    }

    /** * 해당 phase의 오브젝트들을 this.objects에 등록 (완전히 그려진 상태로) */
    applyPhaseObjects(name) {
        const actions = this.phases.get(name);
        if (!actions) return;

        const applyAction = (action) => {
            if (action.group) {
                action.group.forEach(sub => applyAction(sub));
                return;
            }

            // delay는 무시
            if (action.delay !== undefined) {
                return;
            }

            // setBounds 처리 (viewport 즉시 업데이트)
            if (action.action === 'setBounds') {
                const { points, replace = false } = action;
                if (replace) {
                    this.boundingPoints = [...points];
                } else {
                    points.forEach(pt => {
                        if (!this.boundingPoints.includes(pt)) {
                            this.boundingPoints.push(pt);
                        }
                    });
                }
                const params = this._calculateViewportParams(
                    this.boundingPoints,
                    this.p.width,
                    this.p.height,
                    this.viewport.margin
                );
                this.viewport.scale = params.scale;
                this.viewport.centerX = params.centerX;
                this.viewport.centerY = params.centerY;

                const { scale: s, centerX: cx, centerY: cy } = this.viewport;
                this.p.tx = (v) => (v.x - cx) * s;
                this.p.ty = (v) => (v.y - cy) * s;
                this.p.geometryScale = s;
                return;
            }

            // remove 액션 처리
            if (action.action === 'remove') {
                this.objects.delete(action.id);
                return;
            }

            // hide 액션 처리
            if (action.action === 'hide') {
                const obj = this.objects.get(action.id);
                if (obj) obj.visible = false;
                return;
            }

            // show 액션 처리
            if (action.action === 'show') {
                const obj = this.objects.get(action.id);
                if (obj) obj.visible = true;
                return;
            }

            // 객체 추가
            if (action.object) {
                if (action.object.reset) action.object.reset();
                this.add(action.id, action.object);
            }

            // set 액션 처리
            if (action.id && action.set) {
                const obj = this.objects.get(action.id);
                if (obj) {
                    Object.assign(obj, action.set);
                }
            }

            // setUpdate 액션 처리 (콜백 붙이기/떼기)
            if (action.id && action.setUpdate !== undefined) {
                const obj = this.objects.get(action.id);
                if (obj) {
                    obj.updateFn = action.setUpdate;
                }
            }

            // animate 액션 처리 (완료 상태로)
            if (action.id && action.animate) {
                const obj = this.objects.get(action.id);
                if (obj) {
                    obj.visible = true;
                    obj.progress = 1;
                    obj.mode = 'default';

                    // 속성 반영 (color, strokeWeight 등)
                    if (action.animate.color) obj.color = action.animate.color;
                    if (action.animate.strokeWeight !== undefined) obj.strokeWeight = action.animate.strokeWeight;

                    // morph 완료 처리: vertices를 morphTarget으로 업데이트
                    if (action.animate.mode === 'morph' && action.animate.morphTarget) {
                        obj.vertices = action.animate.morphTarget.map(v =>
                            v.copy ? v.copy() : this.p.createVector(v.x, v.y)
                        );
                        if (obj.calculatePerimeter) obj.calculatePerimeter();
                    }
                }
            }
        };

        actions.forEach(action => applyAction(action));
    }

    /** * 현재 실행 중인 액션 처리 */
    processAction(action, dt) {
        // 딜레이
        if (action.delay !== undefined) {
            if (!this.actionTimers.has(action)) {
                this.actionTimers.set(action, 0);
            }
            const elapsed = this.actionTimers.get(action) + dt;
            this.actionTimers.set(action, elapsed);
            return elapsed >= action.delay;
        }

        // 병렬 그룹
        if (action.group && action.parallel) {
            let allComplete = true;
            action.group.forEach(subAction => {
                if (!this.processAction(subAction, dt)) {
                    allComplete = false;
                }
            });
            return allComplete;
        }

        // 순차 그룹 (parallel이 없거나 false인 경우)
        if (action.group && !action.parallel) {
            if (action._groupIndex === undefined) action._groupIndex = 0;
            while (action._groupIndex < action.group.length) {
                const complete = this.processAction(action.group[action._groupIndex], dt);
                if (complete) {
                    action._groupIndex++;
                } else {
                    return false;
                }
            }
            return true;
        }

        // object 필드가 있으면 자동 등록 (reset으로 초기 상태 복원)
        if (action.object && !this.objects.has(action.id)) {
            if (action.object.reset) action.object.reset();
            this.add(action.id, action.object);
        }

        // setBounds 액션 (id가 필요 없음)
        if (action.action === 'setBounds') {
            const { points, duration = 1.0, replace = false } = action;

            if (!this.actionTimers.has(action)) {
                // 초기화
                this.actionTimers.set(action, 0);

                // 현재 viewport 저장
                action._fromScale = this.viewport.scale;
                action._fromCenterX = this.viewport.centerX;
                action._fromCenterY = this.viewport.centerY;

                // replace: true면 교체, false면 추가
                if (replace) {
                    this.boundingPoints = [...points];
                } else {
                    points.forEach(pt => {
                        if (!this.boundingPoints.includes(pt)) {
                            this.boundingPoints.push(pt);
                        }
                    });
                }

                // 목표 viewport 계산
                const params = this._calculateViewportParams(
                    this.boundingPoints,
                    this.p.width,
                    this.p.height,
                    this.viewport.margin
                );
                action._toScale = params.scale;
                action._toCenterX = params.centerX;
                action._toCenterY = params.centerY;
            }

            // viewport 애니메이션
            const elapsed = this.actionTimers.get(action) + dt;
            this.actionTimers.set(action, elapsed);
            const progress = Math.min(1, elapsed / duration);

            // viewport 파라미터 lerp
            this.viewport.scale = this.p.lerp(action._fromScale, action._toScale, progress);
            this.viewport.centerX = this.p.lerp(action._fromCenterX, action._toCenterX, progress);
            this.viewport.centerY = this.p.lerp(action._fromCenterY, action._toCenterY, progress);

            // p5 transform 함수 매 프레임 업데이트
            const { scale: s, centerX: cx, centerY: cy } = this.viewport;
            this.p.tx = (v) => (v.x - cx) * s;
            this.p.ty = (v) => (v.y - cy) * s;
            this.p.geometryScale = s;

            return progress >= 1;
        }

        const obj = this.objects.get(action.id);
        if (!obj) {
            console.warn(`Object '${action.id}' not found.`);
            return true;
        }

        // 액션 처리
        if (action.action === 'remove') {
            this.objects.delete(action.id);
            return true;
        }

        if (action.action === 'hide') {
            obj.visible = false;
            return true;
        }

        if (action.action === 'show') {
            obj.visible = true;
            return true;
        }

        // set: 즉시 속성 변경
        if (action.set) {
            Object.assign(obj, action.set);
            return true;
        }

        // setUpdate: 콜백 붙이기/떼기
        if (action.setUpdate !== undefined) {
            obj.updateFn = action.setUpdate;
            return true;
        }

        // animate: progress 애니메이션
        if (action.animate) {
            const { mode, duration = 1, from = 0, to = 1, morphTarget } = action.animate;

            // 타이머 초기화
            if (!this.actionTimers.has(action)) {
                this.actionTimers.set(action, 0);
                if (mode) obj.mode = mode;
                obj.progress = from;
                obj.visible = true;

                // 속성 반영 (color, strokeWeight 등)
                if (action.animate.color) obj.color = action.animate.color;
                if (action.animate.strokeWeight !== undefined) obj.strokeWeight = action.animate.strokeWeight;

                // morphTarget 설정
                if (mode === 'morph' && morphTarget && obj.setMorphTarget) {
                    obj.setMorphTarget(morphTarget);
                }
            }

            const elapsed = this.actionTimers.get(action) + dt;
            this.actionTimers.set(action, elapsed);
            const progress = Math.min(1, elapsed / duration);
            obj.progress = from + (to - from) * progress;

            if (progress >= 1) {
                obj.progress = to;
                // pulse, travel 등 일시적 효과는 완료 후 default로 복원
                // fadeOut은 유지 (반투명 상태 지속)
                if (mode === 'pulse' || mode === 'travel') {
                    obj.mode = 'default';
                }
                return true;
            }
            return false;
        }

        return true;     // 알 수 없는 액션
    }

    /** * 업데이트 */
    update() {
        if (this.isPaused || (typeof window !== 'undefined' && window.isPaused)) return;
        if (!this.currentPhase) return;

        const dt = this.p.deltaTime / 1000;

        // 루프 도입: 완료된 액션은 즉시 건너뛰고 다음 액션 처리
        while (this.currentActionIndex < this.currentActions.length) {
            const currentAction = this.currentActions[this.currentActionIndex];
            const complete = this.processAction(currentAction, dt);

            if (complete) {
                this.currentActionIndex++;
            } else {
                break; // 애니메이션 진행 중이면 루프 중단
            }
        }

        // Phase 완료 체크 및 시퀀스 전환
        if (this.currentActionIndex >= this.currentActions.length) {
            if (this.phaseSequence.length > 0) {
                this.currentPhaseInSequence++;
                if (this.currentPhaseInSequence < this.phaseSequence.length) {
                    this.play(this.phaseSequence[this.currentPhaseInSequence]);
                }
            }
        }
    }

    /** * 렌더링 */
    draw() {
        this.objects.forEach(obj => {
            if (obj.visible) {
                if (obj.update) obj.update();  // 외부 의존 geometry 업데이트
                obj.render();
            }
        });
    }

    /** * 업데이트 + 렌더링 */
    updateAndDraw() {
        this.update();
        this.draw();
    }

    /** * 모든 객체 초기화 */
    reset() {
        this.objects.clear();
        this.currentPhase = null;
        this.currentActions = [];
        this.currentActionIndex = 0;
        this.actionTimers.clear();
        this.phaseSequence = [];
        this.currentPhaseInSequence = 0;

        // viewport를 초기 상태로 복원
        if (this.initialBoundingPoints) {
            this.boundingPoints = [...this.initialBoundingPoints];
            const params = this._calculateViewportParams(
                this.boundingPoints,
                this.canvasSize,
                this.canvasSize,
                this.viewport.margin
            );
            this.viewport.scale = params.scale;
            this.viewport.centerX = params.centerX;
            this.viewport.centerY = params.centerY;

            const { scale: s, centerX: cx, centerY: cy } = this.viewport;
            this.p.tx = (v) => (v.x - cx) * s;
            this.p.ty = (v) => (v.y - cy) * s;
            this.p.geometryScale = s;
        }
    }

    /** * Phase 완료 여부 */
    isPhaseComplete() { return this.currentActionIndex >= this.currentActions.length; }

    /** * 일시정지/재개 */
    pause() { this.isPaused = true; }

    resume() { this.isPaused = false; }

    /** * 특정 객체들만 표시 (디버깅용) */
    showOnly(...ids) {
        this.objects.forEach((obj, id) => {
            obj.visible = ids.includes(id);
            if (obj.visible) obj.progress = 1;
        });
    }

    /** * 모든 객체 표시 */
    showAll() {
        this.objects.forEach(obj => {
            obj.visible = true;
            obj.progress = 1;
        });
    }

    /**
     * Viewport 파라미터 계산 (내부 헬퍼)
     */
    _calculateViewportParams(points, width, height, margin) {
        if (!points || points.length === 0) {
            return { scale: 100, centerX: 0, centerY: 0 };
        }

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        points.forEach(pt => {
            if (pt.x < minX) minX = pt.x;
            if (pt.x > maxX) maxX = pt.x;
            if (pt.y < minY) minY = pt.y;
            if (pt.y > maxY) maxY = pt.y;
        });

        const dataW = maxX - minX;
        const dataH = maxY - minY;
        const availableW = width - 2 * margin;
        const availableH = height - 2 * margin;

        let scaleX = dataW > 0 ? availableW / dataW : Infinity;
        let scaleY = dataH > 0 ? availableH / dataH : Infinity;
        let scale = Math.min(scaleX, scaleY);
        if (scale === Infinity) scale = 100;
        if (scale > 200) scale = 200;

        return {
            scale,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2
        };
    }

    /**
     * Viewport 초기화
     */
    initViewport(points, canvasSize, margin = 60) {
        // 초기 상태 저장 (reset용)
        this.initialBoundingPoints = points.map(pt => pt.copy ? pt.copy() : { x: pt.x, y: pt.y });
        this.canvasSize = canvasSize;

        this.boundingPoints = [...points];
        this.viewport.margin = margin;

        const params = this._calculateViewportParams(points, canvasSize, canvasSize, margin);
        this.viewport.scale = params.scale;
        this.viewport.centerX = params.centerX;
        this.viewport.centerY = params.centerY;

        const { scale: s, centerX: cx, centerY: cy } = this.viewport;
        this.p.tx = (v) => (v.x - cx) * s;
        this.p.ty = (v) => (v.y - cy) * s;
        this.p.geometryScale = s;
    }
}
