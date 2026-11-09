import { assets } from './assetStore.js';

// Web fonts that index.html preloads from Google Fonts, plus system stacks.
export const BUILTIN_FONTS = [
  'Inter', 'Roboto', 'Montserrat', 'Poppins', 'Raleway', 'Archivo', 'Oswald', 'Bebas Neue', 'Anton', 'Teko',
  'Playfair Display', 'Cinzel', 'Abril Fatface', 'Lobster', 'Pacifico', 'Dancing Script', 'Caveat', 'Permanent Marker',
  'Orbitron', 'Audiowide', 'Righteous', 'Bungee', 'Russo One', 'Press Start 2P', 'Space Mono',
  'Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'system-ui',
];
export const FONT_FALLBACK = 'system-ui, "Segoe UI", Roboto, Arial, sans-serif';

class FontStore {
  constructor() {
    this.imported = []; this.listeners = new Set(); this.version = 0;
    if (typeof document !== 'undefined' && document.fonts?.addEventListener) {
      document.fonts.addEventListener('loadingdone', () => this.emit());
      document.fonts.addEventListener('loadingerror', () => this.emit());
    }
  }
  subscribe = (fn) => { this.listeners.add(fn); return () => this.listeners.delete(fn); };
  emit() { this.version++; this.listeners.forEach((l) => l()); }
  families() { return [...BUILTIN_FONTS, ...this.imported]; }

  /** True when the family can really be drawn (loaded web font, imported font or a system font). */
  isAvailable(family) {
    if (typeof document === 'undefined' || !document.fonts) return true;
    return family === 'system-ui' || document.fonts.check(`16px "${family}"`);
  }

  async register(family, buffer) {
    const face = new FontFace(family, buffer);
    await face.load();
    document.fonts.add(face);
    if (!this.imported.includes(family)) this.imported.push(family);
    this.emit();
  }
  /** Imports a user font file (.ttf/.otf/.woff/.woff2) and persists it. */
  async importFile(file) {
    if (!/\.(ttf|otf|woff2?)$/i.test(file.name)) throw new Error('Unsupported font format. Use TTF, OTF, WOFF or WOFF2.');
    const family = file.name.replace(/\.[^.]+$/, '').replace(/[^\w\- ]+/g, ' ').trim() || 'Imported Font';
    await this.register(family, await file.arrayBuffer()).catch(() => { throw new Error('This font file could not be loaded.'); });
    await assets.put({ id: `font:${family}`, kind: 'font', name: family, mime: file.type || 'font/ttf', blob: file });
    return family;
  }
  async restore() {
    for (const rec of await assets.all('font')) {
      try { await this.register(rec.name, await rec.blob.arrayBuffer()); } catch { /* corrupt font record: skip */ }
    }
  }
}
export const fontStore = new FontStore();
