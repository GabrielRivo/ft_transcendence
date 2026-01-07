import type { Fiber } from '../types';
import { updateDom } from '../component';
import { commitDeletion } from './commitDeletion';
import { PORTAL_TYPE } from '../portal';

export function commitWork(fiber?: Fiber): void {
  if (!fiber) return;
  // re check plus tard // WARNING
  if (fiber.effectTag === "DELETION") {
    commitDeletionLogic(fiber);
    return;
  }

  let domParentFiber = fiber.parent;
  while (domParentFiber && !domParentFiber.dom) {
    if (domParentFiber.type === PORTAL_TYPE) {
      break;
    }
    domParentFiber = domParentFiber.parent;
  }

  if (domParentFiber) {
    const domParent = domParentFiber.type === PORTAL_TYPE
      ? domParentFiber.props.container
      : domParentFiber.dom;

    if (domParent) {
      if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
        domParent.appendChild(fiber.dom);
      } else if (fiber.effectTag === "UPDATE" && fiber.dom != null && fiber.alternate) {
        updateDom(fiber.dom, fiber.alternate.props, fiber.props);
      }
    }
  }

  // gestion des refs
  if (fiber.dom && fiber.props && fiber.props.ref) {
    try {
        if (typeof fiber.props.ref === 'function') {
            fiber.props.ref(fiber.dom);
        } else if (typeof fiber.props.ref === 'object' && 'current' in fiber.props.ref) {
            fiber.props.ref.current = fiber.dom;
        }
    } catch (e) {
        console.error("Error assigning ref", e);
    }
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function commitDeletionLogic(fiber: Fiber) {
  let domParentFiber = fiber.parent;
  while (domParentFiber && !domParentFiber.dom) {
    if (domParentFiber.type === PORTAL_TYPE) break;
    domParentFiber = domParentFiber.parent;
  }
  if (domParentFiber) {
      const domParent = domParentFiber.type === PORTAL_TYPE
        ? domParentFiber.props.container
        : domParentFiber.dom;
      if (domParent) {
        commitDeletion(fiber, domParent);
      }
  }
}