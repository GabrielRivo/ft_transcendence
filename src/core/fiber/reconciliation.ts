import type { Fiber, Element } from '../types';
import { getDeletions } from '../component';

// Réconciliation des enfants
export function reconcileChildren(wipFiber: Fiber, elements: Element[]): void {
  let index = 0;
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling: Fiber | null = null;

  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    let newFiber: Fiber | null = null;

    const sameType = oldFiber && element && element.type === oldFiber.type && element.props.key === oldFiber.props.key;

    if (sameType && oldFiber) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
      };
    }
    
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT",
      };
    }
    
    // Safety check for Provider children
    if (newFiber && newFiber.type === 'CONTEXT_PROVIDER') {
      newFiber.dom = null; // Ensure no DOM node for Provider
    }
    
    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION";
      getDeletions().push(oldFiber);
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    if (index === 0) {
      wipFiber.child = newFiber || undefined;
    } else if (element && prevSibling) {
      prevSibling.sibling = newFiber || undefined;
    }

    prevSibling = newFiber;
    index++;
  }
} 