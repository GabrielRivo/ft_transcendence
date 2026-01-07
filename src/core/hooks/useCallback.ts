import { getWipFiber, getHookIndex, setHookIndex } from '../component';
import type { Hook } from '../types';

export function useCallback<T extends Function>(callback: T, deps: any[]): T {
    const wipFiber = getWipFiber();
    if (!wipFiber) throw new Error("useCallback called outside of component");

    const hookIndex = getHookIndex();

    const oldHook = wipFiber.alternate &&
                    wipFiber.alternate.hooks &&
                    wipFiber.alternate.hooks[hookIndex] as Hook & { deps: any[], callback: T };


    const hasChanged = oldHook ? !deps || !deps.every((dep, i) => dep === oldHook.deps[i]) : true;

    const hook = {
        deps: deps,
        callback: hasChanged ? callback : oldHook?.callback,
        cleanup: null,
    };

    if (wipFiber.hooks) {
        wipFiber.hooks.push(hook as Hook);
    }

    setHookIndex(hookIndex + 1);

    return hook.callback as T;
}