import { createContext, useContext, useState, useEffect, createElement, Fragment, useMemo, useCallback } from 'my-react';
import type { Element } from 'my-react';

const LayoutContext = createContext<string | null>(null);

export function useLayout() {
  return useContext(LayoutContext);
}

export function LayoutProvider({ layout, children }: { layout: string; children: any }) : Element {
  return (
    <LayoutContext.Provider value={layout}>
      {children}
    </LayoutContext.Provider>
  );
}

interface RouterContextType {
    push: (path: string) => void;
    query: URLSearchParams;
    params: Record<string, string>;
    path: string;
}

const RouterContext = createContext<RouterContextType | null>(null);

export function useRouter() {
  return useContext(RouterContext) as RouterContextType;
}

export function useNavigate() {
  const { push } = useRouter();
  return push;
}

export function useQuery() {
  const { query } = useRouter();
  return query;
}

export function useParams() {
  const { params } = useRouter();
  return params;
}

export interface Route {
  path: string;
  component: (props: any) => Element;
  data?: any;
  name?: string;
}

export interface RouteGroup {
  layout?: (props: any) => Element;
  routes: (Route | RouteGroup)[];
}

export function Link({ to, children, ...props }: { to: string; children?: any; [key: string]: any }) : Element {
  const navigate = useNavigate();
  const handleClick = (e: any) => {
    e.preventDefault();
    navigate(to);
  };
  return <a href={to} onClick={handleClick} {...props}>{children}</a>;
}

export function Router({ groups, NoFound }: { groups: RouteGroup[], NoFound?: Element }) : Element {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [query, setQuery] = useState(new URLSearchParams(window.location.search));

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname);
      setQuery(new URLSearchParams(window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const push = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(window.location.pathname);
    setQuery(new URLSearchParams(window.location.search));
  }, []);

  const matchResult = useMemo(() => {
      function findMatch(items: (Route | RouteGroup)[], layouts: any[]): { matchedRoute: Route, matchedParams: Record<string, string>, layouts: any[] } | null {
        for (const item of items) {
          if ('routes' in item) {
             // It's a RouteGroup
             const nextLayouts = item.layout ? [...layouts, item.layout] : layouts;
             const match = findMatch(item.routes, nextLayouts);
             if (match) return match;
          } else {
             // It's a Route
             const match = matchPath(item.path, currentPath);
             if (match.matches) {
               return { matchedRoute: item, matchedParams: match.params, layouts };
             }
          }
        }
        return null;
      }

      const result = findMatch(groups, []);

      return result || { matchedRoute: null, matchedParams: {}, layouts: [] };
  }, [currentPath, groups]);

  const { matchedRoute, matchedParams, layouts } = matchResult;

  const routerContextValue = useMemo(() => ({
    push,
    query,
    params: matchedParams,
    path: currentPath
  }), [push, query, matchedParams, currentPath]);

  const content = matchedRoute
    ? (
        (() => {
            const Page = matchedRoute.component;
            let page = <Page {...matchedRoute.data} key={currentPath} />;

            if (layouts && layouts.length > 0) {
               page = layouts.reduceRight((acc: any, Layout: any) => {
                   return <Layout>{acc}</Layout>;
               }, page);
            }
            return page;
        })()
      )
    : (NoFound ? NoFound : <div>404</div>);

  return (
    <RouterContext.Provider value={routerContextValue}>
      {content}
    </RouterContext.Provider>
  );
}

function matchPath(pattern: string, pathname: string): { matches: boolean; params: Record<string, string> } {
  if (pattern === '*') return { matches: true, params: {} };

  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);

  if (patternParts.length !== pathParts.length) {
      return { matches: false, params: {} };
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    if (patternPart.startsWith(':')) {
      const paramName = patternPart.slice(1);
      params[paramName] = pathPart;
    } else if (patternPart !== pathPart) {
      return { matches: false, params: {} };
    }
  }

  return { matches: true, params };
}
