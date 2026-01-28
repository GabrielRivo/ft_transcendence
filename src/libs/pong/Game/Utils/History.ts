

interface ITimestamped {
    timestamp: number;
}

class History<T extends ITimestamped> {
    private history: (T | null)[];
    private size: number;
    private writeIndex: number = 0;

    constructor(size: number) {
        this.size = size;
        this.history = new Array(size).fill(null);
    }

    public insert(index: number, state: T): void {
        let currentIndex = this.writeIndex;
        let prevIndex;
        
        while (currentIndex !== index) {
            prevIndex = this.lessId(currentIndex, 1);
            
            this.history[currentIndex] = this.history[prevIndex]!;
            
            currentIndex = prevIndex;
        }
        this.history[index] = state;

        this.writeIndex = this.upId(this.writeIndex, 1);
    }

    public addStateStrict(state: T): void {
        const lastIndex = this.lessId(this.writeIndex, 1);
        const lastState = this.history[lastIndex];

        if (lastState && state.timestamp < lastState.timestamp) {
           //  console.log("Inserting out-of-order state into history.");
            let checkIndex = lastIndex;
            let checkState = this.history[checkIndex];

            for (let i = 1; i < this.size; i++) {
                checkIndex = this.lessId(checkIndex, 1);
                checkState = this.history[checkIndex];

                if (!checkState) {
                    const insertIndex = this.upId(checkIndex, 1);
                    this.insert(insertIndex, state);
                    return;
                }

                if (state.timestamp >= checkState.timestamp) {
                    const insertIndex = this.upId(checkIndex, 1);
                    this.insert(insertIndex, state);
                    return;
                }
            }
            return;
        }
        this.history[this.writeIndex] = state;
        this.writeIndex = this.upId(this.writeIndex, 1);
    }

    public addState(state: T): void {
        const lastState = this.history[this.lessId(this.writeIndex, 1)];
        if (lastState && state.timestamp < lastState.timestamp) {
            return;
        }
        this.history[this.writeIndex] = state;
        this.writeIndex = this.upId(this.writeIndex, 1);
    }

    public upId(id: number, offset: number): number {
        return (id + offset) % this.size;
    }

    public lessId(id: number, offset: number): number {
        return (id - offset + this.size) % this.size;
    }

    public reset(): void {
        this.history.fill(null);
        this.writeIndex = 0;
    }

    public getClosestState(targetTime: number, historyTime: number): T | null {

        let latestFrame : number = this.lessId(this.writeIndex, 1);
        let timeDiff: number;

        if (this.history[latestFrame] === null) {
            return null;
        }
        timeDiff = targetTime - this.history[latestFrame]!.timestamp;
        if (timeDiff >= 0) {
            if (timeDiff > historyTime) {
                //console.log("Target time is too new.");
                return null;
            }
            //console.log("Target time is newer than the latest state. Asked:", targetTime, " Latest:", this.history[latestFrame]!.timestamp);
            return this.history[latestFrame]!;
        }
        if (timeDiff < -historyTime) {
            //console.log("Target time is too old.");
            return null;
        }

        for (let i = 0; i < this.size; i++) {
            const id = this.lessId(latestFrame, i);
            const state = this.history[id];

            if (!state)
                break;

            timeDiff = targetTime - state.timestamp;
            if (timeDiff >= 0)
                return state;
        }
        return null;
    }

    getStatesInRange(startTime: number, endTime: number): T[] {
        let results: T[] = [];
        let latestFrame : number = this.lessId(this.writeIndex, 1);

        for (let i = 0; i < this.size; i++) {
            const id = this.lessId(latestFrame, i);
            const state = this.history[id];

            if (!state)
                break;

            if (state.timestamp <= startTime) {
                break;
            }

            if (state.timestamp > startTime && state.timestamp <= endTime) {
                results.push(state);
            }
        }
        results.reverse();
        return results;
    }

    public getLatestState(): T | null {
        let latestFrame : number = this.lessId(this.writeIndex, 1);
        return this.history[latestFrame]!;
    }
}

export default History;

