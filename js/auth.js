// Supabase 설정
const SUPABASE_URL = 'https://bdunrluoivhgypwangcx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkdW5ybHVvaXZoZ3lwd2FuZ2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNjc1NTksImV4cCI6MjA4Mjg0MzU1OX0.JBkLVuR8RyOmwMl6_-KPIgsYBy1_qoG90v5j_vt0mSQ';

// 클라이언트 초기화
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.href // 현재 보고 있는 페이지로 복귀
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
