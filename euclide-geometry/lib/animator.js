/**
 * PolyAnimator - 다각형 애니메이션을 위한 통합 클래스
 *
 * 기존 MTriangle, MFadingTriangle, MFilledTriangle 등을 대체
 * displayStatic 호출 없이 자체 상태 관리로 렌더링
 */
class PolyAnimator {
    constructor(p, pts, options = {}) {
        this.p = p;
        this.pts = pts.map(pt => ({ x: pt.x, y: pt.y })); // 깊은 복사
        this.segments = [];
        this.perimeter = 0;

        // 애니메이션 상태
        this.progress = 0;
        this.completed = false;
        this.started = false;
        this.visible = true;

        // 이동 애니메이션 상태
        this.moving = false;
        this.movingProgress = 0;
        this.movingFrom = null;
        this.movingTo = null;
        this.movingIndex = -1;

        // 둘레 이동 애니메이션 상태
        this.traveling = false;
        this.travelingProgress = 0;

        // 이펙트 상태
        this.effectActive = false;
        this.effectProgress = 0;

        // 스타일 옵션
        this.strokeColor = options.strokeColor || [100, 116, 139];
        this.fillColor = options.fillColor || null;
        this.strokeWeight = options.strokeWeight || 2;
        this.filled = options.filled || false;

        // 페이드 옵션
        this.fadeIn = options.fadeIn || false;
        this.fadeOut = options.fadeOut || false;
        this.alpha = options.alpha !== undefined ? options.alpha : 255;

        this.setup();
    }

    setup() {
        this.segments = [];
        let accumLength = 0;
        const len = this.pts.length;
        for (let i = 0; i < len; i++) {
            const p1 = this.pts[i];
            const p2 = this.pts[(i + 1) % len];
            const d = this.p.dist(p1.x, p1.y, p2.x, p2.y);
            accumLength += d;
            this.segments.push(accumLength);
        }
        this.perimeter = accumLength;
    }

    /**
     * 매 프레임마다 호출하여 애니메이션 진행
     * @param {number} duration - 애니메이션 지속 시간 (초)
     */
    process(duration) {
        if (!this.visible) return;

        // 즉시 완료
        if (duration === 0) {
            this.progress = 1;
            this.completed = true;
            this.started = true;
            this.render(1);
            return;
        }

        if (!this.started) {
            this.started = true;
        }

        // isPaused가 전역에 정의되어 있으면 체크
        const paused = typeof isPaused !== 'undefined' ? isPaused : false;

        if (!this.completed && !paused) {
            this.progress += (this.p.deltaTime / 1000) / duration;
            if (this.progress >= 1) {
                this.progress = 1;
                this.completed = true;
            }
        }

        this.render(this.progress);
    }

    /**
     * 현재 progress에 따라 도형 렌더링
     * @param {number} progress - 진행률 (0~1)
     */
    render(progress) {
        const p = this.p;

        // 페이드 처리
        let alpha = this.alpha;
        if (this.fadeIn && progress < 1) {
            alpha = this.alpha * progress;
        }
        if (this.fadeOut) {
            alpha = this.alpha * (1 - this.effectProgress);
        }

        // 스트로크 설정
        if (this.strokeColor) {
            p.stroke(this.strokeColor[0], this.strokeColor[1], this.strokeColor[2], alpha);
        } else {
            p.noStroke();
        }
        p.strokeWeight(this.strokeWeight);

        // 채우기 설정
        if (this.filled && this.fillColor) {
            p.fill(this.fillColor[0], this.fillColor[1], this.fillColor[2], alpha);
        } else {
            p.noFill();
        }

        if (progress >= 1) {
            // 전체 도형 그리기
            p.beginShape();
            for (const pt of this.pts) {
                p.vertex(pt.x, pt.y);
            }
            p.endShape(p.CLOSE);
        } else {
            // 부분 도형 그리기 (진행 중)
            const drawLen = this.perimeter * progress;
            let sofar = 0;
            const len = this.pts.length;

            p.beginShape();
            p.vertex(this.pts[0].x, this.pts[0].y);

            for (let i = 0; i < len; i++) {
                const startPt = this.pts[i];
                const endPt = this.pts[(i + 1) % len];
                const segLen = this.getSegmentLength(i);

                if (sofar + segLen <= drawLen) {
                    p.vertex(endPt.x, endPt.y);
                    sofar += segLen;
                } else {
                    const remaining = drawLen - sofar;
                    const amt = remaining / segLen;
                    const x = p.lerp(startPt.x, endPt.x, amt);
                    const y = p.lerp(startPt.y, endPt.y, amt);
                    p.vertex(x, y);
                    break;
                }
            }
            p.endShape();
        }
    }

    /**
     * 특정 세그먼트의 길이 반환
     */
    getSegmentLength(idx) {
        if (idx === 0) return this.segments[0];
        return this.segments[idx] - this.segments[idx - 1];
    }

    /**
     * 누적 길이 반환
     */
    getAccumLength(idx) {
        return idx === 0 ? 0 : this.segments[idx - 1];
    }

    ////////////////////////////////////////
    // 둘레 이동 애니메이션
    ////////////////////////////////////////

    /**
     * 둘레 이동 애니메이션 처리 (호출 시 자동 시작)
     * @param {number} duration - 한 바퀴 도는 시간 (초)
     */
    processTraveling(duration) {
        // 첫 호출 시 자동 시작
        if (!this.traveling) {
            this.traveling = true;
            this.travelingProgress = 0;
        }

        const paused = typeof isPaused !== 'undefined' ? isPaused : false;
        if (!paused) {
            this.travelingProgress += (this.p.deltaTime / 1000) / duration;
            if (this.travelingProgress >= 1) {
                this.travelingProgress = 1;
                this.traveling = false;
            }
        }

        const dist = this.perimeter * this.travelingProgress;
        let targetX = 0, targetY = 0;

        const len = this.pts.length;
        for (let i = 0; i < len; i++) {
            if (dist <= this.segments[i]) {
                const pStart = this.pts[i];
                const pEnd = this.pts[(i + 1) % len];
                const segLen = this.getSegmentLength(i);
                const distOnSegment = dist - this.getAccumLength(i);
                const ratio = distOnSegment / segLen;
                targetX = this.p.lerp(pStart.x, pEnd.x, ratio);
                targetY = this.p.lerp(pStart.y, pEnd.y, ratio);
                break;
            }
        }
        this.drawTravelingCircle(targetX, targetY);
    }

    /**
     * 빛나는 원 그리기
     */
    drawTravelingCircle(x, y) {
        const p = this.p;
        p.push();
        p.drawingContext.shadowBlur = 25;
        p.drawingContext.shadowColor = '#22d3ee'; // cyan-400

        p.noStroke();
        p.fill(34, 211, 238); // cyan-400
        p.circle(x, y, 12);

        // 밝은 내부 코어
        p.fill(255);
        p.circle(x, y, 6);
        p.pop();
    }

    ////////////////////////////////////////
    // 꼭짓점 이동 애니메이션
    ////////////////////////////////////////

    /**
     * 꼭짓점 이동 애니메이션 처리 (호출 시 자동 시작)
     * @param {number} index - 이동할 꼭짓점 인덱스
     * @param {number} targetX - 목표 X 좌표
     * @param {number} targetY - 목표 Y 좌표
     * @param {number} duration - 이동 시간 (초)
     */
    processMoving(index, targetX, targetY, duration) {
        // 첫 호출 시 자동 시작
        if (!this.moving) {
            this.moving = true;
            this.movingProgress = 0;
            this.movingIndex = index;
            this.movingFrom = { x: this.pts[index].x, y: this.pts[index].y };
            this.movingTo = { x: targetX, y: targetY };
        }

        const paused = typeof isPaused !== 'undefined' ? isPaused : false;
        if (!paused) {
            this.movingProgress += (this.p.deltaTime / 1000) / duration;
            if (this.movingProgress >= 1) {
                this.movingProgress = 1;
                this.moving = false;
            }
        }

        const i = this.movingIndex;
        this.pts[i].x = this.p.lerp(this.movingFrom.x, this.movingTo.x, this.movingProgress);
        this.pts[i].y = this.p.lerp(this.movingFrom.y, this.movingTo.y, this.movingProgress);

        // 이동 후 세그먼트 길이 재계산
        this.recalculateSegments();

        this.render(1);
    }

    /**
     * 세그먼트 길이 재계산 (꼭짓점 이동 후)
     */
    recalculateSegments() {
        this.segments = [];
        let accumLength = 0;
        const len = this.pts.length;
        for (let i = 0; i < len; i++) {
            const p1 = this.pts[i];
            const p2 = this.pts[(i + 1) % len];
            const d = this.p.dist(p1.x, p1.y, p2.x, p2.y);
            accumLength += d;
            this.segments.push(accumLength);
        }
        this.perimeter = accumLength;
    }

    ////////////////////////////////////////
    // 이펙트 애니메이션
    ////////////////////////////////////////

    /**
     * 펄스 이펙트 처리 (호출 시 자동 시작, 호출 안하면 자동 중지)
     * @param {number} duration - 이펙트 한 사이클 시간 (초)
     */
    processEffect(duration) {
        // 첫 호출 시 자동 시작
        if (!this.effectActive) {
            this.effectActive = true;
            this.effectProgress = 0;
        }

        const paused = typeof isPaused !== 'undefined' ? isPaused : false;
        if (!paused) {
            this.effectProgress += (this.p.deltaTime / 1000) / duration;
            if (this.effectProgress >= 1) {
                this.effectProgress = 0; // 반복
            }
        }

        const pulse = (Math.sin(this.effectProgress * Math.PI * 2) + 1) / 2;
        this.strokeColor = [
            100 + pulse * 50,
            116 + pulse * 50,
            139 + pulse * 50
        ];
    }

    ////////////////////////////////////////
    // 유틸리티
    ////////////////////////////////////////

    /**
     * 도형 숨기기
     */
    hide() {
        this.visible = false;
    }

    /**
     * 도형 보이기
     */
    show() {
        this.visible = true;
    }

    /**
     * 애니메이션 리셋
     */
    reset() {
        this.progress = 0;
        this.completed = false;
        this.started = false;
        this.moving = false;
        this.movingProgress = 0;
        this.traveling = false;
        this.travelingProgress = 0;
        this.effectActive = false;
        this.effectProgress = 0;
    }

    /**
     * 스타일 업데이트
     */
    setStyle(options) {
        if (options.strokeColor !== undefined) this.strokeColor = options.strokeColor;
        if (options.fillColor !== undefined) this.fillColor = options.fillColor;
        if (options.strokeWeight !== undefined) this.strokeWeight = options.strokeWeight;
        if (options.filled !== undefined) this.filled = options.filled;
        if (options.alpha !== undefined) this.alpha = options.alpha;
    }

    /**
     * 완료 여부 확인
     */
    isCompleted() {
        return this.completed;
    }

    /**
     * 이동 중 여부 확인
     */
    isMoving() {
        return this.moving;
    }

    /**
     * 둘레 이동 중 여부 확인
     */
    isTraveling() {
        return this.traveling;
    }
}
