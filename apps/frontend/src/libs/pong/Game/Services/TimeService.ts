
class TimeService {
    static instance: TimeService;

    private deltaTime: number;
    private timestamp: number;
    private tLast: number;
    private t0: number;

    private offset: number = 0;

    private constructor() {
        this.deltaTime = 0;
        this.timestamp = 0;
        this.t0 = performance.now();
        this.tLast = this.t0;
    }

    static getInstance(): TimeService {
        if (!TimeService.instance) {
            TimeService.instance = new TimeService();
        }
        return TimeService.instance;
    }

    public initialize(): void {
        this.deltaTime = 0;
        this.timestamp = 0;
        this.t0 = performance.now();
        this.tLast = this.t0;
        this.offset = 0;
    }

    public update(): void {
        const t1 = performance.now();
        this.deltaTime = (t1 - this.tLast);
        this.timestamp = this.timestamp + this.deltaTime;
        this.tLast = t1;
    }

    public getDeltaTime(): number {
        return this.deltaTime;
    }
    public setDeltaTime(deltaTime: number): void {
        this.deltaTime = deltaTime;
    }

    public getTimestamp(): number {
        return this.timestamp;
    }
    public setTimestamp(timestamp: number): void {
        const offset = timestamp - this.timestamp;
        this.offset += offset;
        this.timestamp = timestamp;
        this.tLast = performance.now();
    }

    public getRealTimestamp(): number {
        return performance.now() - this.t0 + this.offset;
    }
}

export default TimeService;