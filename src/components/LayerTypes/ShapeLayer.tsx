import { useDesignStore } from '../../state/designStore';
import type { ShapeKind, ShapeLayer, ZoneId } from '../../state/types';
import { useT } from '../../i18n/useT';
import type { I18nKey } from '../../i18n/strings';
import { ColorPicker } from '../ui/ColorPicker';

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
      <select
        value={layer.shape}
        onChange={(e) => changeShape(e.target.value as ShapeKind)}
        className="m3-field"
      >
        {SHAPES.map((s) => (
          <option key={s.value} value={s.value}>
            {t(s.labelKey)}
          </option>
        ))}
      </select>

      <ColorPicker
        value={layer.color}
        label={t('color')}
        onChange={(color) => updateLayer(zoneId, layer.id, { color })}
      />

      <div className="grid grid-cols-2 gap-2">
        <label className="m3-label flex flex-col gap-1">
          {t('width')} {(layer.width * 100).toFixed(0)}%
          <input
            type="range"
            min={0.02}
            max={1}
            step={0.01}
            value={layer.width}
            onChange={(e) => updateLayer(zoneId, layer.id, { width: parseFloat(e.target.value) })}
          />
        </label>
        <label className="m3-label flex flex-col gap-1">
          {t('height')} {(layer.height * 100).toFixed(0)}%
          <input
            type="range"
            min={0.02}
            max={1}
            step={0.01}
            value={layer.height}
            onChange={(e) => updateLayer(zoneId, layer.id, { height: parseFloat(e.target.value) })}
          />
        </label>
      </div>

      <label className="m3-label flex flex-col gap-1">
        X {(layer.x * 100).toFixed(0)}%
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={layer.x}
          onChange={(e) => updateLayer(zoneId, layer.id, { x: parseFloat(e.target.value) })}
        />
      </label>
      <label className="m3-label flex flex-col gap-1">
        Y {(layer.y * 100).toFixed(0)}%
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={layer.y}
          onChange={(e) => updateLayer(zoneId, layer.id, { y: parseFloat(e.target.value) })}
        />
      </label>
      <label className="m3-label flex flex-col gap-1">
        {t('rotationShort')} {layer.rotation.toFixed(0)}°
        <input
          type="range"
          min={0}
          max={360}
          step={15}
          value={layer.rotation}
          onChange={(e) => updateLayer(zoneId, layer.id, { rotation: parseFloat(e.target.value) })}
        />
      </label>
    </div>
  );
}
