import { useDesignStore } from '../../state/designStore';
import type { DistortionKind, DistortionLayer, ZoneId } from '../../state/types';
import { useT } from '../../i18n/useT';
import type { I18nKey } from '../../i18n/strings';

interface Props {
  layer: DistortionLayer;
  zoneId: ZoneId;
}

const KINDS: { value: DistortionKind; labelKey: I18nKey }[] = [
  { value: 'gaussian', labelKey: 'distortionGaussian' },
  { value: 'directional', labelKey: 'distortionDirectional' },
  { value: 'motion', labelKey: 'distortionMotion' },
];

export function DistortionLayerEditor({ layer, zoneId }: Props) {
  const updateLayer = useDesignStore((s) => s.updateLayer);
  const t = useT();

  return (
    <div className="space-y-2">
      <label className="text-xs text-neutral-400 flex flex-col gap-1">
        {t('distortionKind')}
        <select
          value={layer.kind}
          onChange={(e) =>
            updateLayer(zoneId, layer.id, { kind: e.target.value as DistortionKind })
          }
          className="bg-neutral-800 text-neutral-100 text-xs rounded px-2 py-1 border border-neutral-700"
        >
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {t(k.labelKey)}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-neutral-400 flex flex-col gap-1">
        {t('amount')} {layer.amount.toFixed(1)}px
        <input
          type="range"
          min={0}
          max={40}
          step={0.5}
          value={layer.amount}
          onChange={(e) => updateLayer(zoneId, layer.id, { amount: parseFloat(e.target.value) })}
        />
      </label>
      {layer.kind !== 'gaussian' && (
        <label className="text-xs text-neutral-400 flex flex-col gap-1">
          {t('angle')} {layer.angle.toFixed(0)}°
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={layer.angle}
            onChange={(e) => updateLayer(zoneId, layer.id, { angle: parseFloat(e.target.value) })}
          />
        </label>
      )}
    </div>
  );
}
