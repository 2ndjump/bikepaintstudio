import { useDesignStore } from '../../state/designStore';
import type { PatternKind, PatternLayer, ZoneId } from '../../state/types';
import { useT } from '../../i18n/useT';
import type { I18nKey } from '../../i18n/strings';
import { ColorPicker } from '../ui/ColorPicker';

interface Props {
  layer: PatternLayer;
  zoneId: ZoneId;
}

const PATTERNS: { value: PatternKind; labelKey: I18nKey }[] = [
  { value: 'hexagons', labelKey: 'patternHexagons' },
  { value: 'stripes', labelKey: 'patternStripes' },
  { value: 'carbon', labelKey: 'patternCarbon' },
  { value: 'smoke', labelKey: 'patternSmoke' },
  { value: 'thread', labelKey: 'patternThread' },
  { value: 'splashes', labelKey: 'patternSplashes' },
];

export function PatternLayerEditor({ layer, zoneId }: Props) {
  const updateLayer = useDesignStore((s) => s.updateLayer);
  const t = useT();
  return (
    <div className="space-y-2">
      <select
        value={layer.pattern}
        onChange={(e) =>
          updateLayer(zoneId, layer.id, {
            pattern: e.target.value as PatternKind,
          })
        }
        className="m3-field"
      >
        {PATTERNS.map((p) => (
          <option key={p.value} value={p.value}>
            {t(p.labelKey)}
          </option>
        ))}
      </select>
      <ColorPicker
        value={layer.color}
        label={t('color')}
        onChange={(color) => updateLayer(zoneId, layer.id, { color })}
      />
      <label className="text-xs text-neutral-400 flex flex-col gap-1">
        {t('scale')} {layer.scale.toFixed(1)}
        <input
          type="range"
          min={1}
          max={60}
          step={0.5}
          value={layer.scale}
          onChange={(e) =>
            updateLayer(zoneId, layer.id, { scale: parseFloat(e.target.value) })
          }
        />
      </label>
      <label className="text-xs text-neutral-400 flex flex-col gap-1">
        {t('rotation')} {layer.rotation.toFixed(0)}°
        <input
          type="range"
          min={0}
          max={360}
          step={15}
          value={layer.rotation}
          onChange={(e) =>
            updateLayer(zoneId, layer.id, {
              rotation: parseFloat(e.target.value),
            })
          }
        />
      </label>
      <label className="text-xs text-neutral-400 flex flex-col gap-1">
        {t('rotationX')} {(layer.rotationX ?? 0).toFixed(0)}°
        <input
          type="range"
          min={-75}
          max={75}
          step={15}
          value={layer.rotationX ?? 0}
          onChange={(e) =>
            updateLayer(zoneId, layer.id, { rotationX: parseFloat(e.target.value) })
          }
        />
      </label>
      <label className="text-xs text-neutral-400 flex flex-col gap-1">
        {t('rotationY')} {(layer.rotationY ?? 0).toFixed(0)}°
        <input
          type="range"
          min={-75}
          max={75}
          step={15}
          value={layer.rotationY ?? 0}
          onChange={(e) =>
            updateLayer(zoneId, layer.id, { rotationY: parseFloat(e.target.value) })
          }
        />
      </label>
      <label className="text-xs text-neutral-400 flex flex-col gap-1">
        {t('intensity')} {Math.round(layer.intensity * 100)}%
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={layer.intensity}
          onChange={(e) =>
            updateLayer(zoneId, layer.id, {
              intensity: parseFloat(e.target.value),
            })
          }
        />
      </label>
    </div>
  );
}
