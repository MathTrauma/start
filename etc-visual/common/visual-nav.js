// Visual Navigation Sidebar
(function() {
    // 현재 페이지 경로 계산
    const currentPath = window.location.pathname;

    // etc-visual 기준 상대 경로 계산
    function getBasePath() {
        const depth = (currentPath.match(/etc-visual/g) || []).length > 0
            ? currentPath.split('/etc-visual/')[1].split('/').length - 1
            : 0;
        return depth > 0 ? '../'.repeat(depth) : './';
    }

    const basePath = getBasePath();

    // 네비게이션 데이터
    const navData = [
        {
            title: '1. Reorganize',
            items: [
                { name: 'Tangram', path: '1-reorganize/1-tangram.html' },
                { name: 'Tangram 2', path: '1-reorganize/2-tangram.html' }
            ]
        },
        {
            title: '2. Make Table',
            items: [
                { name: 'Counting Path', path: '2-makeTable/1-counting-path.html' }
            ]
        }
    ];

    // 사이드바 HTML 생성
    function createSidebarHTML() {
        let menuHTML = '';
        navData.forEach(chapter => {
            let itemsHTML = '';
            chapter.items.forEach(item => {
                const href = basePath + item.path;
                const isActive = currentPath.includes(item.path) ? ' class="active"' : '';
                itemsHTML += `<li><a href="${href}"${isActive}>${item.name}</a></li>`;
            });
            menuHTML += `
                <li class="visual-nav-chapter">
                    <span class="visual-nav-chapter-title">${chapter.title}</span>
                    <ul class="visual-nav-items">${itemsHTML}</ul>
                </li>`;
        });

        return `
            <!-- Hamburger Button -->
            <button class="visual-nav-toggle" id="visualNavToggle">
                <svg viewBox="0 0 24 24">
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <line x1="3" y1="12" x2="21" y2="12"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
            </button>

            <!-- Sidebar -->
            <nav class="visual-nav-sidebar" id="visualNavSidebar">
                <div class="visual-nav-header">
                    <h3>Visual Contents</h3>
                    <button class="visual-nav-close" id="visualNavClose">
                        <svg viewBox="0 0 24 24">
                            <line x1="19" y1="12" x2="5" y2="12"/>
                            <polyline points="12 19 5 12 12 5"/>
                        </svg>
                    </button>
                </div>
                <a href="${basePath}../index.html" class="visual-nav-home">
                    <svg viewBox="0 0 24 24">
                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                    <span>랜딩 페이지</span>
                </a>
                <ul class="visual-nav-menu">${menuHTML}</ul>
            </nav>

            <!-- Overlay -->
            <div class="visual-nav-overlay" id="visualNavOverlay"></div>
        `;
    }

    // DOM에 삽입
    function init() {
        // 사이드바 컨테이너 생성
        const container = document.createElement('div');
        container.id = 'visualNavContainer';
        container.innerHTML = createSidebarHTML();
        document.body.insertBefore(container, document.body.firstChild);

        // 이벤트 리스너 등록
        const toggle = document.getElementById('visualNavToggle');
        const sidebar = document.getElementById('visualNavSidebar');
        const overlay = document.getElementById('visualNavOverlay');
        const close = document.getElementById('visualNavClose');

        function openNav() {
            sidebar.classList.add('open');
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
        }

        function closeNav() {
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        }

        toggle.addEventListener('click', openNav);
        close.addEventListener('click', closeNav);
        overlay.addEventListener('click', closeNav);

        // ESC 키로 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sidebar.classList.contains('open')) {
                closeNav();
            }
        });
    }

    // DOM 로드 후 실행
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
