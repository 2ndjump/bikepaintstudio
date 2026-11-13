import { useDesignStore } from '../../state/designStore';
import type { BikeVariant } from '../../state/types';
import { useT } from '../../i18n/useT';
import type { I18nKey } from '../../i18n/strings';

const DISCIPLINES: { value: BikeVariant['discipline']; labelKey: I18nKey }[] = [
  { value: 'gravel', labelKey: 'variantGravel' },
  { value: 'road', labelKey: 'variantRoad' },
];

const STYLES: { value: BikeVariant['style']; labelKey: I18nKey }[] = [
  { value: 'classic', labelKey: 'variantClassic' },
  { value: 'aero', labelKey: 'variantAero' },
];

/** Frame model: Road/Gravel × Classic/Aero. The paint carries over on switch. */
export function VariantPicker() {
  const variant = useDesignStore((s) => s.variant);
  const setVariant = useDesignStore((s) => s.setVariant);
  const t = useT();

  return (
    <div className="space-y-2">
      <div className="m3-section-title">{t('bikeModel')}</div>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="m3-segmented w-full" role="group">
          {DISCIPLINES.map((d) => (
            <button
              key={d.value}
              onClick={() => variant.discipline !== d.value && setVariant({ discipline: d.value })}
              className={`m3-seg flex-1 px-1 ${variant.discipline === d.value ? 'm3-seg-active' : ''}`}
            >
              {t(d.labelKey)}
            </button>
          ))}
        </div>
        <div className="m3-segmented w-full" role="group">
          {STYLES.map((s) => (
            <button
              key={s.value}
              onClick={() => variant.style !== s.value && setVariant({ style: s.value })}
              className={`m3-seg flex-1 px-1 ${variant.style === s.value ? 'm3-seg-active' : ''}`}
            >
              {t(s.labelKey)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
