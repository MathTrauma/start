import * as THREE from 'three';

// ===== Tangram Core =====
// 사용법: HTML에서 window.TANGRAM_CONFIG 설정 후 이 모듈 import

const DEFAULT_CONFIG = {
    snapThreshold: 0.3,
    gridSize: 1,
    viewSize: 8,
    backgroundColor: 0x888888,
    pieceColors: [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xe91e63],
    pieces: [],
    initialPositions: [],
    enableFlip: false
};

export function initTangram(config = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };

    // ===== 씬 설정 =====
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(cfg.backgroundColor);

    const aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.OrthographicCamera(
        -cfg.viewSize * aspect, cfg.viewSize * aspect,
        cfg.viewSize, -cfg.viewSize,
        0.1, 100
    );
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('container').appendChild(renderer.domElement);

    // ===== 조각 생성 =====
    const pieces = [];

    function createPiece(def, index) {
        const shape = new THREE.Shape();
        shape.moveTo(def.vertices[0][0], def.vertices[0][1]);
        for (let i = 1; i < def.vertices.length; i++) {
            shape.lineTo(def.vertices[i][0], def.vertices[i][1]);
        }
        shape.closePath();

        const geometry = new THREE.ShapeGeometry(shape);
        const color = cfg.pieceColors[index % cfg.pieceColors.length];
        const material = new THREE.MeshBasicMaterial({
            color: color,
            side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geometry, material);

        const edges = new THREE.EdgesGeometry(geometry);
        const outline = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));
        mesh.add(outline);

        mesh.userData = {
            name: def.name,
            index: index,
            localVertices: def.vertices.map(v => [...v]),
            originalColor: color
        };

        return mesh;
    }

    cfg.pieces.forEach((def, i) => {
        const piece = createPiece(def, i);
        const pos = cfg.initialPositions[i] || { x: 0, y: 0 };
        piece.position.set(pos.x, pos.y, 0);
        scene.add(piece);
        pieces.push(piece);
    });

    // ===== 그리드 =====
    const gridHelper = new THREE.GridHelper(20, 20, 0x555577, 0x444466);
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.position.z = -0.1;
    scene.add(gridHelper);

    // ===== 상호작용 =====
    let selectedPiece = null;
    let isDragging = false;
    const dragOffset = new THREE.Vector2();
    const mouse = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();

    function getWorldPosition(event) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        const vec = new THREE.Vector3(mouse.x, mouse.y, 0).unproject(camera);
        return new THREE.Vector2(vec.x, vec.y);
    }

    function selectPiece(piece) {
        if (selectedPiece) {
            selectedPiece.material.color.setHex(selectedPiece.userData.originalColor);
            selectedPiece.position.z = 0;
        }
        selectedPiece = piece;
        if (piece) {
            const c = new THREE.Color(piece.userData.originalColor);
            c.offsetHSL(0, 0, 0.2);
            piece.material.color.copy(c);
            piece.position.z = 0.1;
            const nameEl = document.getElementById('piece-name');
            const infoEl = document.getElementById('selected-info');
            if (nameEl) nameEl.textContent = piece.userData.name;
            if (infoEl) infoEl.classList.add('show');
        } else {
            const infoEl = document.getElementById('selected-info');
            if (infoEl) infoEl.classList.remove('show');
        }
    }

    function getWorldVertices(piece) {
        const vertices = [];
        const cos = Math.cos(piece.rotation.z);
        const sin = Math.sin(piece.rotation.z);
        for (const v of piece.userData.localVertices) {
            const x = v[0] * piece.scale.x;
            const y = v[1] * piece.scale.y;
            vertices.push(new THREE.Vector2(
                x * cos - y * sin + piece.position.x,
                x * sin + y * cos + piece.position.y
            ));
        }
        return vertices;
    }

    function findVertexSnap(draggingPiece) {
        const dragVerts = getWorldVertices(draggingPiece);
        let bestSnap = null, bestDist = cfg.snapThreshold;
        for (const other of pieces) {
            if (other === draggingPiece) continue;
            for (const dv of dragVerts) {
                for (const ov of getWorldVertices(other)) {
                    const dist = dv.distanceTo(ov);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestSnap = new THREE.Vector2(ov.x - dv.x, ov.y - dv.y);
                    }
                }
            }
        }
        return bestSnap;
    }

    function findEdgeSnap(draggingPiece) {
        const dragVerts = getWorldVertices(draggingPiece);
        const dragEdges = [];
        for (let i = 0; i < dragVerts.length; i++) {
            const s = dragVerts[i], e = dragVerts[(i + 1) % dragVerts.length];
            dragEdges.push({
                start: s, end: e,
                dir: new THREE.Vector2().subVectors(e, s).normalize(),
                mid: new THREE.Vector2().addVectors(s, e).multiplyScalar(0.5)
            });
        }
        let bestSnap = null, bestDist = cfg.snapThreshold;
        for (const other of pieces) {
            if (other === draggingPiece) continue;
            const otherVerts = getWorldVertices(other);
            for (let i = 0; i < otherVerts.length; i++) {
                const oS = otherVerts[i], oE = otherVerts[(i + 1) % otherVerts.length];
                const oDir = new THREE.Vector2().subVectors(oE, oS).normalize();
                const oLen = oS.distanceTo(oE);
                for (const de of dragEdges) {
                    if (Math.abs(de.dir.dot(oDir)) < 0.99) continue;
                    const normal = new THREE.Vector2(-oDir.y, oDir.x);
                    const toEdge = new THREE.Vector2().subVectors(de.mid, oS);
                    const dist = Math.abs(toEdge.dot(normal));
                    if (dist < bestDist) {
                        const p1 = new THREE.Vector2().subVectors(de.start, oS).dot(oDir);
                        const p2 = new THREE.Vector2().subVectors(de.end, oS).dot(oDir);
                        if (Math.max(p1, p2) > 0.01 && Math.min(p1, p2) < oLen - 0.01) {
                            bestDist = dist;
                            bestSnap = normal.clone().multiplyScalar(-toEdge.dot(normal));
                        }
                    }
                }
            }
        }
        return bestSnap;
    }

    function findGridSnap(piece) {
        const verts = getWorldVertices(piece);
        let bestSnap = null, bestDist = cfg.snapThreshold;
        for (const v of verts) {
            const gx = Math.round(v.x / cfg.gridSize) * cfg.gridSize;
            const gy = Math.round(v.y / cfg.gridSize) * cfg.gridSize;
            const dist = Math.sqrt((v.x - gx) ** 2 + (v.y - gy) ** 2);
            if (dist < bestDist) {
                bestDist = dist;
                bestSnap = new THREE.Vector2(gx - v.x, gy - v.y);
            }
        }
        return bestSnap;
    }

    function applySnap(piece) {
        let snap = findVertexSnap(piece);
        if (snap) { piece.position.x += snap.x; piece.position.y += snap.y; return; }
        snap = findEdgeSnap(piece);
        if (snap) { piece.position.x += snap.x; piece.position.y += snap.y; return; }
        snap = findGridSnap(piece);
        if (snap) { piece.position.x += snap.x; piece.position.y += snap.y; }
    }

    // SAT 겹침 감지
    function projectPolygon(verts, axis) {
        let min = Infinity, max = -Infinity;
        for (const v of verts) {
            const p = v.x * axis.x + v.y * axis.y;
            min = Math.min(min, p); max = Math.max(max, p);
        }
        return { min, max };
    }

    function getAxes(verts) {
        const axes = [];
        for (let i = 0; i < verts.length; i++) {
            const p1 = verts[i], p2 = verts[(i + 1) % verts.length];
            axes.push(new THREE.Vector2(-(p2.y - p1.y), p2.x - p1.x).normalize());
        }
        return axes;
    }

    function polygonsOverlap(a, b) {
        for (const axis of [...getAxes(a), ...getAxes(b)]) {
            const pA = projectPolygon(a, axis), pB = projectPolygon(b, axis);
            if (pA.max < pB.min + 0.02 || pB.max < pA.min + 0.02) return false;
        }
        return true;
    }

    function checkOverlap(piece) {
        const v = getWorldVertices(piece);
        for (const other of pieces) {
            if (other !== piece && polygonsOverlap(v, getWorldVertices(other))) return true;
        }
        return false;
    }

    function rotatePiece(p, a) {
        p.rotation.z = Math.round((p.rotation.z + a) / (Math.PI / 2)) * (Math.PI / 2);
    }

    function flipPiece(p) {
        p.scale.x *= -1;
    }

    function updatePieceColor(piece) {
        if (checkOverlap(piece)) {
            piece.material.color.setHex(0xff0000);
        } else {
            const c = new THREE.Color(piece.userData.originalColor);
            c.offsetHSL(0, 0, 0.2);
            piece.material.color.copy(c);
        }
    }

    // 이벤트
    renderer.domElement.addEventListener('pointerdown', e => {
        const wp = getWorldPosition(e);
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(pieces, false);
        if (hits.length) {
            selectPiece(hits[0].object);
            isDragging = true;
            dragOffset.set(selectedPiece.position.x - wp.x, selectedPiece.position.y - wp.y);
        } else {
            selectPiece(null);
        }
    });

    renderer.domElement.addEventListener('pointermove', e => {
        if (!isDragging || !selectedPiece) return;
        const wp = getWorldPosition(e);
        selectedPiece.position.x = wp.x + dragOffset.x;
        selectedPiece.position.y = wp.y + dragOffset.y;
        updatePieceColor(selectedPiece);
    });

    renderer.domElement.addEventListener('pointerup', () => {
        if (isDragging && selectedPiece) {
            applySnap(selectedPiece);
            updatePieceColor(selectedPiece);
        }
        isDragging = false;
    });

    document.addEventListener('keydown', e => {
        if (!selectedPiece) return;
        if (e.key.toLowerCase() === 'r') rotatePiece(selectedPiece, Math.PI / 2);
        if (e.key.toLowerCase() === 'f' && cfg.enableFlip) flipPiece(selectedPiece);
        if (e.key === 'Escape') selectPiece(null);
    });

    // 버튼 연결
    const rotateBtn = document.getElementById('rotateBtn');
    const flipBtn = document.getElementById('flipBtn');
    const resetBtn = document.getElementById('resetBtn');

    if (rotateBtn) {
        rotateBtn.onclick = () => selectedPiece && rotatePiece(selectedPiece, Math.PI / 2);
    }

    if (flipBtn && cfg.enableFlip) {
        flipBtn.onclick = () => selectedPiece && flipPiece(selectedPiece);
    } else if (flipBtn) {
        flipBtn.style.display = 'none';
    }

    if (resetBtn) {
        resetBtn.onclick = () => {
            pieces.forEach((p, i) => {
                const pos = cfg.initialPositions[i] || { x: 0, y: 0 };
                p.position.set(pos.x, pos.y, 0);
                p.rotation.z = 0;
                p.scale.set(1, 1, 1);
                p.material.color.setHex(p.userData.originalColor);
            });
            selectPiece(null);
        };
    }

    // 리사이즈
    window.addEventListener('resize', () => {
        const a = window.innerWidth / window.innerHeight;
        camera.left = -cfg.viewSize * a;
        camera.right = cfg.viewSize * a;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // 애니메이션
    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();

    // 외부 접근용 반환
    return { scene, camera, renderer, pieces, selectPiece };
}
