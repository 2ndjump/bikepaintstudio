import { useDesignStore } from '../../state/designStore';
import type { ImageLayer, ZoneId } from '../../state/types';
import { useT } from '../../i18n/useT';

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
        className="w-full h-16 object-contain bg-neutral-800 rounded"
      />
      <div className="grid grid-cols-2 gap-2">
        <Slider
          label={`X ${(layer.x * 100).toFixed(0)}%`}
          min={-1}
          max={2}
          step={0.01}
          value={layer.x}
          onChange={(v) => updateLayer(zoneId, layer.id, { x: v })}
        />
        <Slider
          label={`Y ${(layer.y * 100).toFixed(0)}%`}
          min={-1}
          max={2}
          step={0.01}
          value={layer.y}
          onChange={(v) => updateLayer(zoneId, layer.id, { y: v })}
        />
        <Slider
          label={`${t('scaleX')} ${layer.scaleX.toFixed(2)}`}
          min={0.05}
          max={3}
          step={0.01}
          value={layer.scaleX}
          onChange={(v) => updateLayer(zoneId, layer.id, { scaleX: v })}
        />
        <Slider
          label={`${t('scaleY')} ${layer.scaleY.toFixed(2)}`}
          min={0.05}
          max={3}
          step={0.01}
          value={layer.scaleY}
          onChange={(v) => updateLayer(zoneId, layer.id, { scaleY: v })}
        />
        <Slider
          label={`${t('rotation')} ${layer.rotation.toFixed(0)}°`}
          min={0}
          max={360}
          step={15}
          value={layer.rotation}
          onChange={(v) => updateLayer(zoneId, layer.id, { rotation: v })}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Slider
          label={`${t('brightness')} ${layer.brightness.toFixed(2)}`}
          min={-1}
          max={1}
          step={0.01}
          value={layer.brightness}
          onChange={(v) => updateLayer(zoneId, layer.id, { brightness: v })}
        />
        <Slider
          label={`${t('contrast')} ${layer.contrast.toFixed(2)}`}
          min={-1}
          max={1}
          step={0.01}
          value={layer.contrast}
          onChange={(v) => updateLayer(zoneId, layer.id, { contrast: v })}
        />
        <Slider
          label={`${t('saturation')} ${layer.saturation.toFixed(2)}`}
          min={-1}
          max={1}
          step={0.01}
          value={layer.saturation}
          onChange={(v) => updateLayer(zoneId, layer.id, { saturation: v })}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Slider
          label={`${t('hueShift')} ${layer.hueShift.toFixed(0)}°`}
          min={0}
          max={360}
          step={1}
          value={layer.hueShift}
          onChange={(v) => updateLayer(zoneId, layer.id, { hueShift: v })}
        />
        <Slider
          label={`${t('dodge')} ${layer.dodge.toFixed(2)}`}
          min={0}
          max={0.9}
          step={0.01}
          value={layer.dodge}
          onChange={(v) => updateLayer(zoneId, layer.id, { dodge: v })}
        />
        <Slider
          label={`${t('burn')} ${layer.burn.toFixed(2)}`}
          min={0}
          max={0.9}
          step={0.01}
          value={layer.burn}
          onChange={(v) => updateLayer(zoneId, layer.id, { burn: v })}
        />
      </div>
      <div className="text-xs uppercase tracking-wider text-neutral-500">
        {t('levels')}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Slider
          label={`${t('levelsShadows')} ${layer.levelsBlack.toFixed(2)}`}
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
          label={`${t('levelsMidtones')} ${layer.levelsGamma.toFixed(2)}`}
          min={0.1}
          max={4}
          step={0.01}
          value={layer.levelsGamma}
          onChange={(v) => updateLayer(zoneId, layer.id, { levelsGamma: v })}
        />
        <Slider
          label={`${t('levelsHighlights')} ${layer.levelsWhite.toFixed(2)}`}
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

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="text-xs text-neutral-400 flex flex-col gap-1">
      {label}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}
