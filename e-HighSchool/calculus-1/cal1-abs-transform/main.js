import * as THREE from 'three';

const container = document.getElementById('app');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

// ── 뷰 설정 ──

const VIEW = { xMin: -0.8, xMax: 5.0, yMin: -0.6, yMax: 4.5 };
const viewW = VIEW.xMax - VIEW.xMin;
const viewH = VIEW.yMax - VIEW.yMin;
const cx = (VIEW.xMin + VIEW.xMax) / 2;
const cy = (VIEW.yMin + VIEW.yMax) / 2;

function calcCam(aspect) {
  let w, h;
  if (viewW / viewH > aspect) { w = viewW; h = viewW / aspect; }
  else { h = viewH; w = viewH * aspect; }
  return { w, h };
}

const aspect0 = container.clientWidth / container.clientHeight;
const c0 = calcCam(aspect0);
const camera = new THREE.OrthographicCamera(
  cx - c0.w / 2, cx + c0.w / 2,
  cy + c0.h / 2, cy - c0.h / 2,
  0.1, 10
);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  const a = container.clientWidth / container.clientHeight;
  const c = calcCam(a);
  camera.left = cx - c.w / 2; camera.right = cx + c.w / 2;
  camera.top = cy + c.h / 2; camera.bottom = cy - c.h / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});

// ── 구간별 함수 정의 (trauma.py 기반) ──

// 기저 함수 (|·−a| 적용 전)
const pieces = [
  { start: 0, end: 1, fn: x => 1 - x, startOpen: true, endOpen: false },
  { start: 1, end: 2, fn: x => 3 - x, startOpen: true, endOpen: true },
  { start: 2, end: 3, fn: x => 3 - x, startOpen: true, endOpen: true },
  { start: 3, end: 4, fn: x => x - 2, startOpen: false, endOpen: true },
];

// 불연속점의 함수값 (채운 점)
const filledPts = { 1: 0, 2: 0, 3: 1 };
// 불연속점의 극한값 (빈 점)
const openPts = { 0: 1, 1: 2, 2: 1, 3: 0, 4: 2 };

// ── 축, 그리드 (고정) ──

const GRID_COLOR = 0xdddddd;
const AXIS_COLOR = 0x333333;

function drawStatic() {
  const axisMat = new THREE.LineBasicMaterial({ color: AXIS_COLOR });
  const gridMat = new THREE.LineBasicMaterial({ color: GRID_COLOR });

  // 그리드
  for (let i = 0; i <= 4; i++) {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(i, VIEW.yMin, 0), new THREE.Vector3(i, VIEW.yMax, 0)
    ]);
    scene.add(new THREE.Line(g, gridMat));
  }
  for (let j = 0; j <= 4; j++) {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(VIEW.xMin, j, 0), new THREE.Vector3(VIEW.xMax, j, 0)
    ]);
    scene.add(new THREE.Line(g, gridMat));
  }

  // 축
  const xAxis = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(VIEW.xMin, 0, 0), new THREE.Vector3(VIEW.xMax, 0, 0)
  ]);
  scene.add(new THREE.Line(xAxis, axisMat));

  const yAxis = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, VIEW.yMin, 0), new THREE.Vector3(0, VIEW.yMax, 0)
  ]);
  scene.add(new THREE.Line(yAxis, axisMat));

  // 축 숫자 라벨
  for (let i = 1; i <= 4; i++) {
    scene.add(makeNumLabel(String(i), i, -0.25));
  }
  for (let j = 1; j <= 4; j++) {
    scene.add(makeNumLabel(String(j), -0.25, j));
  }
  scene.add(makeNumLabel('O', -0.2, -0.2));
}

function makeNumLabel(text, x, y) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.font = '36px sans-serif';
  ctx.fillStyle = '#888';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 32, 32);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false })
  );
  sprite.position.set(x, y, 0);
  sprite.scale.set(0.3, 0.3, 1);
  return sprite;
}

drawStatic();

// ── 동적 요소 ──

const CURVE_COLOR = 0x3b82f6;
const HLINE_COLOR = 0xef4444;
const FILLED_COLOR = 0x3b82f6;
const OPEN_COLOR = 0x3b82f6;

let dynamicObjs = [];
let hLineObjs = [];

function clearDynamic() {
  dynamicObjs.forEach(o => scene.remove(o));
  dynamicObjs = [];
}

function clearHLine() {
  hLineObjs.forEach(o => scene.remove(o));
  hLineObjs = [];
}

// ── 커브 그리기 ──

function drawCurve(a) {
  clearDynamic();

  const curveMat = new THREE.LineBasicMaterial({ color: CURVE_COLOR });
  const EPS = 0.002;
  const STEP = 0.005;

  for (const piece of pieces) {
    const pts = [];
    const s = piece.startOpen ? piece.start + EPS : piece.start;
    const e = piece.endOpen ? piece.end - EPS : piece.end;

    for (let x = s; x <= e + STEP * 0.5; x += STEP) {
      const xc = Math.min(x, e);
      const y = Math.abs(piece.fn(xc) - a);
      pts.push(new THREE.Vector3(xc, y, 0));
    }

    if (pts.length > 1) {
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, curveMat);
      scene.add(line);
      dynamicObjs.push(line);
    }
  }

  // 채운 점 (실제 함수값)
  const filledGeo = new THREE.CircleGeometry(0.07, 32);
  const filledMat = new THREE.MeshBasicMaterial({ color: FILLED_COLOR });

  for (const [xi, base] of Object.entries(filledPts)) {
    const x = Number(xi);
    const y = Math.abs(base - a);
    const dot = new THREE.Mesh(filledGeo, filledMat);
    dot.position.set(x, y, 0.2);
    scene.add(dot);
    dynamicObjs.push(dot);
  }

  // 빈 점 (극한값)
  const ringGeo = new THREE.RingGeometry(0.04, 0.07, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: OPEN_COLOR, side: THREE.DoubleSide });
  const bgGeo = new THREE.CircleGeometry(0.05, 32);
  const bgMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  for (const [xi, base] of Object.entries(openPts)) {
    const x = Number(xi);
    const y = Math.abs(base - a);

    const bg = new THREE.Mesh(bgGeo, bgMat);
    bg.position.set(x, y, 0.15);
    scene.add(bg);
    dynamicObjs.push(bg);

    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(x, y, 0.2);
    scene.add(ring);
    dynamicObjs.push(ring);
  }
}

// ── 수평선 ──

function drawHLine(t) {
  clearHLine();

  const mat = new THREE.LineBasicMaterial({ color: HLINE_COLOR });
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(VIEW.xMin, t, 0.1),
    new THREE.Vector3(VIEW.xMax, t, 0.1)
  ]);
  const line = new THREE.Line(geo, mat);
  scene.add(line);
  hLineObjs.push(line);
}

// ── 슬라이더 ──

let currentA = 0;
let currentT = 0;

const aSlider = document.getElementById('a-slider');
const aVal = document.getElementById('a-value');
const tSlider = document.getElementById('t-slider');
const tVal = document.getElementById('t-value');

aSlider.addEventListener('input', () => {
  currentA = parseFloat(aSlider.value);
  aVal.textContent = currentA.toFixed(2);
  drawCurve(currentA);
});

tSlider.addEventListener('input', () => {
  currentT = parseFloat(tSlider.value);
  tVal.textContent = currentT.toFixed(2);
  drawHLine(currentT);
});

// ── 초기화 ──

drawCurve(0);
drawHLine(0);

// ── 루프 ──

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
