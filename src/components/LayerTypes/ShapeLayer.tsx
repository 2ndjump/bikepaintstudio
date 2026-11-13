import { useDesignStore } from '../../state/designStore';
import type { ShapeKind, ShapeLayer, ZoneId } from '../../state/types';
import { useT } from '../../i18n/useT';
import type { I18nKey } from '../../i18n/strings';
import { ColorPicker } from '../ui/ColorPicker';
import { Slider } from '../ui/Slider';

interface Props {
  layer: ShapeLayer;
  zoneId: ZoneId;
}

const SHAPES: { value: ShapeKind; labelKey: I18nKey }[] = [
  { value: 'rectangle', labelKey: 'shapeRectangle' },
  { value: 'circle', labelKey: 'shapeCircle' },
  { value: 'triangle', labelKey: 'shapeTriangle' },
  { value: 'diamond', labelKey: 'shapeDiamond' },
  { value: 'pentagon', labelKey: 'shapePentagon' },
  { value: 'hexagon', labelKey: 'shapeHexagon' },
  { value: 'star', labelKey: 'shapeStar' },
  { value: 'heart', labelKey: 'shapeHeart' },
  { value: 'ring', labelKey: 'shapeRing' },
  { value: 'cross', labelKey: 'shapeCross' },
  { value: 'arrow', labelKey: 'shapeArrow' },
  { value: 'lightning', labelKey: 'shapeLightning' },
  { value: 'chevron', labelKey: 'shapeChevron' },
];

/** Dropdown of all shape outlines (shared with the global shapes in DividerPanel). */
export function ShapeKindSelect({
  value,
  onChange,
}: {
  value: ShapeKind;
  onChange: (shape: ShapeKind) => void;
}) {
  const t = useT();
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as ShapeKind)} className="m3-field">
      {SHAPES.map((s) => (
        <option key={s.value} value={s.value}>
          {t(s.labelKey)}
        </option>
      ))}
    </select>
  );
}

export function ShapeLayerEditor({ layer, zoneId }: Props) {
  const updateLayer = useDesignStore((s) => s.updateLayer);
  const t = useT();

  function changeShape(shape: ShapeKind) {
    // Keep the layer name in sync with the shape unless the user renamed it.
    const defaultLabels = SHAPES.map((s) => t(s.labelKey));
    const patch: Partial<ShapeLayer> = { shape };
    if (defaultLabels.includes(layer.name)) {
      patch.name = t(SHAPES.find((s) => s.value === shape)!.labelKey);
    }
    updateLayer(zoneId, layer.id, patch);
  }

  return (
    <div className="space-y-2">
      <ShapeKindSelect value={layer.shape} onChange={changeShape} />

      <ColorPicker
        value={layer.color}
        label={t('color')}
        onChange={(color) => updateLayer(zoneId, layer.id, { color })}
      />

      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <Slider
          label={t('width')}
          unit="%"
          scale={100}
          min={0.02}
          max={1}
          step={0.01}
          value={layer.width}
          onChange={(v) => updateLayer(zoneId, layer.id, { width: v })}
        />
        <Slider
          label={t('height')}
          unit="%"
          scale={100}
          min={0.02}
          max={1}
          step={0.01}
          value={layer.height}
          onChange={(v) => updateLayer(zoneId, layer.id, { height: v })}
        />
        <Slider
          label="X"
          unit="%"
          scale={100}
          min={0}
          max={1}
          step={0.01}
          value={layer.x}
          onChange={(v) => updateLayer(zoneId, layer.id, { x: v })}
        />
        <Slider
          label="Y"
          unit="%"
          scale={100}
          min={0}
          max={1}
          step={0.01}
          value={layer.y}
          onChange={(v) => updateLayer(zoneId, layer.id, { y: v })}
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
    </div>
  );
}
