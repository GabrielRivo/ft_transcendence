import type { Hook } from '../types';
import { getWipFiber, getHookIndex, setHookIndex } from '../component';

// Hook useEffect
export function useEffect(callback: () => void | (() => void), deps?: any[]): void {
  const wipFiber = getWipFiber();
  if (!wipFiber) return;
  
  const oldHook = wipFiber.alternate &&
                  wipFiber.alternate.hooks &&
                  wipFiber.alternate.hooks[getHookIndex()] as Hook & { 
                    deps: any[], 
                    callback: Function | null, 
                    cleanup: Function | null 
                  };

  const hasChanged = oldHook ? 
    !deps || !deps.every((dep, i) => dep === oldHook.deps[i]) : 
    true;

  const hook = {
    deps: deps || [],
    callback: hasChanged ? callback : oldHook ? oldHook.callback : null,
    cleanup: oldHook ? oldHook.cleanup : null,
  };

  if (hasChanged) {
    if (hook.cleanup) {
      hook.cleanup();
    }
    
    // Exécuter l'effet après le commit
    setTimeout(() => {
      if (callback) {
        const cleanup = callback();
        if (typeof cleanup === 'function') {
          hook.cleanup = cleanup;
        }
      }
    }, 0);
  }

  if (wipFiber.hooks) {
    wipFiber.hooks.push(hook);
  }
  setHookIndex(getHookIndex() + 1);
} 