// 1. 기본 에이전트 (직원) 클래스 정의
class Agent {
    constructor(name, specialty) {
        this.name = name;           // 이름
        this.specialty = specialty; // 전문 분야
    }

    // 일하는 함수
    reply(query) {
        return `[${this.name}] 제가 답변하겠습니다. (질문: ${query})`;
    }
}

// 2. 수학 전문가 에이전트 (상속)
class MathAgent extends Agent {
    reply(query) {
        // 실제로는 여기서 AI 모델이 수학 문제를 풀겠죠?
        return `🧮 [${this.name}] 그건 기하학 문제군요! 공식을 사용하여 계산합니다... 답은 X입니다.`;
    }
}

// 3. 고객 지원 에이전트 (상속)
class SupportAgent extends Agent {
    reply(query) {
        // 실제로는 여기서 매뉴얼을 검색할 겁니다.
        return `💁 [${this.name}] 결제나 계정 문제는 저에게 맡겨주세요. 고객센터 페이지로 안내합니다.`;
    }
}

// 4. 메인 매니저 에이전트 (지배인)
class ManagerBot {
    constructor() {
        console.log("🤖 매니저 봇이 출근했습니다.");
        // 직원을 고용합니다.
        this.mathExpert = new MathAgent("김수학", "수학");
        this.supportStaff = new SupportAgent("이친절", "고객지원");
    }

    // 손님의 말을 듣고 분류하는 함수
    handleUserMessage(message) {
        console.log(`\n👤 사용자: "${message}"`);

        // (단순화된 로직) 키워드로 의도를 파악합니다.
        // 실제로는 여기서 LLM(AI)이 "이 질문의 의도는 무엇인가요?"라고 판단합니다.
        if (message.includes("계산") || message.includes("넓이") || message.includes("각도")) {
            console.log("👉 매니저: 이건 수학 문제네요. 김수학 님에게 넘깁니다.");
            return this.mathExpert.reply(message);
        } 
        else if (message.includes("결제") || message.includes("환불") || message.includes("로그인")) {
            console.log("👉 매니저: 이건 서비스 문의네요. 이친절 님에게 넘깁니다.");
            return this.supportStaff.reply(message);
        } 
        else {
            return "🤖 매니저: 죄송합니다. 제가 처리할 수 없는 질문입니다.";
        }
    }
}

// --- 시뮬레이션 시작 ---

const manager = new ManagerBot();

// 상황 1: 사용자가 수학 질문을 함
console.log(manager.handleUserMessage("이 삼각형의 넓이 계산해줘"));

// 상황 2: 사용자가 결제 질문을 함
console.log(manager.handleUserMessage("결제 취소하고 싶어요"));

// 상황 3: 엉뚱한 질문
console.log(manager.handleUserMessage("오늘 점심 뭐 먹지?"));
