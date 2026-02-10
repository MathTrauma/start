import * as THREE from 'three';
import gsap from 'gsap';

// ========================================
// Configuration
// ========================================
// 비디오 비율: 774x766 (거의 1:1)
const GRID_X = 16;
const GRID_Y = 16;
const CAMERA_FOV = 40;
const CAMERA_Z_DESKTOP = 8;
const CAMERA_Z_MOBILE = 12;

function calcSectionDistance(fov, cameraZ) {
    return 2 * cameraZ * Math.tan(THREE.MathUtils.degToRad(fov / 2));
}

// ========================================
// State
// ========================================
let scene, camera, renderer, pointLight;
let video1, video2, texture1, texture2;
let traumaVideo, traumaTexture;
let cubes = [];
let materials = [];
let cubeGridGroup;
let sectionMeshes = [];
let currentVideoIndex = 1;
let isTransitioning = false;
let scrollY = 0;
let currentSection = 0;
let sectionDistance = calcSectionDistance(CAMERA_FOV, CAMERA_Z_DESKTOP);
let isGathering = true;

// 랜덤 팝 스케줄 상태
let popSchedule = [];
let popCycleDuration = 0;
let popCycleStart = 0;
const POP_DURATION = 0.8;
const GROUP_INTERVAL = 0.85;

// 마우스 기반 회전
const mouse = { x: 0, y: 0 };
const targetRotation = { x: 0, y: 0 };

const sizes = { width: window.innerWidth, height: window.innerHeight };
let isMobile = sizes.width / sizes.height < 1;
const clock = new THREE.Clock();
let previousTime = 0;

// ========================================
// Init
// ========================================
function init() {
    const canvas = document.querySelector('canvas.webgl-hero');
    if (!canvas) return;

    video1 = document.getElementById('hero-video-1');
    video2 = document.getElementById('hero-video-2');
    if (!video1 || !video2) return;

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(CAMERA_FOV, sizes.width / sizes.height, 1, 100);
    camera.position.z = CAMERA_Z_DESKTOP;
    scene.add(camera);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Light
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(2, 3, -4);
    scene.add(light);

    const light2 = new THREE.DirectionalLight(0xfff4e0, 2);
    light2.position.set(-3, -1, 2);
    scene.add(light2);

    pointLight = new THREE.PointLight(0xffffff, 15, 20);
    pointLight.position.set(-4, 1.8, 6);
    scene.add(pointLight);

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    // Video Textures
    texture1 = new THREE.VideoTexture(video1);
    texture1.colorSpace = THREE.SRGBColorSpace;

    texture2 = new THREE.VideoTexture(video2);
    texture2.colorSpace = THREE.SRGBColorSpace;

    // Trauma video (뒷면용)
    traumaVideo = document.createElement('video');
    traumaVideo.src = 'assets/Trauma.mp4';
    traumaVideo.muted = true;
    traumaVideo.loop = true;
    traumaVideo.playsInline = true;
    traumaVideo.play().catch(e => console.log('Trauma video autoplay blocked:', e));

    traumaTexture = new THREE.VideoTexture(traumaVideo);
    traumaTexture.colorSpace = THREE.SRGBColorSpace;

    // Ensure video is playing
    video1.play().catch(e => console.log('Video1 autoplay blocked:', e));

    // Create sections
    createSection1CubeGrid();
    createSection2Object();
    updateLayout();

    // 초기 흩어짐 → 모임 애니메이션
    playInitialGatherAnimation();

    // Events
    setupEvents();

    // Start
    tick();
}

// ========================================
// Section 1: Video Cube Grid (오른쪽 배치, Y축 회전)
// ========================================
function createSection1CubeGrid() {
    // 큐브 그리드를 담는 그룹 (위치는 updateLayout()에서 설정)
    cubeGridGroup = new THREE.Group();
    cubeGridGroup.rotation.y = -0.3;
    scene.add(cubeGridGroup);

    // 그리드 전체 크기 (비디오가 거의 정사각형)
    const totalWidth = 4;
    //const totalWidth = 3.5;
    const totalHeight = totalWidth * (766 / 774); // 실제 비디오 비율

    const cubeWidth = totalWidth / GRID_X;
    const cubeHeight = totalHeight / GRID_Y;
    const cubeDepth = cubeWidth ;

    const ux = 1 / GRID_X;
    const uy = 1 / GRID_Y;

    for (let i = 0; i < GRID_X; i++) {
        for (let j = 0; j < GRID_Y; j++) {
            // 틈 없이
            const geometry = new THREE.BoxGeometry(cubeWidth, cubeHeight, cubeDepth);

            // UV 변환 (전면 + 측면)
            changeUVs(geometry, ux, uy, i, j);

            // 뒷면(-Z) UV: x 인덱스 반전
            const mirroredI = GRID_X - 1 - i;
            const uvs = geometry.attributes.uv.array;
            // -Z face = group 5, vertices 20-23, UV indices 40-47
            uvs[40] = (0 + mirroredI) * ux;  uvs[41] = (1 + j) * uy;
            uvs[42] = (1 + mirroredI) * ux;  uvs[43] = (1 + j) * uy;
            uvs[44] = (0 + mirroredI) * ux;  uvs[45] = (0 + j) * uy;
            uvs[46] = (1 + mirroredI) * ux;  uvs[47] = (0 + j) * uy;

            // 전면(+Z): 현재 비디오, 뒷면(-Z): Trauma 비디오
            const frontMat = new THREE.MeshStandardMaterial({ map: texture1, metalness: 0.8, roughness: 0.2 });
            const backMat = new THREE.MeshStandardMaterial({ map: traumaTexture, metalness: 0.8, roughness: 0.2 });
            const sideMat = new THREE.MeshStandardMaterial({
                color: 0xc0c0c0,
                metalness: 1.0,
                roughness: 0.15
            });
            materials.push(frontMat);

            // BoxGeometry 면 순서: +X, -X, +Y, -Y, +Z(전면), -Z(뒷면)
            const mesh = new THREE.Mesh(geometry, [
                sideMat, sideMat,
                sideMat, sideMat,
                frontMat, backMat
            ]);

            // 위치: 그룹 내에서 그리드 중앙 기준
            mesh.position.x = (i - GRID_X / 2 + 0.5) * cubeWidth;
            mesh.position.y = (j - GRID_Y / 2 + 0.5) * cubeHeight;
            mesh.position.z = 0;

            mesh.userData.originalPosition = mesh.position.clone();
            mesh.userData.gridIndex = { i, j };

            cubeGridGroup.add(mesh);
            cubes.push(mesh);
        }
    }

    sectionMeshes.push(cubeGridGroup);
}

// ========================================
// Section 2: Icosahedron wireframe (왼쪽 배치)
// ========================================
function createSection2Object() {
    const geometry = new THREE.IcosahedronGeometry(1.2, 0);
    const material = new THREE.MeshStandardMaterial({
        color: 0x6366f1,
        roughness: 0.3,
        metalness: 0.6,
        wireframe: true
    });

    // 위치는 updateLayout()에서 설정
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    sectionMeshes.push(mesh);
}

// ========================================
// Layout: 모든 섹션 오브젝트 위치를 일괄 계산
// ========================================
function updateLayout() {
    isMobile = sizes.width / sizes.height < 1;
    const offsetX = Math.max(0, (18 / 7) * (camera.aspect - 1));

    // 카메라 거리에 비례해 섹션 간격 조정
    camera.position.z = isMobile ? CAMERA_Z_MOBILE : CAMERA_Z_DESKTOP;
    sectionDistance = calcSectionDistance(CAMERA_FOV, camera.position.z);

    // Section 1: Cube Grid
    if (cubeGridGroup) {
        cubeGridGroup.position.x = offsetX;
        cubeGridGroup.position.y = isMobile ? 1.5 : 0;
        cubeGridGroup.position.z = 0;
    }

    // Section 2: Icosahedron
    if (sectionMeshes[1]) {
        sectionMeshes[1].position.x = -offsetX;
        sectionMeshes[1].position.y = -sectionDistance + (isMobile ? 1 : 0);
    }
}

// ========================================
// UV 변환
// ========================================
function changeUVs(geometry, unitx, unity, offsetx, offsety) {
    const uvs = geometry.attributes.uv.array;
    for (let i = 0; i < uvs.length; i += 2) {
        uvs[i] = (uvs[i] + offsetx) * unitx;
        uvs[i + 1] = (uvs[i + 1] + offsety) * unity;
    }
}

// ========================================
// 랜덤 팝 스케줄 생성 (2~5개씩 그룹)
// ========================================
function generatePopSchedule() {
    const indices = Array.from({ length: cubes.length }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    popSchedule = new Array(cubes.length);
    let pos = 0;
    let groupCount = 0;

    while (pos < indices.length) {
        const groupSize = 2 + Math.floor(Math.random() * 4); // 2~5개
        const groupTime = groupCount * GROUP_INTERVAL;
        for (let k = 0; k < groupSize && pos < indices.length; k++, pos++) {
            popSchedule[indices[pos]] = groupTime;
        }
        groupCount++;
    }

    popCycleDuration = groupCount * GROUP_INTERVAL + POP_DURATION + 0.3;
}

// ========================================
// 초기 흩어짐 → 모임 애니메이션
// ========================================
function playInitialGatherAnimation() {
    isGathering = true;

    cubes.forEach((cube) => {
        // 랜덤 흩어진 위치로 설정
        cube.position.x += (Math.random() - 0.5) * 8;
        cube.position.y += (Math.random() - 0.5) * 8;
        cube.position.z = Math.random() * 3 + 1;
        cube.rotation.x = (Math.random() - 0.5) * Math.PI;
        cube.rotation.y = (Math.random() - 0.5) * Math.PI;

        const delay = Math.random() * 0.6;

        gsap.to(cube.position, {
            x: cube.userData.originalPosition.x,
            y: cube.userData.originalPosition.y,
            z: cube.userData.originalPosition.z,
            duration: 1.5,
            delay,
            ease: 'power3.out'
        });

        gsap.to(cube.rotation, {
            x: 0, y: 0, z: 0,
            duration: 1.5,
            delay,
            ease: 'power3.out'
        });
    });

    // 모든 애니메이션 완료 후 팝 효과 시작
    gsap.delayedCall(2.2, () => {
        isGathering = false;
        popCycleStart = clock.getElapsedTime();
        generatePopSchedule();
    });
}

// ========================================
// Video Transition
// ========================================
function transitionToVideo(nextVideoIndex) {
    if (isTransitioning) return;
    isTransitioning = true;

    const nextTexture = nextVideoIndex === 1 ? texture1 : texture2;
    const nextVideo = nextVideoIndex === 1 ? video1 : video2;

    nextVideo.currentTime = 0;
    nextVideo.play();

    const tl = gsap.timeline({
        onComplete: () => {
            currentVideoIndex = nextVideoIndex;
            isTransitioning = false;
        }
    });

    // Explode
    cubes.forEach((cube) => {
        const { i, j } = cube.userData.gridIndex;
        const delay = i * 0.015 + j * 0.02;

        tl.to(cube.position, {
            x: cube.userData.originalPosition.x + (Math.random() - 0.5) * 2,
            y: cube.userData.originalPosition.y + (Math.random() - 0.5) * 2,
            z: Math.random() * 2 + 0.5,
            duration: 0.4,
            ease: 'power2.out'
        }, delay);

        tl.to(cube.rotation, {
            x: (Math.random() - 0.5) * Math.PI,
            y: (Math.random() - 0.5) * Math.PI,
            duration: 0.4,
            ease: 'power2.out'
        }, delay);
    });

    // Change texture
    tl.call(() => {
        materials.forEach(mat => {
            mat.map = nextTexture;
            mat.needsUpdate = true;
        });
    }, null, 0.5);

    // Assemble
    cubes.forEach((cube) => {
        const { i, j } = cube.userData.gridIndex;
        const delay = 0.6 + i * 0.015 + j * 0.02;

        tl.to(cube.position, {
            x: cube.userData.originalPosition.x,
            y: cube.userData.originalPosition.y,
            z: cube.userData.originalPosition.z,
            duration: 0.5,
            ease: 'power2.inOut'
        }, delay);

        tl.to(cube.rotation, {
            x: 0, y: 0, z: 0,
            duration: 0.5,
            ease: 'power2.inOut'
        }, delay);
    });
}

// ========================================
// Events
// ========================================
function setupEvents() {
    window.addEventListener('resize', () => {
        sizes.width = window.innerWidth;
        sizes.height = window.innerHeight;
        camera.aspect = sizes.width / sizes.height;
        camera.updateProjectionMatrix();
        renderer.setSize(sizes.width, sizes.height);
        updateLayout();
    });

    window.addEventListener('scroll', () => {
        scrollY = window.scrollY;
        const newSection = Math.round(scrollY / sizes.height);

        if (newSection !== currentSection && newSection < sectionMeshes.length) {
            currentSection = newSection;
            const mesh = sectionMeshes[currentSection];
            if (mesh && mesh.rotation) {
                gsap.to(mesh.rotation, {
                    duration: 1.5,
                    ease: 'power2.inOut',
                    // x: '+=6',
                    y: `+=${Math.PI}`
                });
            }
        }
    });

    // 마우스 움직임으로 씬 회전 (OrbitControls 대신)
    window.addEventListener('mousemove', (e) => {
        mouse.x = (e.clientX / sizes.width) - 0.5;
        mouse.y = (e.clientY / sizes.height) - 0.5;
    });

    // Video transition trigger
    video1.addEventListener('timeupdate', () => {
        if (currentVideoIndex === 1 && !isTransitioning && video1.duration) {
            if (video1.duration - video1.currentTime <= 0.5) {
                transitionToVideo(2);
            }
        }
    });

    video2.addEventListener('timeupdate', () => {
        if (currentVideoIndex === 2 && !isTransitioning && video2.duration) {
            if (video2.duration - video2.currentTime <= 0.5) {
                transitionToVideo(1);
            }
        }
    });
}

// ========================================
// Animation Loop
// ========================================
function tick() {
    const elapsedTime = clock.getElapsedTime();
    const deltaTime = elapsedTime - previousTime;
    previousTime = elapsedTime;

    // 마우스 기반 카메라 회전 (부드럽게)
    targetRotation.y = mouse.x * 0.15;
    targetRotation.x = mouse.y * 0.1;

    camera.rotation.y += (targetRotation.y - camera.rotation.y) * 2 * deltaTime;
    camera.rotation.x += (-targetRotation.x - camera.rotation.x) * 2 * deltaTime;

    // Camera Y position based on scroll
    const targetY = -scrollY / sizes.height * sectionDistance;
    camera.position.y += (targetY - camera.position.y) * 0.1;

    // 랜덤 그룹 팝 효과 (2~5개씩 랜덤)
    if (!isTransitioning && !isGathering) {
        const cycleTime = elapsedTime - popCycleStart;

        // 사이클 끝나면 새 스케줄 생성
        if (cycleTime >= popCycleDuration) {
            popCycleStart = elapsedTime;
            generatePopSchedule();
        }

        const t = elapsedTime - popCycleStart;

        cubes.forEach((cube, idx) => {
            const groupTime = popSchedule[idx];
            const diff = t - groupTime;
            let pop = 0;
            if (diff > 0 && diff < POP_DURATION) {
                pop = Math.sin((diff / POP_DURATION) * Math.PI);
            }
            cube.position.z = cube.userData.originalPosition.z + pop * 1.2;
        });
    }

    // Section 2 rotation
    if (sectionMeshes[1]) {
        // sectionMeshes[1].rotation.x += deltaTime * 0.1;
        sectionMeshes[1].rotation.y += deltaTime * 0.15;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
}

// ========================================
// Start
// ========================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
