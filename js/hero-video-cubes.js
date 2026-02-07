import * as THREE from 'three';
import gsap from 'gsap';

// ========================================
// Configuration
// ========================================
// 비디오 비율: 774x766 (거의 1:1)
const GRID_X = 16;
const GRID_Y = 16;
const SECTION_DISTANCE = 4;

// ========================================
// State
// ========================================
let scene, camera, renderer;
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

// 마우스 기반 회전
const mouse = { x: 0, y: 0 };
const targetRotation = { x: 0, y: 0 };

const sizes = { width: window.innerWidth, height: window.innerHeight };
const isMobile = sizes.width / sizes.height < 1;
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
    camera = new THREE.PerspectiveCamera(40, sizes.width / sizes.height, 1, 100);
    camera.position.z = isMobile ? 12 : 8;
    scene.add(camera);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Light
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(0.5, 1, 1).normalize();
    scene.add(light);

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
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

    // Events
    setupEvents();

    // Start
    tick();
}

// ========================================
// Section 1: Video Cube Grid (오른쪽 배치, Y축 회전)
// ========================================
function createSection1CubeGrid() {
    const sectionY = isMobile ? 1 : 0;
    const offsetX = isMobile ? 0 : 1.8;

    // 큐브 그리드를 담는 그룹
    cubeGridGroup = new THREE.Group();
    cubeGridGroup.position.set(offsetX, sectionY, 0);
    cubeGridGroup.rotation.y = -0.3; // Y축 시계방향 회전 (비스듬히)
    scene.add(cubeGridGroup);

    // 그리드 전체 크기 (비디오가 거의 정사각형)
    const totalWidth = 3.5;
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
            const frontMat = new THREE.MeshLambertMaterial({ map: texture1 });
            const backMat = new THREE.MeshLambertMaterial({ map: traumaTexture });
            materials.push(frontMat);

            // BoxGeometry 면 순서: +X, -X, +Y, -Y, +Z(전면), -Z(뒷면)
            const mesh = new THREE.Mesh(geometry, [
                frontMat, frontMat,
                frontMat, frontMat,
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
    const sectionY = isMobile ? -SECTION_DISTANCE - 1 : -SECTION_DISTANCE;
    const offsetX = isMobile ? 0 : -1.8;

    const geometry = new THREE.IcosahedronGeometry(1.2, 0);
    const material = new THREE.MeshStandardMaterial({
        color: 0x6366f1,
        roughness: 0.3,
        metalness: 0.6,
        wireframe: true
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(offsetX, sectionY, 0);

    scene.add(mesh);
    sectionMeshes.push(mesh);
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

        // tl.to(cube.rotation, {
        //     x: (Math.random() - 0.5) * Math.PI,
        //     y: (Math.random() - 0.5) * Math.PI,
        //     duration: 0.4,
        //     ease: 'power2.out'
        // }, delay);
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
    const targetY = -scrollY / sizes.height * SECTION_DISTANCE;
    camera.position.y += (targetY - camera.position.y) * 0.1;

    // 순차 팝 효과 (좌상단 → 우하단, 행 단위)
    if (!isTransitioning) {
        const totalCubes = GRID_X * GRID_Y;
        const speed = 2;
        const popWidth = 1;
        const t = (elapsedTime * speed) % totalCubes;

        cubes.forEach((cube) => {
            const { i, j } = cube.userData.gridIndex;
            const seq = (GRID_Y - 1 - j) * GRID_X + i;
            const diff = t - seq;
            let pop = 0;
            if (diff > 0 && diff < popWidth) {
                pop = Math.sin((diff / popWidth) * Math.PI);
            }
            cube.position.z = cube.userData.originalPosition.z + pop * 0.6;
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
