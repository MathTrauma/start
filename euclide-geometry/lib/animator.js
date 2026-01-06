
export class Animator {
    constructor(p) {
        this.p = p;
        this.sequences = new Map();
        this.currentSequenceName = null;
        this.currentStepIndex = 0;
        this.currentStepStarted = false; 
        this.isPaused = false;
        this.renderList = [];
    }

    registerSequence(name, steps) {
        this.sequences.set(name, steps);
    }

    play(name, options = {}) {
        if (!this.sequences.has(name)) {
            console.warn(`Sequence '${name}' not found.`);
            return;
        }
        this.currentSequenceName = name;
        this.currentStepIndex = 0;
        this.currentStepStarted = false;
        
        // Always clear renderList to prevent "future ghosts"
        this.renderList = [];
        
        const collectObjects = (seqName) => {
            const objs = new Set();
            if (!this.sequences.has(seqName)) 
                return objs;

            const steps = this.sequences.get(seqName);
            steps.forEach(step => {
                if (step.target) objs.add(step.target);
                if (Array.isArray(step.group)) {
                    step.group.forEach(item => {
                        if (item.target) objs.add(item.target);
                    });
                }
            });
            return objs;
        };

        // 1. Rebuild precursors (Past)
        if (options.precursors && Array.isArray(options.precursors)) {
            const preObjs = new Set();
            options.precursors.forEach(preName => {
                const objs = collectObjects(preName);
                objs.forEach(o => preObjs.add(o));
            });

            preObjs.forEach(obj => {
                obj.complete(); // Ensure completed state
                this.renderList.push(obj);
            });
        }
        
        // 2. Add current sequence objects (Present)
        const currentObjs = collectObjects(name);
        currentObjs.forEach(obj => {
            // If object was in precursors (re-used), remove it first to re-animate or reset order
            const idx = this.renderList.indexOf(obj);
            if (idx > -1) {
                this.renderList.splice(idx, 1);
            }
            obj.reset();
            this.renderList.push(obj);
        });

        // 'retain' option is effectively replaced by 'precursors' in this logic.
        // If user wants to retain *everything* blindly, they must pass all previous phases in precursors.
    }

    updateAndDraw() {
        this.update();
        this.draw();
    }

    update() {
        if (this.isPaused || (typeof window !== 'undefined' && window.isPaused)) return;
        if (!this.currentSequenceName) return;
        
        const steps = this.sequences.get(this.currentSequenceName);
        if (!steps || this.currentStepIndex >= steps.length) return;

        const currentStep = steps[this.currentStepIndex];
        const dt = this.p.deltaTime / 1000;

        let stepComplete = false;

        // Initialize step
        if (!this.currentStepStarted) {
            this.currentStepTime = 0; // Initialize time tracker
            if (currentStep.group) {
                currentStep.group.forEach(item => {
                    if (item.target) item.target.start(item);
                });
            } else {
                if (currentStep.target) currentStep.target.start(currentStep);
            }
            this.currentStepStarted = true;
        }

        // Process step
        if (currentStep.group) {
            let allComplete = true;
            currentStep.group.forEach(item => {
                const target = item.target;
                const duration = item.duration !== undefined ? item.duration : 1.0;
                target.process(dt, duration);
                if (!target.isCompleted()) allComplete = false;
            });
            stepComplete = allComplete;
        } else {
            const target = currentStep.target;
            const duration = currentStep.duration !== undefined ? currentStep.duration : 1.0;
            if (target) {
                target.process(dt, duration);
                stepComplete = target.isCompleted();
            } else {
                // Delay logic
                this.currentStepTime += dt;
                if (this.currentStepTime >= duration) {
                    stepComplete = true;
                }
            }
        }

        if (stepComplete) {
            // Handle 'op' (e.g., remove)
            const handleOp = (item) => {
                if (item.op === 'remove' && item.target) {
                    const idx = this.renderList.indexOf(item.target);
                    if (idx > -1) {
                        this.renderList.splice(idx, 1);
                    }
                }
            };

            if (currentStep.group) {
                currentStep.group.forEach(handleOp);
            } else {
                handleOp(currentStep);
            }

            this.currentStepIndex++;
            this.currentStepStarted = false; 
        }
    }

    draw() {
        this.renderList.forEach(obj => {
            if (obj.visible) obj.render();
        });
    }
}
