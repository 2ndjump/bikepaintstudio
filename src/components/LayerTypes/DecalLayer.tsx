import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useDesignStore } from '../../state/designStore';
import type { DecalLayer, ZoneId } from '../../state/types';
import {
  ensureFontLoaded,
  getAllFontOptions,
  subscribeFonts,
  systemFontsAvailable,
  requestSystemFonts,
  uploadFontFile,
  type FontEntry,
} from '../../fonts/fontLoader';
import { useT } from '../../i18n/useT';
import type { I18nKey } from '../../i18n/strings';
import { ColorPicker } from '../ui/ColorPicker';
import { FontPicker } from '../ui/FontPicker';
import { Slider } from '../ui/Slider';

interface Props {
  layer: DecalLayer;
  zoneId: ZoneId;
}

type StyleKey = 'bold' | 'italic' | 'underline' | 'strikethrough';
const STYLE_TOGGLES: { key: StyleKey; label: string; tip: I18nKey; cls: string }[] = [
  { key: 'bold', label: 'B', tip: 'textBold', cls: 'font-bold' },
  { key: 'italic', label: 'I', tip: 'textItalic', cls: 'italic' },
  { key: 'underline', label: 'U', tip: 'textUnderline', cls: 'underline' },
  { key: 'strikethrough', label: 'S', tip: 'textStrikethrough', cls: 'line-through' },
];

function useFontOptions(): FontEntry[] {
  return useSyncExternalStore(subscribeFonts, getAllFontOptions, getAllFontOptions);
}


export function DecalLayerEditor({ layer, zoneId }: Props) {
  const updateLayer = useDesignStore((s) => s.updateLayer);
  const t = useT();
  const fontOptions = useFontOptions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ensureFontLoaded(layer.font);
  }, [layer.font]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const family = await uploadFontFile(file);
    if (family) updateLayer(zoneId, layer.id, { font: family });
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={layer.text}
        onChange={(e) => {
          const text = e.target.value;
          // The layer is named after its text, unless the user renamed it.
          const named = layer.name === layer.text || layer.name === 'Text';
          updateLayer(zoneId, layer.id, named ? { text, name: text || 'Text' } : { text });
        }}
        placeholder={t('text')}
        className="m3-field text-sm"
      />
      <div className="flex gap-1">
        {STYLE_TOGGLES.map(({ key, label, tip, cls }) => {
          const on = !!layer[key];
          return (
            <button
              key={key}
              type="button"
              title={t(tip)}
              aria-pressed={on}
              onClick={() =>
                updateLayer(zoneId, layer.id, { [key]: !on } as Partial<DecalLayer>)
              }
              className={`flex-1 rounded-md border py-1 text-sm ${cls} ${
                on
                  ? 'border-[var(--md-primary)] text-[var(--md-primary)] bg-[var(--md-primary-container)]'
                  : 'border-[var(--md-outline-variant)] text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <FontPicker
        value={layer.font}
        options={fontOptions}
        onChange={(font) => updateLayer(zoneId, layer.id, { font })}
      />

      <div className="flex gap-1">
        {systemFontsAvailable() && (
          <button
            type="button"
            onClick={() => requestSystemFonts()}
            className="m3-btn m3-btn-tonal m3-btn-sm flex-1"
          >
            {t('requestSystemFonts')}
          </button>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="m3-btn m3-btn-tonal m3-btn-sm flex-1"
        >
          {t('uploadFont')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          className="hidden"
          onChange={handleUpload}
      />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ColorPicker
          value={layer.color}
          label={t('color')}
          onChange={(color) => updateLayer(zoneId, layer.id, { color })}
      />
        <ColorPicker
          value={layer.outlineColor}
          label={t('outline')}
          onChange={(outlineColor) => updateLayer(zoneId, layer.id, { outlineColor })}
      />
      </div>

      <Slider
        label={t('size')}
        unit="px"
        min={8}
        max={256}
        step={1}
        value={layer.size}
        onChange={(v) => updateLayer(zoneId, layer.id, { size: v })}
      />
      <Slider
        label={t('outlineWidth')}
        unit="px"
        min={0}
        max={10}
        step={0.5}
        value={layer.outlineWidth}
        onChange={(v) => updateLayer(zoneId, layer.id, { outlineWidth: v })}
      />
      <Slider
        label={t('letterSpacing')}
        unit="px"
        min={-20}
        max={100}
        step={1}
        value={layer.letterSpacing}
        onChange={(v) => updateLayer(zoneId, layer.id, { letterSpacing: v })}
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
      </div>
      <Slider
        label={t('rotation')}
        unit="°"
        min={-180}
        max={180}
        step={15}
        value={layer.rotation}
        onChange={(v) => updateLayer(zoneId, layer.id, { rotation: v })}
      />
      <Slider
        label={t('letterRotation')}
        unit="°"
        min={-180}
        max={180}
        step={15}
        value={layer.glyphRotation}
        onChange={(v) => updateLayer(zoneId, layer.id, { glyphRotation: v })}
      />
    </div>
  );
}
