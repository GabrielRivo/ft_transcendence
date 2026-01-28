import { getWipFiber, getHookIndex, setHookIndex } from '../component';
import type { Hook } from '../types';

// copie de useCallback avec quelque ajout

export function useMemo<T>(factory: () => T, deps: any[]): T {
  const wipFiber = getWipFiber();
  if (!wipFiber) throw new Error("useMemo called outside of component");

  const hookIndex = getHookIndex();

  const oldHook = wipFiber.alternate &&
                  wipFiber.alternate.hooks &&
                  wipFiber.alternate.hooks[hookIndex] as Hook & { deps: any[], value: T };

  const hasChanged = oldHook ? !deps || !deps.every((dep, i) => dep === oldHook.deps[i]) : true;

  // si ça a changé, on exécute la factory(). Sinon on garde l'ancienne valeur...
  const value = hasChanged ? factory() : oldHook?.value;
  // donc par rapport à useCallback, on a pas besoin de callback et cleanup...
  const hook = {
    deps,
    value
  };

  if (wipFiber.hooks) {
    wipFiber.hooks.push(hook as Hook);
  }

  setHookIndex(hookIndex + 1);

  // adapte a la value par rapport au callback de useCallback...
  return value;
}