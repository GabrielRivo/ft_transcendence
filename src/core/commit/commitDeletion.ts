import type { Fiber } from '../types';

export function commitDeletion(fiber: Fiber, domParent: Node): void {
  console.log("Deleting fiber:", fiber.type, fiber);
  if (fiber.dom) {
    console.log("Removing DOM node:", fiber.dom);

    // gestion des refs cleanup
    if (fiber.props && fiber.props.ref) {
      if (typeof fiber.props.ref === 'function') {
          fiber.props.ref(null);
      } else if (typeof fiber.props.ref === 'object' && 'current' in fiber.props.ref) {
          fiber.props.ref.current = null;
      }
    }

    domParent.removeChild(fiber.dom);
  } else {
    // re check plus tard // WARNING
    let child = fiber.child;
    while (child) {
      commitDeletion(child, domParent);
      child = child.sibling;
    }
  }
}
