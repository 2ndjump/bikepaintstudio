import { useDesignStore } from '../../state/designStore';
import { DEFAULT_CHAMELEON_COLORS, type FinishType } from '../../state/types';
import { useT } from '../../i18n/useT';
import type { I18nKey } from '../../i18n/strings';
import { ColorPicker } from '../ui/ColorPicker';

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

export function FinishPicker() {
  const activeZone = useDesignStore((s) => s.activeZone);
  const finish = useDesignStore((s) => s.zones[s.activeZone]?.finish ?? 'matte');
  const baseColor = useDesignStore((s) => s.zones[s.activeZone]?.baseColor ?? '#888888');
  const chameleonColors = useDesignStore(
    (s) => s.zones[s.activeZone]?.chameleonColors ?? DEFAULT_CHAMELEON_COLORS,
  );
  const setFinish = useDesignStore((s) => s.setFinish);
  const setBaseColor = useDesignStore((s) => s.setBaseColor);
  const setChameleonColor = useDesignStore((s) => s.setChameleonColor);
  const t = useT();

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="m3-section-title">{t('paintFinish')}</div>
        <div className="grid grid-cols-2 gap-1.5">
          {FINISHES.map((f) => (
            <button
              key={f.value}
              onClick={() => setFinish(activeZone, f.value)}
              className={`m3-chip justify-center ${finish === f.value ? 'm3-chip-active' : ''}`}
            >
              {t(f.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {finish === 'chameleon' && (
        <div className="grid grid-cols-3 gap-2">
          {([0, 1, 2] as const).map((idx) => (
            <ColorPicker
              key={idx}
              value={chameleonColors[idx]}
              label={t(CHAMELEON_LABELS[idx])}
              onChange={(color) => setChameleonColor(activeZone, idx, color)}
            />
          ))}
        </div>
      )}

      <ColorPicker
        value={baseColor}
        label={t('baseColor')}
        onChange={(color) => setBaseColor(activeZone, color)}
      />
    </div>
  );
}
