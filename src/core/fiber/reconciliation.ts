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

    // on update le fiber existant
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
    
    // on creer un nouveau fiber
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
    
    // on verifie que le fiber est un provider "securite"
    if (newFiber && newFiber.type === 'CONTEXT_PROVIDER') {
      newFiber.dom = null;
    }
    
    // on supprime le fiber existant
    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION";
      getDeletions().push(oldFiber);
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    // if (index === 0) {
    //   wipFiber.child = newFiber || undefined;
    // } else if (element && prevSibling) {
    //   prevSibling.sibling = newFiber || undefined;
    // }

    // amelioration chainage parent enfant
    if (newFiber) {
      if (!prevSibling) {
        wipFiber.child = newFiber;
      } else {
        prevSibling.sibling = newFiber;
      }
      prevSibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }
} 