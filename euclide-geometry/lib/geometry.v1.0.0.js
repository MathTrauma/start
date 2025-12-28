// Geometry utility functions

// projection of P onto line AB
function projectPointToLine(P, A, B) {
    let AB = p5.Vector.sub(B, A);
    let AP = p5.Vector.sub(P, A);
    let t = AP.dot(AB) / AB.magSq();
    return p5.Vector.add(A, AB.mult(t));
}

// intersection of line AB and CD
function intersectLines(A, B, C, D) {
    let r = p5.Vector.sub(B, A);
    let s = p5.Vector.sub(D, C);
    let t = p5.Vector.sub(C, A).cross(s).z / r.cross(s).z;
    return p5.Vector.add(A, r.mult(t));
}
