

import Services from "./Services";

class TimeService {
    static instance: TimeService;

    private deltaTime: number;
    private timestamp: number;
    private tLast: number;
    private t0: number;

    private offset: number = 0;

    private timeScale: number;

    private constructor() {
        this.deltaTime = 0;
        this.timestamp = 0;
        this.t0 = performance.now();
        this.tLast = this.t0;

        this.timeScale = 1;
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
        this.deltaTime = (t1 - this.tLast) * this.timeScale;
        this.timestamp = this.timestamp + this.deltaTime;
        this.tLast = t1;
    }

   /*public getTimeScale(): number {
        return this.timeScale;
    }
    public setTimeScale(scale: number): void {
        this.timeScale = scale;
    }*/

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
      //   console.log("Setting timestamp, offset is ", offset);
        this.offset += offset;
        this.timestamp = timestamp;
        this.tLast = performance.now();
    }

    public getRealTimestamp(): number {
      //   console.log("Offset is ", this.offset);
        return performance.now() - this.t0 + this.offset;
    }
}

export default TimeService;