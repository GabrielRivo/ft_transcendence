import type { Element } from '../types';

export const PORTAL_TYPE = "PORTAL";

export function createPortal(children: Element, container: HTMLElement): Element {
  return {
    type: PORTAL_TYPE,
    props: {
      children: [children],
      container: container, // On stocke le conteneur dans les props
    },
  };
}

