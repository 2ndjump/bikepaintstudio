import { useEffect, useRef, useState } from 'react';
import { HexColorPicker, HexColorInput } from 'react-colorful';

const MAX_RECENT = 10;
let recentColors: string[] = [];

function addRecent(color: string) {
  const c = color.toLowerCase();
  recentColors = [c, ...recentColors.filter((x) => x !== c)].slice(0, MAX_RECENT);
}

interface Props {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  /** Render the trigger as a bare colour swatch (no hex text / field box). */
  swatchOnly?: boolean;
  /** Extra classes for the swatch trigger (e.g. size) when swatchOnly. */
  swatchClassName?: string;
}

const POPOVER_WIDTH = 208; // matches w-52

export function ColorPicker({ value, onChange, label, swatchOnly, swatchClassName }: Props) {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function toggle() {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setAlignRight(rect.left + POPOVER_WIDTH > window.innerWidth - 8);
    }
    setOpen((v) => !v);
  }

  function commit(color: string) {
    onChange(color);
    addRecent(color);
  }

  return (
    <div ref={ref} className="relative">
      {label && (
        <div className="text-xs text-neutral-400 mb-1">{label}</div>
      )}
      {swatchOnly ? (
        <button
          type="button"
          onClick={toggle}
          aria-label="Pick colour"
          className={`rounded-md border border-neutral-600 shadow-inner shrink-0 ${
            swatchClassName ?? 'h-6 w-6'
          }`}
          style={{ backgroundColor: value }}
        />
      ) : (
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-2 w-full rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-750 px-2 py-1.5 transition"
        >
          <span
            className="inline-block h-4 w-6 rounded shadow-inner border border-neutral-600 flex-shrink-0"
            style={{ backgroundColor: value }}
          />
          <span className="text-xs font-mono text-neutral-300 uppercase">{value}</span>
        </button>
      )}

      {open && (
        <div className={`absolute z-50 mt-1 ${alignRight ? 'right-0' : 'left-0'} rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl p-3 flex flex-col gap-2.5 w-52`}>
          {/* Hue/saturation picker */}
          <HexColorPicker color={value} onChange={commit} style={{ width: '100%', height: '140px' }} />

          {/* Hex input */}
          <div className="flex items-center gap-1.5 bg-neutral-800 rounded-lg border border-neutral-700 px-2 py-1">
            <span className="text-neutral-500 text-xs font-mono">#</span>
            <HexColorInput
              color={value}
              onChange={commit}
              prefixed={false}
              className="bg-transparent text-neutral-100 text-xs font-mono w-full outline-none uppercase tracking-wider"
            />
          </div>

          {/* Recent colors */}
          {recentColors.length > 0 && (
            <div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Recent</div>
              <div className="flex flex-wrap gap-1">
                {recentColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => commit(c)}
                    title={c}
                    className="h-5 w-5 rounded-md border border-neutral-600 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
