import { useDesignStore } from '../../state/designStore';
import type { Layer, ZoneId } from '../../state/types';
import { useT } from '../../i18n/useT';
import { ColorPicker } from '../ui/ColorPicker';
import { Slider } from '../ui/Slider';
import { PatternPicker } from '../ui/PatternPicker';

/** A pattern inside the layer's own outline (text, shape, image). */
export function FillEditor({ layer, zoneId }: { layer: Layer; zoneId: ZoneId }) {
  const updateLayer = useDesignStore((s) => s.updateLayer);
  const t = useT();
  const fill = layer.fill;
  const base = 'color' in layer ? layer.color : '#888888';
  const set = (patch: Partial<NonNullable<Layer['fill']>>) =>
    fill && updateLayer(zoneId, layer.id, { fill: { ...fill, ...patch } });
  return (
    <div className="space-y-2">
      <PatternPicker
        value={fill?.pattern}
        noneLabel={t('dividerPatternNone')}
        color={fill?.color ?? '#141414'}
        background={base}
        onChange={(pattern) =>
          updateLayer(zoneId, layer.id, {
            fill: pattern
              ? { color: '#141414', scale: 10, rotation: 0, intensity: 1, ...fill, pattern }
              : undefined,
          })
        }
      />
      {fill && (
        <>
          <ColorPicker value={fill.color} label={t('color')} onChange={(color) => set({ color })} />
          <Slider label={t('scale')} min={1} max={60} step={0.5} value={fill.scale} onChange={(v) => set({ scale: v })} />
          <Slider
            label={t('rotation')}
            unit="°"
            min={0}
            max={360}
            step={15}
            value={fill.rotation}
            onChange={(v) => set({ rotation: v })}
          />
          <Slider
            label={t('intensity')}
            unit="%"
            scale={100}
            min={0}
            max={1}
            step={0.01}
            value={fill.intensity}
            onChange={(v) => set({ intensity: v })}
          />
        </>
      )}
    </div>
  );
}
