import { 
  getWipFiber, 
  getHookIndex, 
  setHookIndex 
} from '../component';
import type { Hook } from '../types';

export function useRef<T>(initialValue: T): { current: T } {
  const wipFiber = getWipFiber();
  if (!wipFiber) throw new Error("useRef called outside of component");

  const oldHook = wipFiber.alternate &&
                  wipFiber.alternate.hooks &&
                  wipFiber.alternate.hooks[getHookIndex()] as Hook & { state: { current: T } };

  const hook = {
    state: oldHook ? oldHook.state : { current: initialValue },
    queue: [] as any[] // useRef n'utilise pas la queue, mais on la garde pour la compatibility du type Hook
  };

  if (wipFiber.hooks) {
    wipFiber.hooks.push(hook);
  }
  
  setHookIndex(getHookIndex() + 1);

  return hook.state;
}

