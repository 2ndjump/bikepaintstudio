import type { I18nKey } from '../i18n/strings';
import type { DesignFile } from '../state/designStore';

/**
 * Bundled ready-made designs: plain saved-design files (<id>.json, the Save
 * format) with a render of each as a thumbnail — the whole bike
 * (thumbs/<id>.webp) and its front wheel alone for the wheel designer
 * (thumbs/wheels/<id>.webp). Regenerate both sets with `npm run dev`, then
 * `node scripts/render-template-thumbs.mjs`.
 */
const designs = import.meta.glob<DesignFile>('./*.json', { import: 'default' });
const thumbs = import.meta.glob<string>('./thumbs/**/*.webp', {
  eager: true,
  import: 'default',
  query: '?url',
});

/** Gallery filter groups (metadata only; not part of the saved design). */
export const CATEGORIES: { id: string; nameKey: I18nKey }[] = [
  { id: 'racy', nameKey: 'catRacy' },
  { id: 'aggressive', nameKey: 'catAggressive' },
  { id: 'artistic', nameKey: 'catArtistic' },
  { id: 'heritage', nameKey: 'catHeritage' },
  { id: 'clean', nameKey: 'catClean' },
];

const LIST: { id: string; nameKey: I18nKey; category: string }[] = [
  { id: 'race', nameKey: 'tplRace', category: 'racy' },
  { id: 'teamblock', nameKey: 'tplTeamblock', category: 'racy' },
  { id: 'tricolore', nameKey: 'tplTricolore', category: 'racy' },
  { id: 'number', nameKey: 'tplNumber', category: 'racy' },
  { id: 'neontt', nameKey: 'tplNeontt', category: 'racy' },
  { id: 'stealth', nameKey: 'tplStealth', category: 'aggressive' },
  { id: 'hazard', nameKey: 'tplHazard', category: 'aggressive' },
  { id: 'shards', nameKey: 'tplShards', category: 'aggressive' },
  { id: 'claws', nameKey: 'tplClaws', category: 'aggressive' },
  { id: 'glitch', nameKey: 'tplGlitch', category: 'aggressive' },
  { id: 'fade', nameKey: 'tplFade', category: 'artistic' },
  { id: 'pop', nameKey: 'tplPop', category: 'artistic' },
  { id: 'chameleon', nameKey: 'tplChameleon', category: 'artistic' },
  { id: 'splatter', nameKey: 'tplSplatter', category: 'artistic' },
  { id: 'marble', nameKey: 'tplMarble', category: 'artistic' },
  { id: 'retro', nameKey: 'tplRetro', category: 'heritage' },
  { id: 'bordeaux', nameKey: 'tplBordeaux', category: 'heritage' },
  { id: 'celeste', nameKey: 'tplCeleste', category: 'heritage' },
  { id: 'barber', nameKey: 'tplBarber', category: 'heritage' },
  { id: 'minimal', nameKey: 'tplMinimal', category: 'clean' },
  { id: 'diagonal', nameKey: 'tplDiagonal', category: 'clean' },
  { id: 'accentline', nameKey: 'tplAccentline', category: 'clean' },
  { id: 'pastel', nameKey: 'tplPastel', category: 'clean' },
];

export const TEMPLATES = LIST.map((t) => ({
  ...t,
  thumb: thumbs[`./thumbs/${t.id}.webp`],
  wheelThumb: thumbs[`./thumbs/wheels/${t.id}.webp`],
  /** Fetched on demand, so the designs stay out of the main bundle. */
  load: designs[`./${t.id}.json`],
}));
