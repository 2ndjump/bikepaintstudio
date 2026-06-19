import { useDesignStore } from '../../state/designStore';
import type { FinishType } from '../../state/types';
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
  const finish = useDesignStore((s) => s.zones[s.activeZone].finish);
  const baseColor = useDesignStore((s) => s.zones[s.activeZone].baseColor);
  const chameleonColors = useDesignStore((s) => s.zones[s.activeZone].chameleonColors);
  const setFinish = useDesignStore((s) => s.setFinish);
  const setBaseColor = useDesignStore((s) => s.setBaseColor);
  const setChameleonColor = useDesignStore((s) => s.setChameleonColor);
  const t = useT();

  return (
    <div className="space-y-2">
      <div>
        <div className="text-xs uppercase tracking-wider text-neutral-400 mb-2">
          {t('paintFinish')}
        </div>
        <div className="grid grid-cols-2 gap-1">
          {FINISHES.map((f) => (
            <button
              key={f.value}
              onClick={() => setFinish(activeZone, f.value)}
              className={`rounded px-2 py-1.5 text-sm transition ${
                finish === f.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
              }`}
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
