import type { Element, TextElement, Props, Fiber } from "./types";

// Variables globales pour gérer l'état
export let currentFiber: Fiber | null = null;
export let wipRoot: Fiber | null = null;
export let currentRoot: Fiber | null = null;
export let deletions: Fiber[] = [];
export let hookIndex = 0;
export let wipFiber: Fiber | null = null;

// Setters pour les variables globales (utilisés par render.ts)
export function setWipRoot(value: Fiber | null): void {
  wipRoot = value;
}

export function setCurrentRoot(value: Fiber | null): void {
  currentRoot = value;
}

export function setDeletions(value: Fiber[]): void {
  deletions = value;
}

export function setHookIndex(value: number): void {
  hookIndex = value;
}

export function setWipFiber(value: Fiber | null): void {
  wipFiber = value;
}

// Getters pour les variables globales
export function getWipRoot(): Fiber | null {
  return wipRoot;
}

export function getCurrentRoot(): Fiber | null {
  return currentRoot;
}

export function getDeletions(): Fiber[] {
  return deletions;
}

export function getHookIndex(): number {
  return hookIndex;
}

export function getWipFiber(): Fiber | null {
  return wipFiber;
}

// Fragment components
export const Fragment = Symbol("Fragment");
const DomHTMLElement = Symbol("DomHTMLElement");

export function FragmentComponent(props: { children?: any[] }): Element {
  return {
    type: Fragment,
    props: {
      children: props.children || [],
    },
  };
}

// Fonction pour JSX (alias de createElement)
export function createComponent(
  type: string | Function,
  props: Props | null,
  ...children: any[]
): Element {
  return createElement(type, props, ...children);
}

// Création d'éléments (équivalent à React.createElement)
export function createElement(
  type: string | Function,
  props: Props | null,
  ...children: any[]
): Element {
  // console.log('createElement', type, props, children);

  // essayer de voir pour le retirer car lourd
  // .filter(child => child != null && child !== false && child !== true)
  return {
    type,
    props: {
      ...props,
      children: children
        .flat()
        .filter((child) => child != null && child !== false && child !== true)
        .map((child) =>
          typeof child === "object" ? child : createTextElement(child)
        ),
    },
  };
}

export function createTextElement(text: any): TextElement {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

// Helper pour vérifier si on est dans un contexte SVG
function isInSvg(fiber: Fiber | null): boolean {
  if (!fiber) return false;
  if (fiber.type === "svg") return true;
  if (fiber.type === "foreignObject") return false;
  return isInSvg(fiber.parent || null);
}

// Création de nœuds DOM
export function createDom(fiber: Fiber): Node {
  // console.log('createDom', fiber);

  // Détection SVG
  const isSvg = fiber.type === "svg" || isInSvg(fiber.parent || null);

  const dom =
    fiber.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : isSvg
      ? document.createElementNS(
          "http://www.w3.org/2000/svg",
          fiber.type as string
        )
      : document.createElement(fiber.type as string);

  updateDom(dom, {}, fiber.props || {}, fiber.type !== "TEXT_ELEMENT");
  return dom;
}

// Mise à jour des propriétés DOM
export function updateDom(
  dom: any,
  prevProps: Props,
  nextProps: Props,
  isNotText: boolean = false
): void {
  const isEvent = (key: string): boolean => key.startsWith("on");
  const isProperty = (key: string): boolean =>
    key !== "children" && key !== "ref" && key !== "key" && !isEvent(key);
  const isNew =
    (prev: Props, next: Props) =>
    (key: string): boolean =>
      prev[key] !== next[key];
  const isGone =
    (prev: Props, next: Props) =>
    (key: string): boolean =>
      !(key in next);

  const isSvg = dom instanceof SVGElement;

  // console.log('updateDom', prevProps, nextProps);
  // Supprimer les anciens event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[name]);
    });

  // Supprimer les anciennes propriétés
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => {
      if (name === "className" && isSvg) {
        dom.removeAttribute("class");
      } else {
        dom[name] = "";
        // Note: removeAttribute might be safer for some attributes
        if (isNotText) {
          dom.removeAttribute(name);
        }
      }
    });

  // Ajouter ou mettre à jour les propriétés
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      // console.log('TEST-A', name, nextProps[name]);

      const value = nextProps[name];

      // Si la valeur est false, on supprime l'attribut (ex: disabled=false)
      if (value === false) {
        dom.removeAttribute(name);
        if (!isSvg && name in dom) {
          dom[name] = false;
        }
        return;
      }

      if (name === "className") {
        if (isSvg) {
          dom.setAttribute("class", value);
        } else {
          dom.className = value;
        }
      } else {
        // Pour les propriétés standard
        if (!isSvg) {
          dom[name] = value;
        } else {
          // Pour SVG, on privilégie setAttribute pour tout sauf style/dataset ?
          // Mais dom[name] = ... peut marcher pour 'id', etc.
          // On fait les deux ou juste setAttribute pour SVG.
          // setAttribute est plus sûr pour SVG.
          dom.setAttribute(name, value);
        }

        if (isNotText && name !== "className" && !isSvg) {
          // Pour les attributs booléens avec valeur true, on met juste le nom de l'attribut
          if (value === true) {
            dom.setAttribute(name, "");
          } else {
            dom.setAttribute(name, value);
          }
        }
      }
    });

  // Ajouter les nouveaux event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[name]);
    });
}
