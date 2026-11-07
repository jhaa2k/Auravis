import { useSyncExternalStore, useEffect, useState } from 'react';
import { store } from './services.js';
import { assets } from '../core/assets/assetStore.js';

export const useStore = (s, selector = (x) => x) => useSyncExternalStore(s.subscribe, () => selector(s.getState()), () => selector(s.getState()));
export const useApp = (selector) => useStore(store, selector);

/** Object URL for a stored asset (image preview). */
export function useAssetUrl(id) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let revoked = false, u = null;
    setUrl(null);
    if (!id) return;
    assets.get(id).then((rec) => {
      if (rec && !revoked) { u = URL.createObjectURL(rec.blob); setUrl(u); }
    });
    return () => { revoked = true; if (u) URL.revokeObjectURL(u); };
  }, [id]);
  return url;
}
