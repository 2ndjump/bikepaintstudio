import { useDesignStore } from '../../state/designStore';
import type { PatternLayer, ZoneId } from '../../state/types';
import { useT } from '../../i18n/useT';
import { ColorPicker } from '../ui/ColorPicker';
import { Slider } from '../ui/Slider';
import { PatternPicker } from '../ui/PatternPicker';

interface Props {
  layer: PatternLayer;
  zoneId: ZoneId;
}

export function PatternLayerEditor({ layer, zoneId }: Props) {
  const updateLayer = useDesignStore((s) => s.updateLayer);
  const baseColor = useDesignStore((s) => s.zones[zoneId]?.baseColor ?? '#888888');
  const t = useT();
  return (
    <div className="space-y-2">
      <PatternPicker
        value={layer.pattern}
        onChange={(pattern) => pattern && updateLayer(zoneId, layer.id, { pattern })}
        color={layer.color}
        background={baseColor}
      />
      <ColorPicker
        value={layer.color}
        label={t('color')}
        onChange={(color) => updateLayer(zoneId, layer.id, { color })}
      />
      <Slider
        label={t('scale')}
        min={1}
        max={60}
        step={0.5}
        value={layer.scale}
        onChange={(v) => updateLayer(zoneId, layer.id, { scale: v })}
      />
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <Slider
          label={t('scaleX')}
          min={0.2}
          max={4}
          step={0.05}
          value={layer.scaleX ?? 1}
          onChange={(v) => updateLayer(zoneId, layer.id, { scaleX: v })}
        />
        <Slider
          label={t('scaleY')}
          min={0.2}
          max={4}
          step={0.05}
          value={layer.scaleY ?? 1}
          onChange={(v) => updateLayer(zoneId, layer.id, { scaleY: v })}
        />
      </div>
      <Slider
        label={t('rotation')}
        unit="°"
        min={0}
        max={360}
        step={15}
        value={layer.rotation}
        onChange={(v) => updateLayer(zoneId, layer.id, { rotation: v })}
      />
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <Slider
          label={t('rotationX')}
          unit="°"
          min={-75}
          max={75}
          step={15}
          value={layer.rotationX ?? 0}
          onChange={(v) => updateLayer(zoneId, layer.id, { rotationX: v })}
        />
        <Slider
          label={t('rotationY')}
          unit="°"
          min={-75}
          max={75}
          step={15}
          value={layer.rotationY ?? 0}
          onChange={(v) => updateLayer(zoneId, layer.id, { rotationY: v })}
        />
      </div>
      <Slider
        label={t('intensity')}
        unit="%"
        scale={100}
        min={0}
        max={1}
        step={0.01}
        value={layer.intensity}
        onChange={(v) => updateLayer(zoneId, layer.id, { intensity: v })}
      />
    </div>
  );
}
