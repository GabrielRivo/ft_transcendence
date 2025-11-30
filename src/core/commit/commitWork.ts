import type { Fiber } from '../types';
import { updateDom } from '../component';
import { commitDeletion } from './commitDeletion';

export function commitWork(fiber?: Fiber): void {
  if (!fiber) return;
  // re check plus tard // WARNING
  if (fiber.effectTag === "DELETION") {
    let domParentFiber = fiber.parent;
    while (domParentFiber && !domParentFiber.dom) {
      domParentFiber = domParentFiber.parent;
    }
    if (domParentFiber && domParentFiber.dom) {
        commitDeletion(fiber, domParentFiber.dom);
    }
    return;
  }

  let domParentFiber = fiber.parent;
  while (domParentFiber && !domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }

  if (domParentFiber && domParentFiber.dom) {
    const domParent = domParentFiber.dom;

    if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
      domParent.appendChild(fiber.dom);
    } else if (fiber.effectTag === "UPDATE" && fiber.dom != null && fiber.alternate) {
      updateDom(fiber.dom, fiber.alternate.props, fiber.props);
    }
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}
