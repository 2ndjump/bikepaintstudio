import { useState } from 'react';
import { useUIStore } from '../../state/uiStore';
import { useT } from '../../i18n/useT';
import { ColorPicker } from '../ui/ColorPicker';

/**
 * Manage the session colour palette: the favourites shown as quick-picks inside
 * every ColorPicker. Click the "+" tile to pick a colour and confirm it into the
 * palette; click an existing swatch to remove it.
 */
export function PalettePanel() {
  const palette = useUIStore((s) => s.palette);
  const addPaletteColor = useUIStore((s) => s.addPaletteColor);
  const removePaletteColor = useUIStore((s) => s.removePaletteColor);
  const [draft, setDraft] = useState('#3b82f6');
  const t = useT();

  return (
    <div className="space-y-2">
      <div className="m3-section-title">{t('palette')}</div>

      <div className="flex flex-wrap items-center gap-1.5">
        {palette.length === 0 && (
          <div className="text-xs text-neutral-500">{t('paletteEmpty')}</div>
        )}
        {palette.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => removePaletteColor(c)}
            title={`${c} — ${t('removeColor')}`}
            className="group relative h-7 w-7 rounded-md border border-neutral-600"
            style={{ backgroundColor: c }}
          >
            <span className="absolute inset-0 flex items-center justify-center rounded-md bg-black/45 text-white text-sm leading-none opacity-0 group-hover:opacity-100 transition-opacity">
              ×
            </span>
          </button>
        ))}

        {/* Add: pick a colour in the popover, then confirm it into the palette. */}
        <ColorPicker
          value={draft}
          onChange={setDraft}
          onConfirm={(c) => addPaletteColor(c)}
          confirmLabel={t('addColor')}
          triggerContent="+"
          triggerClassName="h-7 w-7 rounded-md border border-dashed border-neutral-500 text-neutral-300 text-lg leading-none flex items-center justify-center hover:border-neutral-300 hover:text-white transition-colors"
        />
      </div>
    </div>
  );
}
