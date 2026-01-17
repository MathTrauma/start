// Supabase 설정
const SUPABASE_URL = 'https://bdunrluoivhgypwangcx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkdW5ybHVvaXZoZ3lwd2FuZ2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNjc1NTksImV4cCI6MjA4Mjg0MzU1OX0.JBkLVuR8RyOmwMl6_-KPIgsYBy1_qoG90v5j_vt0mSQ';

// 클라이언트 초기화
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabaseClient;

/**
 * 로그인 상태 변화를 감지하고 UI를 업데이트하는 공통 함수
 * @param {Function} callback 세션 상태에 따라 호출될 콜백 함수
 */
function initAuth(callback) {
    // 초기 세션 확인
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (callback) callback(session);
    });

    // 상태 변경 구독
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        if (callback) callback(session);
    });
}

/**
 * 구글 로그인 실행
 */
async function signInWithGoogle() {
    console.log('로그인 시도 중...');
    try {
        // 현재 페이지 URL 저장 (로그인 후 복귀용)
        localStorage.setItem('authRedirect', window.location.href);

        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/auth/callback.html'
            },
        });
        if (error) throw error;
    } catch (err) {
        console.error('로그인 에러:', err.message);
        alert('로그인 중 오류가 발생했습니다.');
    }
}

/**
 * 로그아웃 실행
 */
async function signOut() {
    console.log('로그아웃 시도 중...');
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
    } catch (err) {
        console.error('로그아웃 에러:', err.message);
        alert('로그아웃 중 오류가 발생했습니다.');
    }
}

/**
 * 이메일/비밀번호 로그인
 */
async function signInWithEmail(email, password) {
    console.log('이메일 로그인 시도 중...');
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });
        if (error) throw error;
        closeLoginModal();
        return { success: true, data };
    } catch (err) {
        console.error('로그인 에러:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * 이메일/비밀번호 회원가입
 */
async function signUpWithEmail(email, password) {
    console.log('회원가입 시도 중...');
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
        });
        if (error) throw error;
        return { success: true, data, message: '회원가입 완료! 이메일을 확인해주세요.' };
    } catch (err) {
        console.error('회원가입 에러:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * 로그인 모달 로드
 */
async function loadLoginModal() {
    if (document.getElementById('login-modal')) return;

    try {
        const response = await fetch('/components/login-modal.html');
        const html = await response.text();
        document.body.insertAdjacentHTML('beforeend', html);
        lucide.createIcons();
    } catch (err) {
        console.error('모달 로드 실패:', err);
    }
}

/**
 * 로그인 모달 열기
 */
async function openLoginModal() {
    await loadLoginModal();
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * 로그인 모달 닫기
 */
function closeLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * 로그인 폼 제출 처리
 */
async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    const result = await signInWithEmail(email, password);
    if (!result.success) {
        errorEl.textContent = result.error;
        errorEl.style.display = 'block';
    }
}

/**
 * 회원가입 폼 제출 처리
 */
async function handleSignupSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const passwordConfirm = document.getElementById('signup-password-confirm').value;
    const errorEl = document.getElementById('signup-error');

    if (password !== passwordConfirm) {
        errorEl.textContent = '비밀번호가 일치하지 않습니다.';
        errorEl.style.display = 'block';
        return;
    }

    if (password.length < 6) {
        errorEl.textContent = '비밀번호는 6자 이상이어야 합니다.';
        errorEl.style.display = 'block';
        return;
    }

    const result = await signUpWithEmail(email, password);
    if (result.success) {
        errorEl.style.display = 'none';
        alert(result.message);
        switchToLogin();
    } else {
        errorEl.textContent = result.error;
        errorEl.style.display = 'block';
    }
}

/**
 * 로그인 탭으로 전환
 */
function switchToLogin() {
    document.getElementById('login-form').classList.add('active');
    document.getElementById('signup-form').classList.remove('active');
    document.getElementById('tab-login').classList.add('active');
    document.getElementById('tab-signup').classList.remove('active');
}

/**
 * 회원가입 탭으로 전환
 */
function switchToSignup() {
    document.getElementById('login-form').classList.remove('active');
    document.getElementById('signup-form').classList.add('active');
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('tab-signup').classList.add('active');
}
