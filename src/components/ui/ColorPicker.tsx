import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
const POPOVER_EST_HEIGHT = 300; // for deciding to flip above the trigger

export function ColorPicker({ value, onChange, label, swatchOnly, swatchClassName }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    }
    // The popover is fixed-positioned, so dismiss it if the page/sidebar
    // scrolls or the window resizes (it would otherwise drift off the trigger).
    function dismiss() {
      setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismiss, true);
    };
  }, [open]);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    const el = triggerRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      const m = 8;
      let left = r.left;
      if (left + POPOVER_WIDTH > window.innerWidth - m) {
        left = Math.max(m, window.innerWidth - POPOVER_WIDTH - m);
      }
      let top = r.bottom + 4;
      if (top + POPOVER_EST_HEIGHT > window.innerHeight - m) {
        top = Math.max(m, r.top - POPOVER_EST_HEIGHT - 4);
      }
      setPos({ top, left });
    }
    setOpen(true);
  }

  function commit(color: string) {
    onChange(color);
    addRecent(color);
  }

  return (
    <div className="relative">
      {label && <div className="text-xs text-neutral-400 mb-1">{label}</div>}
      {swatchOnly ? (
        <button
          ref={triggerRef}
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
          ref={triggerRef}
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

      {open &&
        createPortal(
          <div
            ref={popRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: POPOVER_WIDTH, zIndex: 60 }}
            className="rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl p-3 flex flex-col gap-2.5"
          >
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
          </div>,
          document.body,
        )}
    </div>
  );
}
