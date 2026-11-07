/** Minimal external store (works with React's useSyncExternalStore and with plain JS / the renderer). */
export function createStore(initial) {
  let state = initial;
  const subs = new Set();
  return {
    getState: () => state,
    setState(next) { state = typeof next === 'function' ? next(state) : next; subs.forEach((s) => s()); },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
}
