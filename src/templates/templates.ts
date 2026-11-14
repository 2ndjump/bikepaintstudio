import type { I18nKey } from '../i18n/strings';
import type { DesignFile } from '../state/designStore';

/**
 * Bundled ready-made designs: plain saved-design files (<id>.json, the Save
 * format) with a render of each as a thumbnail (thumbs/<id>.webp). Regenerate
 * the thumbnails with `npm run dev`, then `node scripts/render-template-thumbs.mjs`.
 */
const designs = import.meta.glob<DesignFile>('./*.json', { import: 'default' });
const thumbs = import.meta.glob<string>('./thumbs/*.webp', {
  eager: true,
  import: 'default',
  query: '?url',
});

const LIST: { id: string; nameKey: I18nKey }[] = [
  { id: 'diagonal', nameKey: 'tplDiagonal' },
  { id: 'race', nameKey: 'tplRace' },
  { id: 'fade', nameKey: 'tplFade' },
  { id: 'stealth', nameKey: 'tplStealth' },
  { id: 'retro', nameKey: 'tplRetro' },
  { id: 'pop', nameKey: 'tplPop' },
  { id: 'chameleon', nameKey: 'tplChameleon' },
  { id: 'minimal', nameKey: 'tplMinimal' },
];

export const TEMPLATES = LIST.map((t) => ({
  ...t,
  thumb: thumbs[`./thumbs/${t.id}.webp`],
  /** Fetched on demand, so the designs stay out of the main bundle. */
  load: designs[`./${t.id}.json`],
}));
