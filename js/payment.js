// PortOne V2 결제 설정
const PORTONE_STORE_ID = 'store-c5f2423a-b1d3-4c1e-8ea3-7faa53da830e';

// 결제 채널 키
const CHANNEL_KEYS = {
    KCP: 'channel-key-b612f825-8eef-4f9d-92f1-e71ec778d162',      // KCP 실연동
    KAKAO: 'channel-key-585c9fea-065d-4320-977f-c4f87b96a3e5',    // 카카오페이 테스트
};

// 기본 결제 채널
const DEFAULT_CHANNEL_KEY = CHANNEL_KEYS.KCP;
const PAYMENT_WORKER_URL = 'https://payment-worker.painfultrauma.workers.dev';

/**
 * 고유 주문 ID 생성
 */
function generateOrderId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `order_${timestamp}_${random}`;
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

/**
 * PortOne V2 결제 실행
 */
async function requestPayment() {
    // 로그인 확인
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        alert('결제를 진행하려면 먼저 로그인해주세요.');
        return;
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    const orderId = generateOrderId();

    try {
        // PortOne V2 결제 요청
        const response = await PortOne.requestPayment({
            storeId: PORTONE_STORE_ID,
            channelKey: DEFAULT_CHANNEL_KEY,
            paymentId: orderId,
            orderName: 'MathMore Basic',
            totalAmount: 9900,
            currency: 'KRW',
            payMethod: 'CARD',
            customer: {
                email: userEmail,
            },
            offerPeriod: (() => {
                const from = new Date();
                const to = new Date(from);
                to.setMonth(to.getMonth() + 3);
                // 월말 오버플로우 보정 (예: 1/31 + 3개월 → 4/30)
                if (to.getDate() !== from.getDate()) {
                    to.setDate(0); // 이전 달의 마지막 날로 설정
                }
                return {
                    range: {
                        from: from.toISOString(),
                        to: to.toISOString(),
                    }
                };
            })(),
        });

        // 결제 실패 처리
        if (response.code) {
            if (response.code === 'FAILURE_TYPE_PG') {
                alert(`결제 실패: ${response.message}`);
            } else if (response.code !== 'USER_CANCEL') {
                alert(`결제 오류: ${response.message}`);
            }
            return;
        }

        // 결제 성공 - 서버 검증 (userId는 JWT에서 추출)
        const verifyResult = await verifyPayment(response.paymentId);

        if (verifyResult.success) {
            alert('결제가 완료되었습니다! 이용권이 활성화되었습니다.');
            window.location.reload();
        } else {
            alert(`결제 검증 실패: ${verifyResult.error}`);
        }

    } catch (error) {
        console.error('결제 오류:', error);
        alert('결제 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

/**
 * 카카오페이 결제
 */
async function requestKakaoPayment() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        alert('결제를 진행하려면 먼저 로그인해주세요.');
        return;
    }

    const userEmail = session.user.email;
    const orderId = generateOrderId();

    try {
        const response = await PortOne.requestPayment({
            storeId: PORTONE_STORE_ID,
            channelKey: CHANNEL_KEYS.KAKAO,
            paymentId: orderId,
            orderName: 'MathMore Basic',
            totalAmount: 9900,
            currency: 'KRW',
            payMethod: 'EASY_PAY',
            customer: {
                email: userEmail,
            },
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
        });

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
            alert(`결제 검증 실패: ${verifyResult.error}`);
        }

    } catch (error) {
        console.error('카카오페이 결제 오류:', error);
        alert('결제 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}
