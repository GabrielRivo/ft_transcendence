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
  const oldRef = fiber.alternate?.props?.ref;
  const newRef = fiber.props?.ref;

  if (fiber.dom && newRef && newRef !== oldRef) {
    if (oldRef && typeof oldRef === 'function') {
        oldRef(null);
    } else if (oldRef && typeof oldRef === 'object' && 'current' in oldRef) {
        oldRef.current = null;
    }
    if (typeof newRef === 'function') {
        newRef(fiber.dom);
    } else if (typeof newRef === 'object' && 'current' in newRef) {
        newRef.current = fiber.dom;
    }
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function commitDeletionLogic(fiber: Fiber) {
  // Si le fiber à supprimer est un portal, on utilise son container directement
  if (fiber.type === PORTAL_TYPE) {
    const portalContainer = fiber.props?.container;
    if (portalContainer) {
      commitDeletion(fiber, portalContainer);
    }
    return;
  }

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