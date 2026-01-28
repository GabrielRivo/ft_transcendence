import type { Fiber } from '../types';
import { getWipRoot } from '../component';
import { performUnitOfWork } from './performUnitOfWork';

// Boucle de travail avec Concurrent Mode
let nextUnitOfWork: Fiber | null = null;

export function setNextUnitOfWork(value: Fiber | null): void {
  nextUnitOfWork = value;
}

function workLoop(deadline: IdleDeadline): void {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }

  if (!nextUnitOfWork && getWipRoot()) {
    // commitRoot sera appelé depuis render.ts pour éviter les dépendances circulaires
    const event = new CustomEvent('fiberWorkComplete');
    window.dispatchEvent(event);
  }

  requestIdleCallback(workLoop);
}

// Démarrer la boucle de travail
requestIdleCallback(workLoop);

export { workLoop }; 