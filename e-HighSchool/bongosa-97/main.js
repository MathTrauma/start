import * as THREE from 'three';
import { createSetup } from './setup.js';

const r = 1;
const cubeSide = 3 * r;

const container = document.getElementById('app');
const { scene, camera, renderer, controls } = createSetup(container);

// 배경 순백색
scene.background = new THREE.Color(0xffffff);

// 구 하이라이트용 점광원 (envMap 없이 MeshPhysicalMaterial 을 밝게)
const keyLight = new THREE.PointLight(0xffffff, 3.5, 20);
keyLight.position.set(-2, 6, 5);
scene.add(keyLight);

// --- 그릇: 외곽선 ---
const cubeEdges = new THREE.EdgesGeometry(
  new THREE.BoxGeometry(cubeSide, cubeSide, cubeSide)
);
const cube = new THREE.LineSegments(
  cubeEdges,
  new THREE.LineBasicMaterial({ color: 0x222222 })
);
cube.position.y = cubeSide / 2;
scene.add(cube);

// --- 물 ---
const water = new THREE.Mesh(
  new THREE.BoxGeometry(cubeSide, 1, cubeSide),
  new THREE.MeshPhysicalMaterial({
    color: 0x3344ff,       // 밝은 하늘색
    transparent: true,
    opacity: 0.25,
    roughness: 0.0,        // 매끈한 수면
    metalness: 0.0,
    clearcoat: 1.0,        // 수면 반사광
    clearcoatRoughness: 0.0,
    depthWrite: false,     // 투명체 겹침 아티팩트 방지
  })
);
const waterEdges = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(cubeSide, 1, cubeSide)),
  new THREE.LineBasicMaterial({ color: 0x1188cc })
);
water.add(waterEdges);  // water 의 자식 → scale/position 자동 추종
scene.add(water);

function setWaterHeight(h) {
  water.scale.y = Math.max(h, 1e-6);
  water.position.y = h / 2;
}

// --- 공: 맑은 주황-빨강 ---
const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(r, 64, 32),
  new THREE.MeshPhysicalMaterial({
    color: 0xff6600,
    emissive: 0xff2200,
    emissiveIntensity: 0.25,
    roughness: 0.05,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  })
);
scene.add(sphere);

// ── Orthographic camera (정면 고정) ────────────────────────────
const FRONT_POS    = new THREE.Vector3(0, 1.5, 5);
const FRONT_TARGET = new THREE.Vector3(0, 1.5, 0);
const HOME_POS     = new THREE.Vector3(4, 3, 5);   // setup.js 초기 카메라 위치
const HOME_TARGET  = new THREE.Vector3(0, 1.5, 0);

// perspective FOV 45° · 거리 10 에서의 frustum 높이와 일치시켜 전환 시 점프 제거
// VIEW_H = 2 * dist * tan(FOV/2) = 2 * 10 * tan(22.5°) ≈ 8.28
const VIEW_H = 2 * FRONT_POS.distanceTo(FRONT_TARGET) * Math.tan((45 / 2) * Math.PI / 180);

function makeOrtho() {
  const a = container.clientWidth / container.clientHeight;
  return new THREE.OrthographicCamera(
    -VIEW_H * a / 2,  VIEW_H * a / 2,
     VIEW_H / 2,     -VIEW_H / 2,
    0.1, 100
  );
}
const orthoCamera = makeOrtho();
orthoCamera.position.copy(FRONT_POS);
orthoCamera.lookAt(FRONT_TARGET);

window.addEventListener('resize', () => {
  const a = container.clientWidth / container.clientHeight;
  orthoCamera.left   = -VIEW_H * a / 2;
  orthoCamera.right  =  VIEW_H * a / 2;
  orthoCamera.updateProjectionMatrix();
});

// ── Camera transition ──────────────────────────────────────────
const TRANS_DUR = 1.4;
const _lerpTgt  = new THREE.Vector3();
let camTrans    = { active: false, progress: 0, toOrtho: true };
let transStartPos = new THREE.Vector3();
let transStartTgt = new THREE.Vector3();

function easeInOut(x) {
  return x < 0.5 ? 2 * x * x : -1 + (4 - 2 * x) * x;
}

// ── 키 입력 ───────────────────────────────────────────────────
let paused       = false;
let activeCamera = camera;
let camMode      = 'perspective';  // 'perspective' | 'ortho'
let direction    = 1;              // 1: 정방향, -1: 역방향

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    paused = !paused;
    if (!paused && camMode === 'perspective') controls.enabled = true;
  }

  if (e.code === 'KeyC' && !camTrans.active) {
    if (camMode === 'perspective') {
      // perspective → ortho
      transStartPos.copy(camera.position);
      transStartTgt.copy(controls.target);
      camTrans = { active: true, progress: 0, toOrtho: true };
      controls.enabled = false;
      camMode = 'transitioning';
    } else if (camMode === 'ortho') {
      // ortho → perspective: perspective 카메라는 FRONT_POS 에 있음
      camera.position.copy(FRONT_POS);
      camera.lookAt(FRONT_TARGET);
      activeCamera = camera;
      transStartPos.copy(FRONT_POS);
      transStartTgt.copy(FRONT_TARGET);
      camTrans = { active: true, progress: 0, toOrtho: false };
      camMode = 'transitioning';
    }
  }

  if (e.code === 'KeyB') {
    direction *= -1;
  }
});

// ── Simulation: ξ = r (절반 잠긴 순간) 에서 정지 ───────────────
const TRAJ_DT = 0.002;

function buildTrajectory() {
  const traj = [];
  let xi = 0;
  let t  = 0;

  while (true) {
    const ell     = Math.max(0, 1.5 - t);
    const sphereY = ell + r;
    const waterY  = xi + ell;
    traj.push({ t, sphereY, waterY });

    if (ell <= 0) break;

    const denom = 9 - Math.PI * (2 * xi - xi * xi);
    xi = Math.min(xi + (9 / Math.max(denom, 0.01)) * TRAJ_DT, 2 * r);
    t += TRAJ_DT;
  }

  return traj;
}

const trajectory = buildTrajectory();
const simEnd = trajectory[trajectory.length - 1].t;

function getSimulationState(t) {
  const idx = Math.min(Math.floor(t / TRAJ_DT), trajectory.length - 1);
  return trajectory[idx];
}

// ── Animation loop ─────────────────────────────────────────────
const TIME_SCALE = 0.2;   // 실제 1초 = 시뮬레이션 0.2초 (5배 느리게)
const clock = new THREE.Clock();
let simTime = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  // 시뮬레이션 진행
  if (!paused) {
    simTime = Math.max(0, Math.min(simTime + dt * TIME_SCALE * direction, simEnd));
  }

  const { sphereY, waterY } = getSimulationState(simTime);
  sphere.position.y = sphereY;
  setWaterHeight(waterY);

  // 카메라 전환 애니메이션
  if (camTrans.active) {
    camTrans.progress = Math.min(camTrans.progress + dt / TRANS_DUR, 1);
    const alpha  = easeInOut(camTrans.progress);
    const endPos = camTrans.toOrtho ? FRONT_POS : HOME_POS;
    const endTgt = camTrans.toOrtho ? FRONT_TARGET : HOME_TARGET;

    camera.position.lerpVectors(transStartPos, endPos, alpha);
    _lerpTgt.lerpVectors(transStartTgt, endTgt, alpha);
    camera.lookAt(_lerpTgt);

    if (camTrans.progress >= 1) {
      camTrans.active = false;
      if (camTrans.toOrtho) {
        activeCamera = orthoCamera;
        camMode = 'ortho';
      } else {
        camera.position.copy(HOME_POS);
        controls.target.copy(HOME_TARGET);
        controls.enabled = true;
        activeCamera = camera;
        camMode = 'perspective';
      }
    }
  }

if (!paused) controls.update();
  renderer.render(scene, activeCamera);
}
animate();
