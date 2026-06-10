import { useDesignStore } from '../../state/designStore';
import type { SolidColorLayer, ZoneId } from '../../state/types';
import { ColorPicker } from '../ui/ColorPicker';

interface Props {
  layer: SolidColorLayer;
  zoneId: ZoneId;
}

export function SolidColorLayerEditor({ layer, zoneId }: Props) {
  const updateLayer = useDesignStore((s) => s.updateLayer);
  return (
    <ColorPicker
      value={layer.color}
      onChange={(color) => updateLayer(zoneId, layer.id, { color })}
    />
  );
}
