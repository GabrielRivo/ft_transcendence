import type { Context, Element } from '../types';

// Création et gestion du Context
export function createContext<T>(defaultValue: T): Context {
  const context: Context = {
    _currentValue: defaultValue,
    Provider: function(props: { children?: any, value: T }) {
      const oldValue = context._currentValue;
      context._currentValue = props.value;
      return {
        type: 'CONTEXT_PROVIDER',
        props: {
          children: Array.isArray(props.children) ? props.children : [props.children], 
          context,
          value: props.value,
          oldValue: oldValue,
        }
      };
    },
    Consumer: function(props: { children: (value: T) => Element }) {
      return props.children(context._currentValue);
    }
  };
  return context;
}

// Hook useContext
export function useContext<T>(context: Context): T {
  return context._currentValue;
}