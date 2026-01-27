/**
 * Common Error Handler Module
 * Provides consistent error handling across auth and payment operations
 */

/**
 * Handle authentication errors
 * @param {Error} error - The error object
 * @param {string} context - Where the error occurred (e.g., 'login', 'session check')
 */
function handleAuthError(error, context) {
    console.error(`[Auth Error] ${context}:`, error);

    const errorMessages = {
        'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
        'Email not confirmed': '이메일 인증이 필요합니다. 이메일을 확인해주세요.',
        'User already registered': '이미 등록된 이메일입니다.',
        'Password should be at least 6 characters': '비밀번호는 6자 이상이어야 합니다.',
        'Network error': '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.',
    };

    const message = error?.message || '';
    for (const [key, value] of Object.entries(errorMessages)) {
        if (message.includes(key)) {
            return value;
        }
    }

    return '인증 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
}

/**
 * Handle payment errors
 * @param {Error} error - The error object
 * @param {string} context - Where the error occurred (e.g., 'verify', 'create')
 */
function handlePaymentError(error, context) {
    console.error(`[Payment Error] ${context}:`, error);

    const errorMessages = {
        '이미 처리된 결제': '이미 처리된 결제입니다.',
        '결제 금액 불일치': '결제 금액이 일치하지 않습니다.',
        '결제 미완료': '결제가 완료되지 않았습니다.',
        '구독 활성화 실패': '결제는 완료되었으나 구독 활성화에 실패했습니다. 고객센터에 문의해주세요.',
        '유효하지 않은 토큰': '로그인이 만료되었습니다. 다시 로그인해주세요.',
        '인증 토큰이 필요합니다': '로그인이 필요합니다.',
    };

    const message = error?.message || error?.error || '';
    for (const [key, value] of Object.entries(errorMessages)) {
        if (message.includes(key)) {
            return value;
        }
    }

    return '결제 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
}

/**
 * Handle API errors with status codes
 * @param {Response} response - Fetch response object
 * @param {string} context - Where the error occurred
 * @returns {Promise<string>} Error message
 */
async function handleApiError(response, context) {
    console.error(`[API Error] ${context}: HTTP ${response.status}`);

    try {
        const data = await response.json();
        if (data.error) {
            return data.error;
        }
    } catch (e) {
        // JSON parse failed, use status-based message
    }

    const statusMessages = {
        400: '잘못된 요청입니다.',
        401: '인증이 필요합니다. 다시 로그인해주세요.',
        403: '접근 권한이 없습니다.',
        404: '요청한 리소스를 찾을 수 없습니다.',
        409: '이미 처리된 요청입니다.',
        429: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
        500: '서버 오류가 발생했습니다.',
        502: '서버에 연결할 수 없습니다.',
        503: '서비스가 일시적으로 이용 불가합니다.',
    };

    return statusMessages[response.status] || '오류가 발생했습니다.';
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.handleAuthError = handleAuthError;
    window.handlePaymentError = handlePaymentError;
    window.handleApiError = handleApiError;
}
