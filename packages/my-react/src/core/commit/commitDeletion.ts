import type { Fiber, Hook } from '../types';
import { PORTAL_TYPE } from '../portal';


function runCleanupEffects(fiber: Fiber): void {
  if (fiber.hooks) {
    for (const hook of fiber.hooks) {
      if (hook && 'cleanup' in hook && typeof hook.cleanup === 'function') {
        try {
          hook.cleanup();
        } catch (error) { }
        hook.cleanup = null;
      }
    }
  }

  let child = fiber.child;
  while (child) {
    runCleanupEffects(child);
    child = child.sibling;
  }
}

export function commitDeletion(fiber: Fiber, domParent: Node): void {

  runCleanupEffects(fiber);
  
  if (fiber.type === PORTAL_TYPE) {
    const portalContainer = fiber.props?.container;
    if (portalContainer) {
      let child = fiber.child;
      while (child) {
        commitDeletionDOM(child, portalContainer);
        child = child.sibling;
      }
    }
    return;
  }
  
  commitDeletionDOM(fiber, domParent);
}


function commitDeletionDOM(fiber: Fiber, domParent: Node): void {
  if (fiber.type === PORTAL_TYPE) {
    const portalContainer = fiber.props?.container;
    if (portalContainer) {
      let child = fiber.child;
      while (child) {
        commitDeletionDOM(child, portalContainer);
        child = child.sibling;
      }
    }
    return;
  }

  if (fiber.dom) {
    // gestion des refs cleanup
    if (fiber.props && fiber.props.ref) {
      if (typeof fiber.props.ref === 'function') {
          fiber.props.ref(null);
      } else if (typeof fiber.props.ref === 'object' && 'current' in fiber.props.ref) {
          fiber.props.ref.current = null;
      }
    }

    // Vérifier que le noeud est bien un enfant du parent avant de le supprimer
    if (domParent.contains(fiber.dom)) {
      domParent.removeChild(fiber.dom);
    }
  } else {
    let child = fiber.child;
    while (child) {
      commitDeletionDOM(child, domParent);
      child = child.sibling;
    }
  }
}
