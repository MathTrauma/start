import * as THREE from 'three';

const container = document.getElementById('app');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

// ── 뷰 설정 ──

// x0=2, L=4 고정 — 뷰 범위도 고정
const VIEW = { xMin: -0.5, xMax: 3.5, yMin: -0.5, yMax: 5 };

function calcCam(aspect) {
  const vw = VIEW.xMax - VIEW.xMin;
  const vh = VIEW.yMax - VIEW.yMin;
  let w, h;
  if (vw / vh > aspect) { w = vw; h = vw / aspect; }
  else { h = vh; w = vh * aspect; }
  return { w, h };
}

function updateCamera() {
  const cx = (VIEW.xMin + VIEW.xMax) / 2;
  const cy = (VIEW.yMin + VIEW.yMax) / 2;
  const a = container.clientWidth / container.clientHeight;
  const c = calcCam(a);
  camera.left = cx - c.w / 2; camera.right = cx + c.w / 2;
  camera.top = cy + c.h / 2; camera.bottom = cy - c.h / 2;
  camera.updateProjectionMatrix();
}

const aspect0 = container.clientWidth / container.clientHeight;
const c0 = calcCam(aspect0);
const cx0 = (VIEW.xMin + VIEW.xMax) / 2;
const cy0 = (VIEW.yMin + VIEW.yMax) / 2;
const camera = new THREE.OrthographicCamera(
  cx0 - c0.w / 2, cx0 + c0.w / 2,
  cy0 + c0.h / 2, cy0 - c0.h / 2,
  0.1, 10
);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  // 탭이 숨겨져 있으면(0 크기) 캔버스를 줄이지 않는다
  if (!container.clientWidth || !container.clientHeight) return;
  renderer.setSize(container.clientWidth, container.clientHeight);
  updateCamera();
});

// ── 함수 (파서는 나중에) ──

const f = x => x * x;

// ── 헬퍼 ──

function makeLine(pts, color, linewidth = 1) {
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color }));
  return line;
}

function makeRect(x, y, w, h, color, opacity) {
  const geo = new THREE.PlaneGeometry(w, h);
  const mat = new THREE.MeshBasicMaterial({
    color, opacity, transparent: true, side: THREE.DoubleSide, depthWrite: false
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x + w / 2, y + h / 2, 0);
  return mesh;
}

function makeLabel(text, x, y, color = '#888', size = 36) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.font = `${size}px sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 32);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false })
  );
  sprite.position.set(x, y, 0);
  sprite.scale.set(0.5, 0.25, 1);
  return sprite;
}

// ── 고정 요소 ──

const staticGroup = new THREE.Group();
scene.add(staticGroup);

function drawStatic() {
  while (staticGroup.children.length) staticGroup.remove(staticGroup.children[0]);

  const gridMat = new THREE.LineBasicMaterial({ color: 0xeeeeee });
  const axisMat = new THREE.LineBasicMaterial({ color: 0x333333 });

  for (let i = Math.ceil(VIEW.xMin); i <= Math.floor(VIEW.xMax); i++) {
    staticGroup.add(makeLine([
      new THREE.Vector3(i, VIEW.yMin, 0), new THREE.Vector3(i, VIEW.yMax, 0)
    ], 0xeeeeee));
    if (i !== 0) staticGroup.add(makeLabel(String(i), i, -0.4));
  }
  for (let j = Math.ceil(VIEW.yMin); j <= Math.floor(VIEW.yMax); j++) {
    staticGroup.add(makeLine([
      new THREE.Vector3(VIEW.xMin, j, 0), new THREE.Vector3(VIEW.xMax, j, 0)
    ], 0xeeeeee));
    if (j !== 0) staticGroup.add(makeLabel(String(j), -0.4, j));
  }

  staticGroup.add(makeLine([
    new THREE.Vector3(VIEW.xMin, 0, 0), new THREE.Vector3(VIEW.xMax, 0, 0)
  ], 0x333333));
  staticGroup.add(makeLine([
    new THREE.Vector3(0, VIEW.yMin, 0), new THREE.Vector3(0, VIEW.yMax, 0)
  ], 0x333333));
}

drawStatic();

// ── 동적 요소 ──

let dynObjs = [];

function clearDynamic() {
  dynObjs.forEach(o => scene.remove(o));
  dynObjs = [];
}

function addObj(o) {
  scene.add(o);
  dynObjs.push(o);
}

function rebuild(x0, L, eps, del) {
  clearDynamic();

  // ε 밴드 (y축: L-ε ~ L+ε)
  const epsBand = makeRect(VIEW.xMin, L - eps, VIEW.xMax - VIEW.xMin, 2 * eps, 0x6366f1, 0.1);
  epsBand.position.z = -0.1;
  addObj(epsBand);

  // ε 경계선
  addObj(makeLine([
    new THREE.Vector3(VIEW.xMin, L - eps, 0.1), new THREE.Vector3(VIEW.xMax, L - eps, 0.1)
  ], 0x6366f1));
  addObj(makeLine([
    new THREE.Vector3(VIEW.xMin, L + eps, 0.1), new THREE.Vector3(VIEW.xMax, L + eps, 0.1)
  ], 0x6366f1));

  // δ 밴드 (x축: x0-δ ~ x0+δ)
  const delBand = makeRect(x0 - del, VIEW.yMin, 2 * del, VIEW.yMax - VIEW.yMin, 0xf59e0b, 0.08);
  delBand.position.z = -0.2;
  addObj(delBand);

  // δ 경계선
  addObj(makeLine([
    new THREE.Vector3(x0 - del, VIEW.yMin, 0.1), new THREE.Vector3(x0 - del, VIEW.yMax, 0.1)
  ], 0xf59e0b));
  addObj(makeLine([
    new THREE.Vector3(x0 + del, VIEW.yMin, 0.1), new THREE.Vector3(x0 + del, VIEW.yMax, 0.1)
  ], 0xf59e0b));

  // L 수평 점선
  const lDash = makeDashed(
    new THREE.Vector3(VIEW.xMin, L, 0.05),
    new THREE.Vector3(VIEW.xMax, L, 0.05),
    0x6366f1
  );
  addObj(lDash);

  // x0 수직 점선
  const x0Dash = makeDashed(
    new THREE.Vector3(x0, VIEW.yMin, 0.05),
    new THREE.Vector3(x0, VIEW.yMax, 0.05),
    0xf59e0b
  );
  addObj(x0Dash);

  // 라벨
  addObj(makeLabel('L', VIEW.xMin + 0.3, L + 0.35, '#6366f1', 32));
  addObj(makeLabel('L+ε', VIEW.xMin + 0.5, L + eps + 0.35, '#6366f1', 28));
  addObj(makeLabel('L−ε', VIEW.xMin + 0.5, L - eps - 0.35, '#6366f1', 28));
  addObj(makeLabel('x₀', x0, VIEW.yMin + 0.35, '#b45309', 28));

  // 함수 커브
  const curvePts = [];
  const step = (VIEW.xMax - VIEW.xMin) / 400;
  for (let x = VIEW.xMin; x <= VIEW.xMax; x += step) {
    const y = f(x);
    if (isFinite(y) && y >= VIEW.yMin - 1 && y <= VIEW.yMax + 1) {
      curvePts.push(new THREE.Vector3(x, y, 0.3));
    }
  }
  if (curvePts.length > 1) {
    addObj(makeLine(curvePts, 0x222222));
  }

  // δ 구간 내 함수 강조
  const hlPts = [];
  const hlStep = del * 2 / 200;
  for (let x = x0 - del; x <= x0 + del; x += hlStep) {
    if (Math.abs(x - x0) < 0.0001) continue;
    const y = f(x);
    if (isFinite(y)) hlPts.push(new THREE.Vector3(x, y, 0.4));
  }
  if (hlPts.length > 1) {
    const hlGeo = new THREE.BufferGeometry().setFromPoints(hlPts);
    const hlLine = new THREE.Line(hlGeo, new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2 }));
    addObj(hlLine);
  }

  // x0 에서 빈 점 (극한점이므로)
  const ringGeo = new THREE.RingGeometry(0.08, 0.12, 32);
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide }));
  ring.position.set(x0, f(x0), 0.5);
  addObj(ring);
  const bgGeo = new THREE.CircleGeometry(0.09, 32);
  const bg = new THREE.Mesh(bgGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
  bg.position.set(x0, f(x0), 0.45);
  addObj(bg);

  // 검증: δ구간 내 모든 함수값이 ε구간 안에 있는지
  let ok = true;
  for (let x = x0 - del; x <= x0 + del; x += hlStep) {
    if (Math.abs(x - x0) < 0.0001) continue;
    const y = f(x);
    if (isFinite(y) && (y > L + eps || y < L - eps)) {
      ok = false;
      break;
    }
  }

  const statusEl = document.getElementById('status');
  if (ok) {
    statusEl.className = 'status-float ok';
    statusEl.textContent = 'δ-구간의 함수값이 ε-구간 안에 있습니다';
  } else {
    statusEl.className = 'status-float fail';
    statusEl.textContent = 'δ-구간의 함수값이 ε-구간을 벗어납니다';
  }
}

function makeDashed(p1, p2, color) {
  const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
  const mat = new THREE.LineDashedMaterial({ color, dashSize: 0.15, gapSize: 0.1 });
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  return line;
}

// ── UI 바인딩 ──

let currentX0 = 2;
let currentL = 4;       // L = f(x0) 로 자동 설정됨
let currentEps = 1.0;
let currentDel = 0.5;

const x0Input = document.getElementById('x0-input');
const lDisplay = document.getElementById('L-display');
const epsSlider = document.getElementById('eps-slider');
const epsVal = document.getElementById('eps-value');
const delSlider = document.getElementById('del-slider');
const delVal = document.getElementById('del-value');

const fmtNum = v => Number.isInteger(v) ? String(v) : v.toFixed(2);

// x0 변경 → L = f(x0) 자동 계산
x0Input.addEventListener('input', () => {
  const v = parseFloat(x0Input.value);
  if (!isFinite(v)) return;
  currentX0 = v;
  currentL = f(currentX0);
  lDisplay.textContent = fmtNum(currentL);
  rebuild(currentX0, currentL, currentEps, currentDel);
});

epsSlider.addEventListener('input', () => {
  currentEps = parseFloat(epsSlider.value);
  epsVal.textContent = currentEps.toFixed(2);
  rebuild(currentX0, currentL, currentEps, currentDel);
});

delSlider.addEventListener('input', () => {
  currentDel = parseFloat(delSlider.value);
  delVal.textContent = currentDel.toFixed(2);
  rebuild(currentX0, currentL, currentEps, currentDel);
});

// ── 초기화 ──

rebuild(currentX0, currentL, currentEps, currentDel);

// ── 루프 ──

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
