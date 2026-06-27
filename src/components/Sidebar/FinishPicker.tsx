import { useDesignStore } from '../../state/designStore';
import { DEFAULT_CHAMELEON_COLORS, type FinishType, type ZoneId } from '../../state/types';
import { useT } from '../../i18n/useT';
import type { I18nKey } from '../../i18n/strings';
import { ColorPicker } from '../ui/ColorPicker';

// Without a `zone`, the picker controls the whole frame (finish/colour apply to
// all frame zones); it reads from one canonical frame zone so it's stable
// regardless of the active zone. With a `zone` (a rim), it controls just that
// rim. The store setters decide frame-global vs per-rim from the passed zone.
const FRAME_REF_ZONE: ZoneId = 'topTube';

const FINISHES: { value: FinishType; labelKey: I18nKey }[] = [
  { value: 'matte', labelKey: 'finishMatte' },
  { value: 'satin', labelKey: 'finishSatin' },
  { value: 'glossy', labelKey: 'finishGlossy' },
  { value: 'metallic', labelKey: 'finishMetallic' },
  { value: 'chameleon', labelKey: 'finishChameleon' },
];

const CHAMELEON_LABELS: Record<0 | 1 | 2, I18nKey> = {
  0: 'chameleonColorA',
  1: 'chameleonColorB',
  2: 'chameleonColorC',
};

export function FinishPicker({ zone }: { zone?: ZoneId } = {}) {
  const target = zone ?? FRAME_REF_ZONE;
  const finish = useDesignStore((s) => s.zones[target]?.finish ?? 'matte');
  const baseColor = useDesignStore((s) => s.zones[target]?.baseColor ?? '#888888');
  const chameleonColors = useDesignStore(
    (s) => s.zones[target]?.chameleonColors ?? DEFAULT_CHAMELEON_COLORS,
  );
  const setFinish = useDesignStore((s) => s.setFinish);
  const setBaseColor = useDesignStore((s) => s.setBaseColor);
  const setChameleonColor = useDesignStore((s) => s.setChameleonColor);
  const t = useT();

  return (
    <div className="space-y-3">
      <label className="space-y-2 block">
        <div className="m3-section-title">{t('paintFinish')}</div>
        <select
          value={finish}
          onChange={(e) => setFinish(target, e.target.value as FinishType)}
          className="m3-field"
        >
          {FINISHES.map((f) => (
            <option key={f.value} value={f.value}>
              {t(f.labelKey)}
            </option>
          ))}
        </select>
      </label>

      {finish === 'chameleon' && (
        <div className="grid grid-cols-3 gap-2">
          {([0, 1, 2] as const).map((idx) => (
            <ColorPicker
              key={idx}
              value={chameleonColors[idx]}
              label={t(CHAMELEON_LABELS[idx])}
              onChange={(color) => setChameleonColor(target, idx, color)}
            />
          ))}
        </div>
      )}

      <ColorPicker
        value={baseColor}
        label={t('baseColor')}
        onChange={(color) => setBaseColor(target, color)}
      />
    </div>
  );
}
