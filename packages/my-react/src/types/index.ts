export interface Props {
  [key: string]: any;
  key?: string | number;
  children?: Element[];
}

export type Element = {
  type: string | Function | symbol;
  props: Props;
};

export type FragmentType = {
  type: "FRAGMENT";
  props: {
    children: Element[];
  };
};

export type TextElement = {
  type: "TEXT_ELEMENT";
  props: {
    nodeValue: any;
    children: Element[];
  };
};

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
};

export type Hook =
  | {
      // Cas useState
      state: any;
      queue: any[];
    }
  | {
      // Cas useEffect / useCallback
      deps: any[];
      callback: Function | null;
      cleanup: Function | null;
    }
  | {
      // --- AJOUT POUR useMemo ---
      deps: any[];
      value: any;
    };

export type Context = {
  _currentValue: any;
  Provider: (props: { children: any; value: any }) => Element;
  Consumer: (props: { children: (value: any) => Element }) => Element;
};
