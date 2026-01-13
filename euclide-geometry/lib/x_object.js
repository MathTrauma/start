/**
 * XObject - 새로운 설계 철학
 *
 * 1. 기하 객체는 항상 완전한 형태로 존재
 * 2. progress는 단순히 "얼마나 드러낼지"를 나타내는 렌더링 파라미터
 * 3. 상태 관리 최소화 - started, completed, savedState 불필요
 * 4. 데이터와 표현의 완전한 분리
 */

/** 일반 문자를 수학용 이탤릭 유니코드로 변환 */
function toMathItalic(str) {
    const upper = '𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍';
    const lower = '𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧';

    return [...str].map(c => {
        if (c >= 'A' && c <= 'Z') return [...upper][c.charCodeAt(0) - 65];
        if (c >= 'a' && c <= 'z') return [...lower][c.charCodeAt(0) - 97];
        return c;
    }).join('');
}

export class XObject {
    constructor(p, options = {}) {
        this.p = p;
        this.visible = options.visible !== undefined ? options.visible : true;
        this.progress = options.progress !== undefined ? options.progress : 1;
        this.mode = options.mode || 'default';

        const theme = p.theme || {
            stroke: [0, 0, 0],
            fillBlue: [255, 255, 255, 0],
            fillRed: [255, 255, 255, 0]
        };

        const defaultStroke = theme.stroke || [0, 0, 0];
        const defaultFill = [255, 255, 255, 0];

        this.style = {
            strokeColor: this.parseColor(options.color || options.strokeColor || defaultStroke),
            strokeWeight: options.weight || options.strokeWeight || 1.5,
            fillColor: this.parseColor(options.fillColor || defaultFill),
            filled: options.filled || false
        };

        // 외부 의존 업데이트 콜백 (매 프레임 호출)
        this.updateFn = options.update || null;
    }

    /**
     * 매 프레임 업데이트 - 외부 변수에 의존하는 geometry 재계산용
     */
    update() {
        if (this.updateFn) {
            this.updateFn(this);
        }
    }

    parseColor(c) {
        if (typeof c === 'string') {
            const col = this.p.color(c);
            return [col.levels[0], col.levels[1], col.levels[2], col.levels[3]];
        }
        return c;
    }

    /** * progress와 mode에 따라 렌더링 스타일 계산 */
    getRenderStyle() {
        let strokeAlpha = 255;
        let fillAlpha = 0;
        const baseStrokeAlpha = (this.style.strokeColor.length > 3) ? this.style.strokeColor[3] : 255;
        const baseFillAlpha = (this.style.fillColor.length > 3) ? this.style.fillColor[3] : 100;
        let weight = this.style.strokeWeight;

        if (this.mode === 'fadeOut') {
            const factor = 1 - this.progress;
            strokeAlpha = baseStrokeAlpha * factor;
            fillAlpha = baseFillAlpha * factor;
        }
        else if (this.mode === 'pulse') {
            const pulse = (Math.sin(this.progress * Math.PI * 6) + 1) / 2;
            strokeAlpha = Math.min(255, baseStrokeAlpha + 55 * pulse);
            fillAlpha = baseFillAlpha + (255 - baseFillAlpha) * 0.3 * pulse;
            weight = this.style.strokeWeight + 3 * pulse;
        }
        else if (this.mode === 'default' || this.mode === 'draw') {
            strokeAlpha = baseStrokeAlpha;
            fillAlpha = this.progress * baseFillAlpha;
        }
        else {
            strokeAlpha = baseStrokeAlpha;
            fillAlpha = baseFillAlpha;
        }

        return {
            strokeColor: [...this.style.strokeColor.slice(0, 3), strokeAlpha],
            fillColor: [...this.style.fillColor.slice(0, 3), fillAlpha],
            strokeWeight: weight
        };
    }

    tx(val) {
        if (typeof this.p.tx === 'function') return this.p.tx(val);
        return (val.x !== undefined ? val.x : val);
    }

    ty(val) {
        if (typeof this.p.ty === 'function') return this.p.ty(val);
        return (val.y !== undefined ? val.y : val);
    }

    /**
     * 메인 렌더링 함수 - 하위 클래스에서 오버라이드
     */
    render() {
        if (!this.visible) return;
    }

    /**
     * 객체 상태 초기화 - 하위 클래스에서 오버라이드
     */
    reset() {
        this.visible = true;
        this.progress = 1;
        this.mode = 'default';
    }
}

export class XPolygon extends XObject {
    constructor(p, vertices, options = {}) {
        super(p, options);
        // 원본 vertices 저장 (immutable, 리셋용)
        this.originalVertices = vertices.map(v => v.copy ? v.copy() : this.p.createVector(v.x, v.y));
        // 현재 vertices (morph 완료 시 업데이트됨)
        this.vertices = this.originalVertices.map(v => v.copy());

        // Morphing 목표 상태
        this.morphTarget = null;

        this.dashed = options.dashed || false;
    }

    calculatePerimeter() {
        this.perimeter = 0;
        this.cumulative = [0];
        for (let i = 0; i < this.vertices.length; i++) {
            const next = this.vertices[(i + 1) % this.vertices.length];
            const d = this.p.dist(this.vertices[i].x, this.vertices[i].y, next.x, next.y);
            this.perimeter += d;
            this.cumulative.push(this.perimeter);
        }
    }

    /** * morph 목표 vertices 설정 */
    setMorphTarget(targetVertices) {
        this.morphTarget = targetVertices.map(v =>
            v.copy ? v.copy() : this.p.createVector(v.x, v.y)
        );
    }

    /** * 객체 상태 초기화 (오버라이드) */
    reset() {
        super.reset();
        this.vertices = this.originalVertices.map(v => v.copy());
        this.morphTarget = null;
    }

    /** * progress에 따른 위치 찾기 (draw, travel 모드에서 사용) */
    findPositionByProgress(progress) {
        // 필요 시점에 perimeter 계산
        this.calculatePerimeter();

        if (progress <= 0) {
            return { x: this.vertices[0].x, y: this.vertices[0].y, index: 0 };
        }
        if (progress >= 1) {
            const last = this.vertices.length - 1;
            return { x: this.vertices[last].x, y: this.vertices[last].y, index: last };
        }

        const targetDist = this.perimeter * progress;
        let lo = 0, hi = this.cumulative.length - 1;

        while (lo <= hi) {
            const mid = Math.floor((lo + hi) / 2);
            if (targetDist < this.cumulative[mid]) {
                hi = mid - 1;
            } else {
                lo = mid + 1;
            }
        }

        const start = this.cumulative[hi];
        const end = this.cumulative[lo];
        const segLen = end - start;
        const ratio = segLen > 0 ? (targetDist - start) / segLen : 0;

        const sv = this.vertices[hi];
        const ev = this.vertices[lo % this.vertices.length];

        return {
            x: this.p.lerp(sv.x, ev.x, ratio),
            y: this.p.lerp(sv.y, ev.y, ratio),
            index: hi
        }
    }

    render() {
        if (!this.visible) return;

        const p = this.p;
        const style = this.getRenderStyle();

        // renderVertices 결정
        let renderVertices = this.vertices;

        if (this.mode === 'morph' && this.morphTarget) {
            // vertices와 morphTarget 사이 보간
            renderVertices = this.vertices.map((v, i) => {
                if (this.morphTarget[i]) {
                    return v.copy().lerp(this.morphTarget[i], this.progress);
                }
                return v.copy();
            });

            // morph 완료 처리
            if (this.progress >= 1) {
                this.vertices = this.morphTarget.map(v => v.copy());
                this.morphTarget = null;
            }
        }

        p.push();
        p.stroke(style.strokeColor);
        p.strokeWeight(style.strokeWeight);
        if (this.style.filled) p.fill(style.fillColor);
        else p.noFill();

        if (this.dashed) p.drawingContext.setLineDash([5, 5]);

        if (this.mode === 'draw' && this.progress < 1) {
            const { x, y, index } = this.findPositionByProgress(this.progress);
            p.beginShape();
            for (let i = 0; i <= index; i++) {
                p.vertex(this.tx(renderVertices[i]), this.ty(renderVertices[i]));
            }
            p.vertex(this.tx({ x, y }), this.ty({ x, y }));
            p.endShape();
        } else if (this.mode === 'travel') {
            // 전체 다각형 + 움직이는 점
            p.beginShape();
            renderVertices.forEach(v => p.vertex(this.tx(v), this.ty(v)));
            p.endShape(p.CLOSE);

            // progress < 1일 때만 빛나는 원 그리기
            if (this.progress < 1) {
                const { x, y } = this.findPositionByProgress(this.progress);
                this.drawTravelingCircle(this.tx({ x, y }), this.ty({ x, y }));
            }
        } else {
            // 완전한 형태 (default, fadeOut, pulse, morph)
            p.beginShape();
            renderVertices.forEach(v => p.vertex(this.tx(v), this.ty(v)));
            p.endShape(p.CLOSE);
        }

        if (this.dashed) p.drawingContext.setLineDash([]);
        p.pop();
    }

    drawTravelingCircle(x, y) {
        const p = this.p;
        p.push();
        const highlight = (this.p.theme && this.p.theme.highlight) ? this.p.theme.highlight : '#22d3ee';
        p.drawingContext.shadowBlur = 15;
        p.drawingContext.shadowColor = highlight;
        p.noStroke();
        p.fill(highlight);
        p.circle(x, y, 10);
        p.fill(255);
        p.circle(x, y, 5);
        p.pop();
    }
}

export class XPoint extends XObject {
    /**
     * @param {p5} p - p5 인스턴스
     * @param {p5.Vector} pos - 점의 위치
     * @param {string} label - 레이블 텍스트
     * @param {Object} options
     * @param {number} options.dx - 레이블 x 오프셋 (수동)
     * @param {number} options.dy - 레이블 y 오프셋 (수동)
     * @param {p5.Vector} options.center - 중심점 (자동 배치용)
     * @param {number} options.labelDistance - 레이블 거리 (기본: 15)
     * @param {boolean} options.noDot - true면 점 없이 라벨만 표시
     */
    constructor(p, pos, label = "", options = {}) {
        super(p, options);
        this.pos = pos;
        this.label = label;
        this.labelDistance = options.labelDistance || 15;
        this.noDot = options.noDot || false;

        // 중심점이 주어지면 자동으로 dx, dy 계산
        if (options.center) {
            const dir = {
                x: pos.x - options.center.x,
                y: pos.y - options.center.y
            };
            const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
            if (len > 0) {
                this.dx = (dir.x / len) * this.labelDistance;
                this.dy = -(dir.y / len) * this.labelDistance;  // y축 반전 보정
            } else {
                this.dx = this.labelDistance;
                this.dy = 0;
            }
        } else {
            this.dx = options.dx !== undefined ? options.dx : (this.noDot ? 0 : 10);
            this.dy = options.dy !== undefined ? options.dy : (this.noDot ? 0 : 10);
        }

        const theme = p.theme || {};
        const defaultColor = theme.text || [0, 0, 0];
        if (!options.color && !options.fillColor) {
            this.style.fillColor = this.parseColor(defaultColor);
        }
        this.style.radius = options.radius || 6;
    }

    render() {
        if (!this.visible) return;

        const p = this.p;
        const style = this.getRenderStyle();
        let x = this.tx(this.pos);
        let y = this.ty(this.pos);

        p.push();
        p.noStroke();
        p.fill(style.fillColor);

        // 점 그리기 (noDot이 아닐 때만)
        if (!this.noDot) {
            const radiusScale = this.mode === 'pulse'
                ? (1 + 0.2 * (style.strokeWeight / this.style.strokeWeight))
                : 1;
            p.circle(x, y, this.style.radius * radiusScale * this.progress);
        }

        if (this.label && this.progress > 0.5) {
            p.fill(style.fillColor);
            p.push();
            p.translate(x, y);
            p.scale(1, -1);
            p.text(toMathItalic(this.label), this.dx, this.dy);
            p.pop();
        }
        p.pop();
    }
}

/** * XSegment - 선분 생성을 위한 편의 함수 * 점 2개로 이루어진 XPolygon의 래퍼 */
export const XSegment = (p, startPos, endPos, options = {}) => {
    const theme = p.theme || {};
    // dashed 선분에 기본 색상 적용
    if (options.dashed && !options.color && !options.strokeColor) {
        options.color = theme.auxiliary || [150, 150, 150];
    }
    return new XPolygon(p, [startPos, endPos], options);
}

/**
 * XCircle - 원 생성을 위한 편의 함수
 * N각형으로 근사한 XPolygon의 래퍼
 */
export const XCircle = (p, center, radius, options = {}) => {
    const segments = options.segments || 64;
    const vertices = [];

    for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * p.TWO_PI;
        vertices.push(p.createVector(
            center.x + Math.cos(angle) * radius,
            center.y + Math.sin(angle) * radius
        ));
    }

    return new XPolygon(p, vertices, options);
}

/**
 * XArc - 호/부채꼴 생성을 위한 편의 함수
 * 중심점을 포함한 XPolygon의 래퍼
 */
export const XArc = (p, center, radius, startAngle, endAngle, options = {}) => {
    const segments = options.segments || 32;
    const vertices = [];

    // 중심점 추가
    vertices.push(p.createVector(center.x, center.y));

    // 호를 따라 점들 추가
    const angleDiff = endAngle - startAngle;
    for (let i = 0; i <= segments; i++) {
        const angle = startAngle + (i / segments) * angleDiff;
        vertices.push(p.createVector(
            center.x + Math.cos(angle) * radius,
            center.y + Math.sin(angle) * radius
        ));
    }

    return new XPolygon(p, vertices, options);
}

// 미리 정의된 마커 이모지
const MARKER_EMOJIS = {
    dot: '●',        // 채워진 원
    triangle: '▲',   // 채워진 삼각형
    star: '★',       // 별표
    circle: '○'      // 속이 빈 원
};

export class XAngleMarker extends XObject {
    constructor(p, p1, vertex, p2, options = {}) {
        super(p, options);
        this.p1 = p1;
        this.vertex = vertex;
        this.p2 = p2;
        this.arcSize = options.arcSize || 50;
        this.distance = options.distance || 0.6;
        // marker: 'dot', 'triangle', 'star', 'circle' 또는 직접 이모지 문자
        this.marker = options.marker || null;
        // 하위 호환: showDot -> marker: 'dot'
        if (options.showDot && !this.marker) this.marker = 'dot';
        this.size = options.size || 12;
    }

    render() {
        if (!this.visible) return;

        const p = this.p;
        const style = this.getRenderStyle();
        const Vector = this.p1.constructor;

        let v1 = Vector.sub(this.p1, this.vertex);
        let v2 = Vector.sub(this.p2, this.vertex);
        let a1 = (v1.heading() + p.TWO_PI) % p.TWO_PI;
        let a2 = (v2.heading() + p.TWO_PI) % p.TWO_PI;
        if (a2 < a1) a2 += p.TWO_PI;

        const vx = this.tx(this.vertex);
        const vy = this.ty(this.vertex);
        const midA = (a1 + a2) / 2;

        p.push();

        // 아크 그리기 조건:
        // - 마커 없음: 항상 아크 표시
        // - 마커 있음: progress < 1일 때만 아크 표시 (애니메이션), 완료 후 마커로 대체
        const showArc = !this.marker || this.progress < 1;

        if (showArc) {
            p.noFill();
            p.stroke(style.strokeColor);
            p.strokeWeight(style.strokeWeight);

            if (this.mode === 'draw' && this.progress < 1) {
                let currentA2 = a1 + (a2 - a1) * this.progress;
                p.arc(vx, vy, this.arcSize * 2, this.arcSize * 2, a1, currentA2);
            } else {
                p.arc(vx, vy, this.arcSize * 2, this.arcSize * 2, a1, a2);
            }
        }

        // 마커 표시 (마커가 있고 progress >= 1일 때)
        if (this.marker && this.progress >= 1) {
            let mx = vx + Math.cos(midA) * this.arcSize * this.distance;
            let my = vy + Math.sin(midA) * this.arcSize * this.distance;

            const emoji = MARKER_EMOJIS[this.marker] || this.marker;
            p.fill(style.strokeColor);
            p.noStroke();
            p.textSize(this.size);
            p.textAlign(p.CENTER, p.CENTER);
            p.push();
            p.translate(mx, my);
            p.scale(1, -1);
            p.text(emoji, 0, 0);
            p.pop();
        }

        p.pop();
    }
}

export class XRightAngle extends XObject {
    constructor(p, p1, vertex, p2, size = 0.3, options = {}) {
        super(p, options);
        this.p1 = p1;
        this.vertex = vertex;
        this.p2 = p2;
        this.size = size;
    }

    render() {
        if (!this.visible) return;

        const p = this.p;
        const style = this.getRenderStyle();
        const Vector = this.p1.constructor;

        p.push();
        p.stroke(style.strokeColor);
        p.strokeWeight(1);
        p.noFill();

        const v1 = Vector.sub(this.p1, this.vertex).normalize();
        const v2 = Vector.sub(this.p2, this.vertex).normalize();
        const a = Vector.add(this.vertex, Vector.mult(v1, this.size));
        const b = Vector.add(a, Vector.mult(v2, this.size));
        const c = Vector.add(this.vertex, Vector.mult(v2, this.size));

        if (this.mode === 'draw' && this.progress < 1) {
            // 그려지는 애니메이션 (3개 점을 순차적으로)
            if (this.progress < 0.5) {
                const t = this.progress * 2;
                const curr = Vector.lerp(a, b, t);
                p.line(this.tx(a), this.ty(a), this.tx(curr), this.ty(curr));
            } else {
                p.line(this.tx(a), this.ty(a), this.tx(b), this.ty(b));
                const t = (this.progress - 0.5) * 2;
                const curr = Vector.lerp(b, c, t);
                p.line(this.tx(b), this.ty(b), this.tx(curr), this.ty(curr));
            }
        } else {
            // 완전한 형태
            p.line(this.tx(a), this.ty(a), this.tx(b), this.ty(b));
            p.line(this.tx(b), this.ty(b), this.tx(c), this.ty(c));
        }

        p.pop();
    }
}

/**
 * XDimension - tkz-euclide dim 스타일 치수선
 * 양 끝에 화살표, 중앙에 텍스트 (텍스트 부분에서 선분 끊김)
 *
 * 사용 예:
 *   new XDimension(p, A, B, '4', { offset: 15 })
 */
export class XDimension extends XObject {
    constructor(p, p1, p2, text, options = {}) {
        super(p, options);
        this.p1 = p1;
        this.p2 = p2;
        this.text = text;
        this.offset = options.offset || 0;
        this.fontSize = options.fontSize || 14;
        this.arrowSize = options.arrowSize || 6;
        this.padding = options.padding || 6;
    }

    render() {
        if (!this.visible) return;

        const p = this.p;
        const style = this.getRenderStyle();

        const x1 = this.tx(this.p1);
        const y1 = this.ty(this.p1);
        const x2 = this.tx(this.p2);
        const y2 = this.ty(this.p2);

        // 선분 각도 및 방향
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

        // offset 적용 (수직 방향)
        const perpAngle = angle + p.HALF_PI;
        const ox = Math.cos(perpAngle) * this.offset;
        const oy = Math.sin(perpAngle) * this.offset;

        const sx = x1 + ox;
        const sy = y1 + oy;
        const ex = x2 + ox;
        const ey = y2 + oy;

        // 중점
        const mx = (sx + ex) / 2;
        const my = (sy + ey) / 2;

        p.push();
        p.textSize(this.fontSize);

        // 텍스트 너비 계산
        const textWidth = p.textWidth(this.text) + this.padding * 2;
        const gap = textWidth / 2;

        // 선분 방향 단위벡터
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);

        p.stroke(style.strokeColor);
        p.strokeWeight(style.strokeWeight);

        // draw 모드일 때 progress 적용
        const prog = (this.mode === 'draw') ? this.progress : 1;

        if (prog < 1) {
            // 애니메이션 중: 중앙에서 바깥으로 펼쳐짐
            const currentLen = (len / 2) * prog;
            const lx1 = mx - dx * currentLen;
            const ly1 = my - dy * currentLen;
            const lx2 = mx + dx * currentLen;
            const ly2 = my + dy * currentLen;
            p.line(lx1, ly1, lx2, ly2);
        } else {
            // 완료: 텍스트 영역 제외하고 선분 그리기
            // 왼쪽 선분 (시작점 ~ 텍스트 왼쪽)
            p.line(sx, sy, mx - dx * gap, my - dy * gap);
            // 오른쪽 선분 (텍스트 오른쪽 ~ 끝점)
            p.line(mx + dx * gap, my + dy * gap, ex, ey);

            // 화살표 그리기
            this.drawArrow(p, sx, sy, angle + p.PI, style);  // 왼쪽 화살표 (바깥 방향)
            this.drawArrow(p, ex, ey, angle, style);          // 오른쪽 화살표 (바깥 방향)

            // 텍스트 그리기
            p.push();
            p.translate(mx, my);

            // 텍스트가 뒤집히지 않도록
            let textAngle = angle;
            if (textAngle > p.HALF_PI || textAngle < -p.HALF_PI) {
                textAngle += p.PI;
            }
            p.rotate(textAngle);
            p.scale(1, -1);

            p.fill(style.strokeColor);
            p.noStroke();
            p.textAlign(p.CENTER, p.CENTER);
            p.text(this.text, 0, 0);
            p.pop();
        }

        p.pop();
    }

    drawArrow(p, x, y, angle, style) {
        const size = this.arrowSize;
        p.push();
        p.translate(x, y);
        p.rotate(angle);
        p.fill(style.strokeColor);
        p.noStroke();
        p.triangle(0, 0, -size, size / 2, -size, -size / 2);
        p.pop();
    }
}
