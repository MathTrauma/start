/**
 * 이메일 주소 노출 방지
 *
 * HTML 소스에는 "painfultrauma (at) gmail (dot) com" 처럼 사람만 읽는 형태로 두고,
 * 화면에 그릴 때 이 스크립트가 진짜 주소로 바꾼다.
 * 수집 로봇은 대개 @ 를 찾는 정규식을 쓰므로 소스만 긁어가면 주소를 얻지 못한다.
 *
 * 자바스크립트가 꺼져 있어도 사람은 읽을 수 있다 — 개인정보 보호책임자 연락처라
 * 어떤 경우에도 화면에서 사라지면 안 되기 때문이다.
 *
 * 쓰는 법: <span class="contact-email">painfultrauma (at) gmail (dot) com</span>
 */
(function () {
    // 조각을 나눠 둬서 이 파일을 긁어가도 완성된 주소가 나오지 않게 한다.
    var address = ['painful' + 'trauma', 'gmail' + '.' + 'com'].join('@');

    var slots = document.querySelectorAll('.contact-email');
    for (var i = 0; i < slots.length; i++) {
        slots[i].textContent = address;
    }
})();
