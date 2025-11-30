export interface Props {
  [key: string]: any;
  children?: Element[];
}

export type Element = {
  type: string | Function | symbol;
  props: Props;
}

export type TextElement = {
  type: "TEXT_ELEMENT";
  props: {
    nodeValue: any;
    children: Element[];
  };
}

export type Fiber = {
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

export type Hook = {
  state: any;
  queue: any[];
} | {
  deps: any[];
  callback: Function | null;
  cleanup: Function | null;
};

export type Context = {
  _currentValue: any;
  Provider: (props: { children: any, value: any }) => Element;
  Consumer: (props: { children: (value: any) => Element }) => Element;
}

