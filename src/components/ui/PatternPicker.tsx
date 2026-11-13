import { useEffect, useState } from 'react';
import type { PatternKind } from '../../state/types';
import { patternThumbnail } from '../../rendering/patterns';
import { useT } from '../../i18n/useT';
import type { I18nKey } from '../../i18n/strings';

const PATTERNS: { value: PatternKind; labelKey: I18nKey }[] = [
  { value: 'hexagons', labelKey: 'patternHexagons' },
  { value: 'stripes', labelKey: 'patternStripes' },
  { value: 'carbon', labelKey: 'patternCarbon' },
  { value: 'smoke', labelKey: 'patternSmoke' },
  { value: 'thread', labelKey: 'patternThread' },
  { value: 'splashes', labelKey: 'patternSplashes' },
  { value: 'topo', labelKey: 'patternTopo' },
  { value: 'marble', labelKey: 'patternMarble' },
  { value: 'voronoi', labelKey: 'patternVoronoi' },
  { value: 'camo', labelKey: 'patternCamo' },
  { value: 'digicamo', labelKey: 'patternDigiCamo' },
  { value: 'circuit', labelKey: 'patternCircuit' },
  { value: 'mesh', labelKey: 'patternMesh' },
  { value: 'forged', labelKey: 'patternForged' },
];

/** Thumbnail tiles are drawn at 2× for sharpness on hi-dpi screens. */
const THUMB_PX = 96;

/** The pattern's mask, generated after mount (one per macrotask, so opening a
 *  grid never blocks the UI) and cached forever by patternThumbnail. */
function useThumbnail(pattern: PatternKind): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setUrl(patternThumbnail(pattern, THUMB_PX)));
    return () => clearTimeout(id);
  }, [pattern]);
  return url;
}

function Swatch({
  pattern,
  color,
  background,
}: {
  pattern: PatternKind;
  color: string;
  background: string;
}) {
  const url = useThumbnail(pattern);
  return (
    <span className="pattern-swatch" style={{ background }}>
      {url && (
        <span
          className="absolute inset-0"
          style={{ backgroundColor: color, maskImage: `url(${url})`, WebkitMaskImage: `url(${url})` }}
        />
      )}
    </span>
  );
}

/**
 * Grid of pattern thumbnails in the real pattern drawn in `color` over
 * `background` (the colours it will be painted in). With `noneLabel`, a first
 * tile clears the pattern (onChange(undefined)).
 */
export function PatternPicker({
  value,
  onChange,
  color,
  background,
  noneLabel,
}: {
  value: PatternKind | undefined;
  onChange: (p: PatternKind | undefined) => void;
  color: string;
  background: string;
  noneLabel?: string;
}) {
  const t = useT();
  const current = PATTERNS.find((p) => p.value === value);
  return (
    <div className="space-y-1.5">
      <div className="m3-label">
        {t('pattern')}: <span className="text-[var(--md-on-surface)] font-medium">{current ? t(current.labelKey) : noneLabel}</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={t('pattern')}>
        {noneLabel !== undefined && (
          <button
            type="button"
            role="radio"
            aria-checked={value === undefined}
            title={noneLabel}
            aria-label={noneLabel}
            onClick={() => onChange(undefined)}
            className={`pattern-tile ${value === undefined ? 'pattern-tile-active' : ''}`}
          >
            <span className="pattern-swatch pattern-none" style={{ background }} />
          </button>
        )}
        {PATTERNS.map((p) => (
          <button
            key={p.value}
            type="button"
            role="radio"
            aria-checked={value === p.value}
            title={t(p.labelKey)}
            aria-label={t(p.labelKey)}
            onClick={() => onChange(p.value)}
            className={`pattern-tile ${value === p.value ? 'pattern-tile-active' : ''}`}
          >
            <Swatch pattern={p.value} color={color} background={background} />
          </button>
        ))}
      </div>
    </div>
  );
}
