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

// Hook useState
export function useState<T>(initial: T): [T, (action: T | ((prev: T) => T)) => void] {
  const wipFiber = getWipFiber();
  if (!wipFiber) throw new Error("useState called outside of component");
  
  const oldHook = wipFiber.alternate &&
                  wipFiber.alternate.hooks &&
                  wipFiber.alternate.hooks[getHookIndex()] as Hook & { state: T, queue: any[] };
  
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [] as any[],
  };

  const actions = oldHook ? oldHook.queue : [];
  actions.forEach(action => {
    hook.state = typeof action === 'function' ? action(hook.state) : action;
  });


  // re check plus tard // WARNING
  
  const setState = (action: T | ((prev: T) => T)) => {
    // Push action to the *current* hook's queue (which will be oldHook in next render)
    // But wait, 'hook' here is the ONE created during render.
    // If we are in event handler, we are outside render.
    // The 'hook' variable is closed over.
    // So we push to this hook's queue.
    hook.queue.push(action);
    
    const currentRoot = getCurrentRoot();
    const wipRoot = getWipRoot();

    // If a render is already in progress (wipRoot exists), we shouldn't reset it
    // UNLESS we want to support batching or restart? 
    // Simple implementation: if wipRoot exists, we might be interrupting? 
    // Or we just overwrite it to start over from root with new state.
    
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
  };

  if (wipFiber.hooks) {
    wipFiber.hooks.push(hook);
  }
  setHookIndex(getHookIndex() + 1);
  return [hook.state, setState];
}
