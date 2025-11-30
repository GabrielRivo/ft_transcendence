import type { Fiber } from '../types';

export function commitDeletion(fiber: Fiber, domParent: Node): void {
  console.log("Deleting fiber:", fiber.type, fiber);
  if (fiber.dom) {
    console.log("Removing DOM node:", fiber.dom);
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
