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
                e.preventDefault();
                var target = this.dataset.target;
                closeNav();
                setTimeout(function () {
                    var el = document.getElementById(target);
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 300);
            });
        });
    });
})();
