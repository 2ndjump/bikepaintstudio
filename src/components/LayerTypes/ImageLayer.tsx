import { useDesignStore } from '../../state/designStore';
import type { ImageLayer, ZoneId } from '../../state/types';
import { useT } from '../../i18n/useT';
import { Slider } from '../ui/Slider';

interface Props {
  layer: ImageLayer;
  zoneId: ZoneId;
}

export function ImageLayerEditor({ layer, zoneId }: Props) {
  const updateLayer = useDesignStore((s) => s.updateLayer);
  const t = useT();

  return (
    <div className="space-y-2">
      <img
        src={layer.src}
        alt=""
        className="w-full h-16 object-contain rounded-md bg-[var(--md-surface-container-high)] border border-[var(--md-outline-variant)]"
      />
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <Slider
          label="X"
          unit="%"
          scale={100}
          min={-1}
          max={2}
          step={0.01}
          value={layer.x}
          onChange={(v) => updateLayer(zoneId, layer.id, { x: v })}
        />
        <Slider
          label="Y"
          unit="%"
          scale={100}
          min={-1}
          max={2}
          step={0.01}
          value={layer.y}
          onChange={(v) => updateLayer(zoneId, layer.id, { y: v })}
        />
        <Slider
          label={t('scaleX')}
          min={0.05}
          max={3}
          step={0.01}
          value={layer.scaleX}
          onChange={(v) => updateLayer(zoneId, layer.id, { scaleX: v })}
        />
        <Slider
          label={t('scaleY')}
          min={0.05}
          max={3}
          step={0.01}
          value={layer.scaleY}
          onChange={(v) => updateLayer(zoneId, layer.id, { scaleY: v })}
        />
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
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <Slider
          label={t('brightness')}
          min={-1}
          max={1}
          step={0.01}
          value={layer.brightness}
          onChange={(v) => updateLayer(zoneId, layer.id, { brightness: v })}
        />
        <Slider
          label={t('contrast')}
          min={-1}
          max={1}
          step={0.01}
          value={layer.contrast}
          onChange={(v) => updateLayer(zoneId, layer.id, { contrast: v })}
        />
        <Slider
          label={t('saturation')}
          min={-1}
          max={1}
          step={0.01}
          value={layer.saturation}
          onChange={(v) => updateLayer(zoneId, layer.id, { saturation: v })}
        />
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <Slider
          label={t('hueShift')}
          unit="°"
          min={0}
          max={360}
          step={1}
          value={layer.hueShift}
          onChange={(v) => updateLayer(zoneId, layer.id, { hueShift: v })}
        />
        <Slider
          label={t('dodge')}
          min={0}
          max={0.9}
          step={0.01}
          value={layer.dodge}
          onChange={(v) => updateLayer(zoneId, layer.id, { dodge: v })}
        />
        <Slider
          label={t('burn')}
          min={0}
          max={0.9}
          step={0.01}
          value={layer.burn}
          onChange={(v) => updateLayer(zoneId, layer.id, { burn: v })}
        />
      </div>
      <div className="m3-section-title">
        {t('levels')}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <Slider
          label={t('levelsShadows')}
          min={0}
          max={0.95}
          step={0.01}
          value={layer.levelsBlack}
          onChange={(v) =>
            updateLayer(zoneId, layer.id, {
              levelsBlack: Math.min(v, layer.levelsWhite - 0.02),
            })
          }
        />
        <Slider
          label={t('levelsMidtones')}
          min={0.1}
          max={4}
          step={0.01}
          value={layer.levelsGamma}
          onChange={(v) => updateLayer(zoneId, layer.id, { levelsGamma: v })}
        />
        <Slider
          label={t('levelsHighlights')}
          min={0.05}
          max={1}
          step={0.01}
          value={layer.levelsWhite}
          onChange={(v) =>
            updateLayer(zoneId, layer.id, {
              levelsWhite: Math.max(v, layer.levelsBlack + 0.02),
            })
          }
        />
      </div>
    </div>
  );
}
