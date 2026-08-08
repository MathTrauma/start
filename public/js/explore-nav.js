(function () {
    document.addEventListener('DOMContentLoaded', function () {
        const toggle = document.getElementById('explore-toggle');
        const sidebar = document.getElementById('explore-sidebar');
        const overlay = document.getElementById('explore-overlay');
        const closeBtn = document.getElementById('explore-close');

        function openNav() {
            sidebar.classList.add('open');
            overlay.classList.add('open');
        }

        function closeNav() {
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
        }

        toggle.addEventListener('click', function () {
            sidebar.classList.contains('open') ? closeNav() : openNav();
        });

        overlay.addEventListener('click', closeNav);
        closeBtn.addEventListener('click', closeNav);

        document.querySelectorAll('.explore-item').forEach(function (item) {
            item.addEventListener('click', function (e) {
                var target = this.dataset.target;
                if (!target) return; // data-target 없으면 기본 링크 동작
                e.preventDefault();
                closeNav();
                setTimeout(function () {
                    var el = document.getElementById(target);
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 300);
            });
        });

        // 준비중 게이팅: 로컬 테스트에서는 진입 허용, 프로덕션에서는 링크 비활성 + '준비중'
        var host = location.hostname;
        var isLocal = host === 'localhost' || host === '127.0.0.1' || host === '' ||
            host === '0.0.0.0' || /\.local$/.test(host) || location.protocol === 'file:';
        if (!isLocal) {
            document.querySelectorAll('[data-wip]').forEach(function (el) {
                el.classList.add('is-wip');
                el.setAttribute('aria-disabled', 'true');
                if (!el.querySelector('.wip-badge')) {
                    var badge = document.createElement('span');
                    badge.className = 'wip-badge';
                    badge.textContent = '준비중';
                    el.appendChild(badge);
                }
                el.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });
        }
    });
})();
