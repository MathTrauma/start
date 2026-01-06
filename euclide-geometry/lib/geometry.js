import p5 from 'p5';

// Geometry utility functions

// projection of P onto line AB
export function projectPointToLine(P, A, B) {
    let AB = p5.Vector.sub(B, A);
    let AP = p5.Vector.sub(P, A);
    let t = AP.dot(AB) / AB.magSq();
    let scaledAB = AB.copy().mult(t);
    return p5.Vector.add(A, scaledAB);
}

// intersection of line AB and CD
export function intersectLines(A, B, C, D) {
    let r = p5.Vector.sub(B, A);
    let s = p5.Vector.sub(D, C);
    let t = p5.Vector.sub(C, A).cross(s).z / r.cross(s).z;
    let scaledR = r.copy().mult(t);
    return p5.Vector.add(A, scaledR);
}

// incenter of triangle ABC
export function getIncenter(A, B, C) {
    let a = p5.Vector.dist(B, C);  // BC
    let b = p5.Vector.dist(C, A);  // CA
    let c = p5.Vector.dist(A, B);  // AB
    let perimeter = a + b + c;

    let ix = (a * A.x + b * B.x + c * C.x) / perimeter;
    let iy = (a * A.y + b * B.y + c * C.y) / perimeter;

    // p5.Vector를 직접 생성 (인스턴스 모드에서도 작동)
    return new p5.Vector(ix, iy);
}

// circumcenter of triangle ABC
export function getCircumcenter(A, B, C) {
    // 수직이등분선 방법 사용
    let midAB = new p5.Vector((A.x + B.x) / 2, (A.y + B.y) / 2);
    let midBC = new p5.Vector((B.x + C.x) / 2, (B.y + C.y) / 2);

    let dirAB = p5.Vector.sub(B, A);
    let perpAB = new p5.Vector(-dirAB.y, dirAB.x);
    let pointAB = p5.Vector.add(midAB, perpAB);

    let dirBC = p5.Vector.sub(C, B);
    let perpBC = new p5.Vector(-dirBC.y, dirBC.x);
    let pointBC = p5.Vector.add(midBC, perpBC);

    // 두 수직이등분선의 교점
    return intersectLines(midAB, pointAB, midBC, pointBC);
}

// orthocenter of triangle ABC (수심)
export function getOrthocenter(A, B, C) {
    // A에서 BC에 수직인 선과 B에서 AC에 수직인 선의 교점
    let dirBC = p5.Vector.sub(C, B);
    let perpBC = new p5.Vector(-dirBC.y, dirBC.x); // BC에 수직인 방향
    let pointFromA = p5.Vector.add(A, perpBC);

    let dirAC = p5.Vector.sub(C, A);
    let perpAC = new p5.Vector(-dirAC.y, dirAC.x); // AC에 수직인 방향
    let pointFromB = p5.Vector.add(B, perpAC);

    // 두 수선의 교점
    return intersectLines(A, pointFromA, B, pointFromB);
}

// reflect point P over line AB
export function reflectPoint(P, A, B) {
    let projection = projectPointToLine(P, A, B);
    let reflection = p5.Vector.sub(projection, P).mult(2);
    return p5.Vector.add(P, reflection);
}

// circle-line intersection
// returns array of intersection points (0, 1, or 2 points)
export function circleLineIntersection(center, radius, p1, p2) {
    let d = p5.Vector.sub(p2, p1);
    let f = p5.Vector.sub(p1, center);

    let a = d.dot(d);
    let b = 2 * f.dot(d);
    let c = f.dot(f) - radius * radius;

    let discriminant = b * b - 4 * a * c;
    if (discriminant < 0) {
        return [];
    }

    discriminant = Math.sqrt(discriminant);

    let t1 = (-b - discriminant) / (2 * a);
    let t2 = (-b + discriminant) / (2 * a);

    // p5.Vector를 직접 생성 (인스턴스 모드에서도 작동)
    let point1 = new p5.Vector(
        p1.x + t1 * d.x,
        p1.y + t1 * d.y
    );
    let point2 = new p5.Vector(
        p1.x + t2 * d.x,
        p1.y + t2 * d.y
    );

    return [point1, point2];
}
