declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export interface Props {
  [key: string]: any;
  children?: Element[];
}

export interface Element {
  key?: string | number;
  type: string | Function | symbol;
  props: Props;
}

export interface TextElement {
  type: "TEXT_ELEMENT";
  props: {
    nodeValue: any;
    children: Element[];
  };
}

export interface Fiber {
  type: string | Function | symbol;
  props: Props;
  dom: Node | null;
  parent?: Fiber;
  child?: Fiber;
  sibling?: Fiber;
  alternate?: Fiber | null;
  effectTag?: "PLACEMENT" | "UPDATE" | "DELETION";
  hooks?: Hook[];
}

// export interface RefObject<T> {
//   current: T | null;
// }

export type RefObject<T> = {
  current: T | null;
}

export type Hook = {
  state: any;
  queue: any[];
} | {
  deps: any[];
  callback: Function | null;
  cleanup: Function | null;
};

export interface Context {
  _currentValue: any;
  Provider: (props: { children: any, value: any }) => Element;
  Consumer: (props: { children: (value: any) => Element }) => Element;
}

export { };