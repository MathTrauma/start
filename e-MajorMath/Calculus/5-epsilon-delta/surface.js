import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';

// 다변수함수 z = 4 - √(x²+y²),  정의역 = 원점 중심 반지름 2 원판
// 점 (1,1) 의 δ-근방(반지름 가변)을 곡면에서 다른 색으로 강조.
const container = document.getElementById('app3d');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf5f5f7);

const W0 = container.clientWidth || 600;
const H0 = container.clientHeight || 450;
const camera = new THREE.PerspectiveCamera(45, W0 / H0, 0.1, 100);
camera.position.set(5, 4.2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(W0, H0);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(1, 2, 1);

// ── 조명 ──
scene.add(new THREE.HemisphereLight(0xffffff, 0x999999, 1.3));
const dir = new THREE.DirectionalLight(0xffffff, 0.9);
dir.position.set(5, 10, 7);
scene.add(dir);

// ── 곡면: z = 4 - √(x²+y²),  원판 정의역 (극좌표 매개변수화) ──
const R = 2;
const surfFn = (u, v, target) => {
  const r = v * R;
  const th = u * Math.PI * 2;
  const x = r * Math.cos(th);
  const y = r * Math.sin(th);
  target.set(x, 4 - r, y);   // three: y=높이
};
const geo = new ParametricGeometry(surfFn, 120, 60);

// 정점 색 attribute (δ-근방을 강조색으로)
const pos = geo.attributes.position;
geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3));
const baseCol = new THREE.Color(0x6366f1);   // 기본 (보라)
const hiCol = new THREE.Color(0xf59e0b);     // δ-근방 (주황)

function updateColors(delta) {
  const col = geo.attributes.color;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getZ(i);   // 수학 (x, y)
    const c = Math.hypot(x - 1, y - 1) < delta ? hiCol : baseCol;
    col.setXYZ(i, c.r, c.g, c.b);
  }
  col.needsUpdate = true;
}

const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
  vertexColors: true,
  side: THREE.DoubleSide,
  metalness: 0.1,
  roughness: 0.6,
  transparent: true,
  opacity: 0.4
}));
scene.add(mesh);

// 격자(와이어) 오버레이
scene.add(new THREE.LineSegments(
  new THREE.WireframeGeometry(geo),
  new THREE.LineBasicMaterial({ color: 0x4338ca, transparent: true, opacity: 0.08 })
));

// ── 바닥 격자 + 축 ──
scene.add(new THREE.GridHelper(2 * R, 2 * R * 2, 0xcccccc, 0xe6e6e6));
scene.add(new THREE.AxesHelper(R + 0.6));

// ── (1,1) 정의역 δ-근방 원판 (바닥, 반지름 가변) ──
const disc = new THREE.Mesh(
  new THREE.CircleGeometry(0.5, 64),
  new THREE.MeshBasicMaterial({
    color: 0xf59e0b, transparent: true, opacity: 0.3,
    side: THREE.DoubleSide, depthWrite: false
  })
);
disc.rotation.x = -Math.PI / 2;
disc.position.set(1, 0.01, 1);
scene.add(disc);

function updateDisc(delta) {
  disc.geometry.dispose();
  disc.geometry = new THREE.CircleGeometry(delta, 64);
}

// 바닥 (1,1) 점
scene.add(new THREE.Mesh(
  new THREE.SphereGeometry(0.05, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xb45309 })
).translateX(1).translateY(0.02).translateZ(1));

// ── (1,1) 위 함숫값 점:  z = f(1,1) = 4 - √2 ──
const L11 = 4 - Math.SQRT2;
scene.add(new THREE.Mesh(
  new THREE.SphereGeometry(0.085, 20, 20),
  new THREE.MeshBasicMaterial({ color: 0xef4444 })
).translateX(1).translateY(L11).translateZ(1));

const dline = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(1, 0, 1), new THREE.Vector3(1, L11, 1)
  ]),
  new THREE.LineDashedMaterial({ color: 0xef4444, dashSize: 0.12, gapSize: 0.07 })
);
dline.computeLineDistances();
scene.add(dline);

// ── δ 슬라이더 연동 ──
const delSlider = document.getElementById('delta3d-slider');
const delValEl = document.getElementById('delta3d-value');
function applyDelta(d) {
  updateColors(d);
  updateDisc(d);
  delValEl.textContent = d.toFixed(2);
}
delSlider.addEventListener('input', () => applyDelta(parseFloat(delSlider.value)));
applyDelta(parseFloat(delSlider.value));   // 초기 적용

// ── 리사이즈 ──
window.addEventListener('resize', () => {
  const w = container.clientWidth, h = container.clientHeight;
  if (!w || !h) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

// ── 루프 ──
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
