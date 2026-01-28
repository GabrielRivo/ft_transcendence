import type { Element } from './types';
import { 
  getCurrentRoot, 
  setWipRoot, 
  setDeletions 
} from './component';
import { setNextUnitOfWork } from './fiber';
import { commitRoot } from './commit';

// Fonction de rendu principal
export function render(element: Element, container: HTMLElement): void {
  setWipRoot({
    type: "ROOT",
    dom: container,
    props: {
      children: [element],
    },
    alternate: getCurrentRoot(),
  });
  setDeletions([]);
  const wipRoot = {
    type: "ROOT",
    dom: container,
    props: {
      children: [element],
    },
    alternate: getCurrentRoot(),
  };
  setWipRoot(wipRoot);
  setNextUnitOfWork(wipRoot);
}

// Écouter l'événement de fin de travail Fiber et déclencher le commit
window.addEventListener('fiberWorkComplete', () => {
  commitRoot();
}); 