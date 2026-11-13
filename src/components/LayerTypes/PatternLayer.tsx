import { useDesignStore } from '../../state/designStore';
import type { PatternKind, PatternLayer, ZoneId } from '../../state/types';
import { useT } from '../../i18n/useT';
import type { I18nKey } from '../../i18n/strings';
import { ColorPicker } from '../ui/ColorPicker';
import { Slider } from '../ui/Slider';

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
  { value: 'topo', labelKey: 'patternTopo' },
  { value: 'marble', labelKey: 'patternMarble' },
  { value: 'voronoi', labelKey: 'patternVoronoi' },
  { value: 'camo', labelKey: 'patternCamo' },
  { value: 'digicamo', labelKey: 'patternDigiCamo' },
  { value: 'circuit', labelKey: 'patternCircuit' },
  { value: 'mesh', labelKey: 'patternMesh' },
  { value: 'forged', labelKey: 'patternForged' },
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
