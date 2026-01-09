// Geometry utility functions
// p5 is assumed to be available globally or passed via p instance

// projection of P onto line AB
function projectPointToLine(P, A, B) {
    const Vector = P.constructor;
    let AB = Vector.sub(B, A);
    let AP = Vector.sub(P, A);
    let t = AP.dot(AB) / AB.magSq();
    let scaledAB = AB.copy().mult(t);
    return Vector.add(A, scaledAB);
}

// intersection of line AB and CD
function intersectLines(A, B, C, D) {
    const Vector = A.constructor;
    
    const dxAB = B.x - A.x;
    const dyAB = B.y - A.y;
    const dxCD = D.x - C.x;
    const dyCD = D.y - C.y;
    
    // Denominator = cross product of direction vectors (2D determinant)
    const denom = dxAB * dyCD - dyAB * dxCD;
    
    // Check for parallel lines
    if (Math.abs(denom) < 0.000001) return null;

    const dxAC = C.x - A.x;
    const dyAC = C.y - A.y;
    
    // t = ((C - A) x (D - C)) / denom
    const t = (dxAC * dyCD - dyAC * dxCD) / denom;
    
    const x = A.x + t * dxAB;
    const y = A.y + t * dyAB;
    
    return new Vector(x, y);
}

// incenter of triangle ABC
function getIncenter(A, B, C) {
    const Vector = A.constructor;
    let a = Vector.dist(B, C);  // BC
    let b = Vector.dist(C, A);  // CA
    let c = Vector.dist(A, B);  // AB
    let perimeter = a + b + c;

    let ix = (a * A.x + b * B.x + c * C.x) / perimeter;
    let iy = (a * A.y + b * B.y + c * C.y) / perimeter;

    return new Vector(ix, iy);
}

// circumcenter of triangle ABC
function getCircumcenter(A, B, C) {
    const Vector = A.constructor;
    // 수직이등분선 방법 사용
    let midAB = new Vector((A.x + B.x) / 2, (A.y + B.y) / 2);
    let midBC = new Vector((B.x + C.x) / 2, (B.y + C.y) / 2);

    let dirAB = Vector.sub(B, A);
    let perpAB = new Vector(-dirAB.y, dirAB.x);
    let pointAB = Vector.add(midAB, perpAB);

    let dirBC = Vector.sub(C, B);
    let perpBC = new Vector(-dirBC.y, dirBC.x);
    let pointBC = Vector.add(midBC, perpBC);

    // 두 수직이등분선의 교점
    return intersectLines(midAB, pointAB, midBC, pointBC);
}

// orthocenter of triangle ABC (수심)
function getOrthocenter(A, B, C) {
    const Vector = A.constructor;
    // A에서 BC에 수직인 선과 B에서 AC에 수직인 선의 교점
    let dirBC = Vector.sub(C, B);
    let perpBC = new Vector(-dirBC.y, dirBC.x); // BC에 수직인 방향
    let pointFromA = Vector.add(A, perpBC);

    let dirAC = Vector.sub(C, A);
    let perpAC = new Vector(-dirAC.y, dirAC.x); // AC에 수직인 방향
    let pointFromB = Vector.add(B, perpAC);

    // 두 수선의 교점
    return intersectLines(A, pointFromA, B, pointFromB);
}

// reflect point P over line AB
function reflectPoint(P, A, B) {
    const Vector = P.constructor;
    let projection = projectPointToLine(P, A, B);
    let reflection = Vector.sub(projection, P).mult(2);
    return Vector.add(P, reflection);
}

// circle-line intersection
// returns array of intersection points (0, 1, or 2 points)
function circleLineIntersection(center, radius, p1, p2) {
    const Vector = center.constructor;
    let d = Vector.sub(p2, p1);
    let f = Vector.sub(p1, center);

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

    let point1 = new Vector(
        p1.x + t1 * d.x,
        p1.y + t1 * d.y
    );
    let point2 = new Vector(
        p1.x + t2 * d.x,
        p1.y + t2 * d.y
    );

    return [point1, point2];
}