// PortOne V2 결제 설정 (config.js에서 로드)
const PORTONE_STORE_ID = window.PORTONE_STORE_ID;
const CHANNEL_KEYS = window.PAYMENT_CHANNEL_KEYS;
const PAYMENT_WORKER_URL = window.PAYMENT_WORKER_URL;

// 기본 결제 채널
const DEFAULT_CHANNEL_KEY = CHANNEL_KEYS.KCP;

// 중복 결제 방지 플래그
let isPaymentInProgress = false;

/**
 * PortOne SDK 동적 로드
 */
async function loadPortOneSDK() {
    if (window.PortOne) return;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.portone.io/v2/browser-sdk.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * 고유 주문 ID 생성
 */
function generateOrderId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `order_${timestamp}_${random}`;
}

/**
 * 기존 구독 확인 (결제 전 중복 방지)
 */
async function checkActiveSubscription() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return { hasAccess: false };

    const response = await fetch(`${PAYMENT_WORKER_URL}/check-access`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
        },
    });

    if (!response.ok) {
        console.error('구독 확인 실패:', response.status);
        return { hasAccess: false };
    }
    return response.json();
}

/**
 * 결제 검증 요청 (Cloudflare Worker)
 * Authorization 헤더에 JWT 토큰 포함
 */
async function verifyPayment(paymentId) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        throw new Error('로그인이 필요합니다');
    }

    const response = await fetch(`${PAYMENT_WORKER_URL}/verify`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ paymentId }),  // userId 제거 - JWT에서 추출
    });

    return response.json();
}

// 결제 수단별 설정
const PAYMENT_METHODS = {
    CARD: {
        channelKey: CHANNEL_KEYS.KCP,
        payMethod: 'CARD',
        card: {
            availableCards: [
                'SAMSUNG_CARD',
                'SHINHAN_CARD',
                'BC_CARD',
                'KOOKMIN_CARD',
                'HANA_CARD',
                'HYUNDAI_CARD',
                'LOTTE_CARD',
                'NH_CARD',
                'WOORI_CARD',
            ],
        },
    },
    KAKAO: {
        channelKey: CHANNEL_KEYS.KAKAO,
        payMethod: 'EASY_PAY',
    },
};

/**
 * PortOne V2 결제 실행
 * @param {'CARD'|'KAKAO'} method - 결제 수단
 */
async function processPayment(method) {
    if (isPaymentInProgress) return;

    const config = PAYMENT_METHODS[method];
    if (!config) {
        console.error('알 수 없는 결제 수단:', method);
        return;
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        alert('결제를 진행하려면 먼저 로그인해주세요.');
        return;
    }

    isPaymentInProgress = true;

    try {
        const accessCheck = await checkActiveSubscription();
        if (accessCheck.hasAccess) {
            alert('이미 유효한 이용권이 있습니다. 만료일: ' + new Date(accessCheck.expiresAt).toLocaleDateString('ko-KR'));
            isPaymentInProgress = false;
            return;
        }

        await loadPortOneSDK();

        const paymentParams = {
            storeId: PORTONE_STORE_ID,
            channelKey: config.channelKey,
            paymentId: generateOrderId(),
            orderName: 'MathMore Basic',
            totalAmount: 9900,
            currency: 'KRW',
            payMethod: config.payMethod,
            customer: { email: session.user.email },
            offerPeriod: (() => {
                const from = new Date();
                const to = new Date(from);
                to.setMonth(to.getMonth() + 3);
                if (to.getDate() !== from.getDate()) {
                    to.setDate(0);
                }
                return {
                    range: {
                        from: from.toISOString(),
                        to: to.toISOString(),
                    }
                };
            })(),
        };

        if (config.card) {
            paymentParams.card = config.card;
        }

        const response = await PortOne.requestPayment(paymentParams);

        if (response.code) {
            if (response.code === 'FAILURE_TYPE_PG') {
                alert(`결제 실패: ${response.message}`);
            } else if (response.code !== 'USER_CANCEL') {
                alert(`결제 오류: ${response.message}`);
            }
            return;
        }

        const verifyResult = await verifyPayment(response.paymentId);

        if (verifyResult.success) {
            alert('결제가 완료되었습니다! 이용권이 활성화되었습니다.');
            window.location.reload();
        } else {
            alert(handlePaymentError(verifyResult, 'verify'));
        }

    } catch (error) {
        console.error('결제 오류:', error);
        alert('결제 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
        isPaymentInProgress = false;
    }
}

// 기존 호출 호환
function requestPayment() { return processPayment('CARD'); }
function requestKakaoPayment() { return processPayment('KAKAO'); }
