import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const container = document.getElementById('app');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(
  45, container.clientWidth / container.clientHeight, 0.1, 100
);
camera.position.set(6, 4, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.5, -0.5);
controls.enableDamping = true;
controls.update();

window.addEventListener('resize', () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});

// ── 좌표 매핑 (블렌더 컨벤션) ──
// 학교수학 x → Three.js x
// 학교수학 y → Three.js -z
// 학교수학 z → Three.js y

const RANGE = 4;
const STEPS = 200;

const COLOR_F    = 0xe74c3c;
const COLOR_G    = 0x2ecc71;
const COLOR_GF   = 0x3498db;
const COLOR_GRID = 0xcccccc;
const COLOR_AXIS = 0x444444;

// ── 함수 정의 ──

let f = x => x;
let g = x => Math.abs(x);

function updateFFromCoeffs() {
  const a = parseFloat(document.getElementById('coeff-a').value) || 0;
  const b = parseFloat(document.getElementById('coeff-b').value) || 0;
  const c = parseFloat(document.getElementById('coeff-c').value) || 0;
  f = x => a * x * x + b * x + c;
}

function updateGFromSelect() {
  const v = document.getElementById('g-select').value;
  if (v === 'abs') g = x => Math.abs(x);
  else g = x => Math.floor(x);
}

// ── 헬퍼 ──

function makePlane(w, h, color, opacity) {
  const geo = new THREE.PlaneGeometry(w, h);
  const mat = new THREE.MeshBasicMaterial({
    color, opacity, transparent: true, side: THREE.DoubleSide, depthWrite: false
  });
  return new THREE.Mesh(geo, mat);
}

function makeAxis(from, to, color) {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(...from), new THREE.Vector3(...to)
  ]);
  return new THREE.Line(geo, new THREE.LineBasicMaterial({ color }));
}

function makeLabel(text, pos, color = '#444') {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.font = 'bold 40px sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 32);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false })
  );
  sprite.position.set(...pos);
  sprite.scale.set(0.8, 0.4, 1);
  return sprite;
}

function makeGrid(buildPt) {
  const pts = [];
  for (let i = -RANGE; i <= RANGE; i++) {
    pts.push(buildPt(i, -RANGE), buildPt(i, RANGE));
    pts.push(buildPt(-RANGE, i), buildPt(RANGE, i));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.LineSegments(geo,
    new THREE.LineBasicMaterial({ color: COLOR_GRID, transparent: true, opacity: 0.3 }));
}

function makeCurve(buildPt, color) {
  const pts = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = -RANGE + (2 * RANGE * i) / STEPS;
    const p = buildPt(t);
    if (p && isFinite(p.x) && isFinite(p.y) && isFinite(p.z)) pts.push(p);
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.Line(geo, new THREE.LineBasicMaterial({ color, linewidth: 3 }));
}

const S = RANGE * 2;

// ── 고정 구조물: 평면, 그리드, 축 ──

// xy 평면 = 바닥 (Three.js y=0, 학교수학 z=0) — f
const planeF = makePlane(S, S, COLOR_F, 0.06);
planeF.rotation.x = -Math.PI / 2;
scene.add(planeF);
scene.add(makeGrid((a, b) => new THREE.Vector3(a, 0, b)));

// yz 평면 = 왼쪽벽 (Three.js x=0, 학교수학 x=0) — g
const planeG = makePlane(S, S, COLOR_G, 0.06);
planeG.rotation.y = Math.PI / 2;
scene.add(planeG);
scene.add(makeGrid((a, b) => new THREE.Vector3(0, a, b)));

// 축
scene.add(makeAxis([-RANGE, 0, 0], [RANGE, 0, 0], COLOR_AXIS));
scene.add(makeAxis([0, -RANGE, 0], [0, RANGE, 0], COLOR_AXIS));
scene.add(makeAxis([0, 0, -RANGE], [0, 0, RANGE], COLOR_AXIS));

scene.add(makeLabel('x', [RANGE + 0.4, 0, 0]));
scene.add(makeLabel('z', [0, RANGE + 0.4, 0]));
scene.add(makeLabel('y', [0, 0, -(RANGE + 0.4)]));

// ── 동적 커브 (함수 변경 시 재생성) ──

let fCurve = null;
let gCurve = null;

// ── 합성함수 그룹 (이동 가능) ──

const compositeGroup = new THREE.Group();
scene.add(compositeGroup);

compositeGroup.add(makePlane(S, S, COLOR_GF, 0.06));
compositeGroup.add(makeGrid((a, b) => new THREE.Vector3(a, b, 0)));

let compositeCurve = null;

// ── 트레이스 ──

const traceMat = new THREE.LineDashedMaterial({
  color: 0x999999, dashSize: 0.15, gapSize: 0.1
});
const dotGeo = new THREE.SphereGeometry(0.06, 16, 16);
let traceObjs = [];

function updateTrace(x0, zOffset) {
  traceObjs.forEach(o => scene.remove(o));
  traceObjs = [];

  const y0 = f(x0);
  const z0 = g(y0);

  const segs = [
    [new THREE.Vector3(x0, 0, 0),           new THREE.Vector3(x0, 0, -y0)],
    [new THREE.Vector3(x0, 0, -y0),         new THREE.Vector3(0, 0, -y0)],
    [new THREE.Vector3(0, 0, -y0),          new THREE.Vector3(0, z0, -y0)],
    [new THREE.Vector3(0, z0, -y0),         new THREE.Vector3(0, z0, zOffset)],
    [new THREE.Vector3(0, z0, zOffset),     new THREE.Vector3(x0, z0, zOffset)],
  ];

  for (const [a, b] of segs) {
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    const line = new THREE.Line(geo, traceMat.clone());
    line.computeLineDistances();
    scene.add(line);
    traceObjs.push(line);
  }

  const dots = [
    { pos: [x0, 0, -y0],       color: COLOR_F },
    { pos: [0, z0, -y0],       color: COLOR_G },
    { pos: [x0, z0, zOffset],  color: COLOR_GF },
  ];
  for (const { pos, color } of dots) {
    const dot = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color }));
    dot.position.set(...pos);
    scene.add(dot);
    traceObjs.push(dot);
  }
}

// ── 전체 커브 재생성 ──

function rebuildCurves() {
  if (fCurve) scene.remove(fCurve);
  if (gCurve) scene.remove(gCurve);
  if (compositeCurve) compositeGroup.remove(compositeCurve);

  fCurve = makeCurve(t => new THREE.Vector3(t, 0, -f(t)), COLOR_F);
  scene.add(fCurve);

  gCurve = makeCurve(t => new THREE.Vector3(0, g(t), -t), COLOR_G);
  scene.add(gCurve);

  compositeCurve = makeCurve(t => new THREE.Vector3(t, g(f(t)), 0), COLOR_GF);
  compositeGroup.add(compositeCurve);

  updateTrace(currentX, -currentPlaneOffset);
}

// ── 상태 ──

let currentX = 1.5;
// 슬라이더 값은 학교수학 y 기준, Three.js z = -y
let currentPlaneOffset = 0;

// ── UI 바인딩 ──

const xSlider = document.getElementById('x-slider');
const xVal = document.getElementById('x-value');
const planeSlider = document.getElementById('plane-slider');
const planeVal = document.getElementById('plane-value');

xSlider.addEventListener('input', () => {
  currentX = parseFloat(xSlider.value);
  xVal.textContent = currentX.toFixed(1);
  updateTrace(currentX, -currentPlaneOffset);
});

planeSlider.addEventListener('input', () => {
  // 슬라이더 값 = 학교수학 y, Three.js z = -y
  currentPlaneOffset = parseFloat(planeSlider.value);
  planeVal.textContent = currentPlaneOffset.toFixed(1);
  compositeGroup.position.z = -currentPlaneOffset;
  updateTrace(currentX, -currentPlaneOffset);
});

document.getElementById('coeff-a').addEventListener('input', () => { updateFFromCoeffs(); rebuildCurves(); });
document.getElementById('coeff-b').addEventListener('input', () => { updateFFromCoeffs(); rebuildCurves(); });
document.getElementById('coeff-c').addEventListener('input', () => { updateFFromCoeffs(); rebuildCurves(); });
document.getElementById('g-select').addEventListener('change', () => { updateGFromSelect(); rebuildCurves(); });

// ── 초기화 ──

updateFFromCoeffs();
updateGFromSelect();
rebuildCurves();

// ── 루프 ──

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
