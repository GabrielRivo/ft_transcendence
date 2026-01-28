import type { Hook } from '../types';
import { 
  getWipFiber, 
  getHookIndex, 
  setHookIndex, 
  getCurrentRoot, 
  setWipRoot, 
  setDeletions,
  getWipRoot
} from '../component';
import { setNextUnitOfWork } from '../fiber';

let isRenderScheduled = false;

function scheduleRender() {
  const currentRoot = getCurrentRoot();
  const wipRoot = getWipRoot();
  
  if (wipRoot) {
    isRenderScheduled = true;
    return;
  }

  if (currentRoot) {
    const newWipRoot = {
      type: "ROOT",
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    };
    setWipRoot(newWipRoot);
    setNextUnitOfWork(newWipRoot);
    setDeletions([]);
  }
}

export function checkPendingRender() {
  if (isRenderScheduled) {
    isRenderScheduled = false;
    queueMicrotask(() => {
      scheduleRender();
    });
  }
}

// Hook useState
export function useState<T>(initial: T): [T, (action: T | ((prev: T) => T)) => void] {
  const wipFiber = getWipFiber();
  if (!wipFiber) throw new Error("useState called outside of component");
  
  const oldHook = wipFiber.alternate &&
                  wipFiber.alternate.hooks &&
                  wipFiber.alternate.hooks[getHookIndex()] as Hook & { state: T, queue: any[] };
  
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: oldHook ? oldHook.queue : [] as any[],
  };

  const actions = hook.queue;
  actions.forEach(action => {
    hook.state = typeof action === 'function' ? action(hook.state) : action;
  });
  
  // Important: on vide la queue in-place pour conserver la référence du tableau
  // Cela permet aux closures "stale" de setState de continuer à fonctionner
  // car elles pointent vers ce même tableau.
  actions.length = 0;

  const setState = (action: T | ((prev: T) => T)) => {
    hook.queue.push(action);
    scheduleRender();
  };

  if (wipFiber.hooks) {
    wipFiber.hooks.push(hook);
  }
  setHookIndex(getHookIndex() + 1);
  return [hook.state, setState];
}
