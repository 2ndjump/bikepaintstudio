const CURATED_GOOGLE_FONTS = [
  // --- Racing / Speed ---
  'Bebas Neue',
  'Anton',
  'Archivo Black',
  'Russo One',
  'Black Ops One',
  'Racing Sans One',
  'Faster One',
  'Saira Condensed',
  'Staatliches',
  'Teko',
  'Rajdhani',
  // --- Tech / Industrial ---
  'Audiowide',
  'Orbitron',
  'Michroma',
  'Syncopate',
  'Exo 2',
  'Quantico',
  'Gugi',
  'Aldrich',
  'Nova Square',
  'Share Tech Mono',
  // --- Bold Display ---
  'Oswald',
  'Bungee',
  'Righteous',
  'Fjalla One',
  'Passion One',
  'Lilita One',
  'Boogaloo',
  'Lobster',
  'Alfa Slab One',
  'Ultra',
  // --- Condensed / Tall ---
  'Barlow Condensed',
  'Squada One',
  'Changa',
  'Chakra Petch',
  'Saira Extra Condensed',
  'Yanone Kaffeesatz',
  // --- Script / Handlettering ---
  'Permanent Marker',
  'Pacifico',
  'Satisfy',
  'Dancing Script',
  'Sacramento',
  'Cookie',
  'Caveat',
  'Kalam',
  'Patrick Hand',
  'Rock Salt',
  // --- Graffiti / Street ---
  'Bungee Shade',
  'Bungee Inline',
  'Creepster',
  'Rubik Dirt',
  'Rubik Glitch',
  'Rubik Bubbles',
  'Eater',
  'Bangers',
  'Fredoka One',
  // --- Geometric / Clean ---
  'Montserrat',
  'Josefin Sans',
  'Titillium Web',
  'Roboto Condensed',
  'Nunito',
  'Poppins',
  'DM Sans',
  // --- Serif / Elegant ---
  'Playfair Display',
  'Abril Fatface',
  'Cormorant Garamond',
  'Cinzel',
  'Cinzel Decorative',
  'Bodoni Moda',
  'DM Serif Display',
  // --- Retro / Vintage ---
  'Rye',
  'Alfa Slab One',
  'Arvo',
  'Crete Round',
  'Kreon',
  // --- Pixel / Retro Digital ---
  'Press Start 2P',
  'VT323',
  'Silkscreen',
  // --- Monospace ---
  'Major Mono Display',
  'Fira Code',
  'JetBrains Mono',
  'Share Tech Mono',
  'Courier Prime',
];

export type FontSource = 'google' | 'system' | 'upload';

export interface FontEntry {
  family: string;
  source: FontSource;
}

const googleLoaded = new Set<string>();
const systemFonts = new Set<string>();
const uploadedFonts = new Set<string>();

const subscribers = new Set<() => void>();
let cachedEntries: FontEntry[] | null = null;

function notify() {
  cachedEntries = null;
  for (const fn of subscribers) fn();
}

export function subscribeFonts(fn: () => void): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

export function getAllFontOptions(): FontEntry[] {
  if (cachedEntries) return cachedEntries;
  const entries: FontEntry[] = [];
  for (const f of CURATED_GOOGLE_FONTS) entries.push({ family: f, source: 'google' });
  for (const f of systemFonts) entries.push({ family: f, source: 'system' });
  for (const f of uploadedFonts) entries.push({ family: f, source: 'upload' });
  cachedEntries = entries;
  return entries;
}

export function getGoogleFontOptions(): string[] {
  return CURATED_GOOGLE_FONTS;
}

export function ensureFontLoaded(family: string): Promise<void> {
  if (googleLoaded.has(family) || systemFonts.has(family) || uploadedFonts.has(family)) {
    return Promise.resolve();
  }
  if (!CURATED_GOOGLE_FONTS.includes(family)) {
    return Promise.resolve();
  }
  googleLoaded.add(family);

  const encoded = family.replace(/ /g, '+');
  const href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;700&display=swap`;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);

  if ('fonts' in document && document.fonts.load) {
    return document.fonts.load(`16px "${family}"`).then(() => {});
  }
  return Promise.resolve();
}

export function preloadCommonFonts(): void {
  for (const f of CURATED_GOOGLE_FONTS.slice(0, 8)) {
    ensureFontLoaded(f);
  }
}

interface LocalFontData {
  family: string;
}

interface NavigatorWithFonts {
  fonts?: {
    query(): Promise<LocalFontData[]>;
  };
}

export function systemFontsAvailable(): boolean {
  const nav = navigator as NavigatorWithFonts;
  return typeof nav.fonts?.query === 'function';
}

export async function requestSystemFonts(): Promise<boolean> {
  const nav = navigator as NavigatorWithFonts;
  if (!nav.fonts?.query) return false;
  try {
    const fonts = await nav.fonts.query();
    const families = new Set<string>();
    for (const f of fonts) families.add(f.family);
    for (const fam of families) systemFonts.add(fam);
    notify();
    return true;
  } catch {
    return false;
  }
}

export async function uploadFontFile(file: File): Promise<string | null> {
  const buf = await file.arrayBuffer();
  const family = file.name.replace(/\.(ttf|otf|woff2?)$/i, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  try {
    const face = new FontFace(family, buf);
    await face.load();
    (document as unknown as { fonts: FontFaceSet }).fonts.add(face);
    uploadedFonts.add(family);
    notify();
    return family;
  } catch {
    return null;
  }
}
