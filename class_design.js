

class m_line {
    constructor( sv, ev /*대충 초기화*/ ) {
        // 초기화 코드

        this.startTime = null;
        this.completed = false;
    }

    display(duration) {
        if (duration == 0) {
            line(sv.x, sv.y, ev.x, ev.y);
            this.completed = true;
            return;
        }

        if (this.startTime == null) {
            this.startTime = p.millis();
            return;
        }

        let now = p.millis();

        if (duration * 1000 <= now - this.startTime) {
            this.completed = true;
            return;
        }

        let t = (this.currentTime - this.startTime)/(duration * 1000);
        line(sv.x, sv.y, (1 - t) * sv.x + t * ev.x, (1 - t) * sv.y + t * ev.y);
    }
}

let line1, line2, line3;

function setup() {
    line1 = new m_line(sv1, ev2);
    line2 = new m_line(sv2, ev2);
    line3 = new m_line(sv3, ev3);
}

const duration1 = 2;
const duration2 = 3;


function draw() {

    line1.display(duration1);

    if (line1..completed == true) {
        line2.display(duration2);
        line3.display(duration2);
    }
}