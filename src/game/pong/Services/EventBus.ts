

class EventBus {

    private events: Map<string, Set<Function>>;
    private onceWrappers: Map<string, Map<Function, Function>>

    constructor() {
        this.events = new Map();
        this.onceWrappers = new Map();
    }

    on(event: string, listener: Function): Function {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event)!.add(listener);

        return () => this.off(event, listener);
    }

    once(event: string, listener: Function): Function {
        const wrapper = (payload: any) => {
            this.off(event, listener);
            listener(payload);
        }
        if (!this.onceWrappers.has(event)) {
            this.onceWrappers.set(event, new Map());
        }
        this.onceWrappers.get(event)!.set(listener, wrapper);
        this.on(event, wrapper);

        return () => this.off(event, listener);
    }   

    off(event: string, listener: Function): void {
        let onceWrapper : Function | undefined;
        if (this.onceWrappers.has(event))
            onceWrapper = this.onceWrappers.get(event)!.get(listener);

        if (this.events.has(event)) {
            let actualListener = onceWrapper ? onceWrapper : listener;
            if (this.events.get(event)!.delete(actualListener)) {
                console.log("Listener " + actualListener.name + " removed from event " + event);
            }
            else {
                console.log("Listener " + actualListener.name + " not found for event " + event);

                //print every listener for the event
                // console.log("Current listeners for event " + event + " : ");
                // this.events.get(event)!.forEach((l) => {
                //     console.log("- " + l.name);
                // });
            }
            if (this.events.get(event)!.size === 0) {
                this.events.delete(event);
            }
            if (onceWrapper) {
                this.onceWrappers.get(event)!.delete(listener);
                console.log("Once wrapper for listener " + listener.name + " removed from event " + event);
                if (this.onceWrappers.get(event)!.size === 0) {
                    this.onceWrappers.delete(event);
                }
            }
        }
    }

    emit(event: string, payload: any): void {
        if (this.events.has(event)) {
            let listeners = this.events.get(event) as Set<Function>;
    
            //console.log("Emitting event : " + event + " to " + listeners.size + " listeners.");
            listeners.forEach((listener) => {
                try {
                    listener(payload)
                }
                catch(err: any)
                {
                    console.log("Error in handler : " + listener.name + " event : " + event);
                }
            });
        }
    }

    async emitAsync(event: string, payload: any): Promise<void> {
        if (this.events.has(event)) {
            let listeners = Array.from(this.events.get(event) as Set<Function>);
    
            await Promise.all(listeners.map(async (listener) => {
                try {
                    await listener(payload)
                }
                catch(err: any)
                {
                    console.log("Error in handler : " + listener.name + " event : " + event);
                }
            }));
        }
    }

    clear(): void {
        this.events.clear();
        this.onceWrappers.clear();
    }
}

export default EventBus;