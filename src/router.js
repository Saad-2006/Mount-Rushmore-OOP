import { MONUMENTS } from './config.js';

// Paths: "<base>" is the mountain, "<base><monument id>" is a world.
// The base is "/" locally and "/<repo>/" on GitHub Pages.
const BASE = import.meta.env.BASE_URL;
const ids = new Set(MONUMENTS.map((m) => m.id));

export function parse(pathname) {
  const rest = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname;
  const id = rest.replace(/^\/+|\/+$/g, '');
  return ids.has(id) ? id : null;
}

export function createRouter(onChange) {
  addEventListener('popstate', () => onChange(parse(location.pathname)));
  return {
    current: () => parse(location.pathname),
    go(id, { replace = false } = {}) {
      const path = id ? `${BASE}${id}` : BASE;
      if (path === location.pathname) return;
      history[replace ? 'replaceState' : 'pushState']({}, '', path);
      onChange(id);
    },
  };
}
