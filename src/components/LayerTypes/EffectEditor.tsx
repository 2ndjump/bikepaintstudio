import { useDesignStore } from '../../state/designStore';
import type { EffectKind, Layer, ZoneId } from '../../state/types';
import { useT } from '../../i18n/useT';
import type { I18nKey } from '../../i18n/strings';
import { Slider } from '../ui/Slider';

interface Props {
  layer: Layer;
  zoneId: ZoneId;
}

const KINDS: { value: EffectKind; labelKey: I18nKey }[] = [
  { value: 'gaussian', labelKey: 'distortionGaussian' },
  { value: 'directional', labelKey: 'distortionDirectional' },
  { value: 'motion', labelKey: 'distortionMotion' },
];

/** Per-layer effect controls (blur/smear), shown inside every layer card. */
export function EffectEditor({ layer, zoneId }: Props) {
  const updateLayer = useDesignStore((s) => s.updateLayer);
  const t = useT();
  const effect = layer.effect;

  function setKind(value: string) {
    if (value === 'none') {
      updateLayer(zoneId, layer.id, { effect: undefined });
    } else {
      updateLayer(zoneId, layer.id, {
        effect: {
          kind: value as EffectKind,
          amount: effect?.amount ?? 6,
          angle: effect?.angle ?? 0,
        },
      });
    }
  }

  return (
    <div className="space-y-2">
      <label className="m3-label flex flex-col gap-1">
        {t('distortionKind')}
        <select
          value={effect?.kind ?? 'none'}
          onChange={(e) => setKind(e.target.value)}
          className="m3-field"
        >
          <option value="none">{t('effectNone')}</option>
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {t(k.labelKey)}
            </option>
          ))}
        </select>
      </label>

      {effect && (
        <>
          <Slider
            label={t('amount')}
            unit="px"
            min={0}
            max={40}
            step={0.5}
            value={effect.amount}
            onChange={(v) => updateLayer(zoneId, layer.id, { effect: { ...effect, amount: v } })}
          />
          {effect.kind !== 'gaussian' && (
            <Slider
              label={t('angle')}
              unit="°"
              min={0}
              max={360}
              step={15}
              value={effect.angle}
              onChange={(v) => updateLayer(zoneId, layer.id, { effect: { ...effect, angle: v } })}
            />
          )}
        </>
      )}
    </div>
  );
}
