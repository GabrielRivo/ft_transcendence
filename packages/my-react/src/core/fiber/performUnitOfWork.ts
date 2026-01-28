import type { Fiber, Element } from '../types';
import { setWipFiber, setHookIndex } from '../component';
import { reconcileChildren } from './reconciliation';
import { createDom } from '../component';
import { PORTAL_TYPE } from '../portal';

// Execution d'une unité de travail
export function performUnitOfWork(fiber: Fiber): Fiber | null {
  const isFunctionComponent = typeof fiber.type === 'function';
  const isFragment = typeof fiber.type === 'symbol';
  const isContextProvider = fiber.type === 'CONTEXT_PROVIDER';
  const isPortal = fiber.type === PORTAL_TYPE;
  
  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else if (isFragment || isContextProvider || isPortal) {
    updateFragmentComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  if (fiber.child) {
    return fiber.child;
  }
  
  let nextFiber: Fiber | undefined = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
  
  return null;
}

// Update des composants fonction
function updateFunctionComponent(fiber: Fiber): void {
  setWipFiber(fiber);
  setHookIndex(0);
  if (fiber.hooks) {
    fiber.hooks = [];
  } else {
    fiber.hooks = [];
  }
  
  const fn = fiber.type as Function;
  const result = fn(fiber.props);
  // Filtrer les null/undefined (composant qui retourne null) !!!
  const children = result != null ? [result] : [];
  reconcileChildren(fiber, children as Element[]);
}

// Update des fragments
function updateFragmentComponent(fiber: Fiber): void {
  const children = fiber.props?.children || [];
  reconcileChildren(fiber, children);
}

// Update des composants hosts
function updateHostComponent(fiber: Fiber): void {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }
  
  const children = fiber.props?.children || [];
  reconcileChildren(fiber, children);
} 