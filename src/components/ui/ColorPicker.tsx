import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { useUIStore } from '../../state/uiStore';
import { useT } from '../../i18n/useT';

interface Props {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  /** Render the trigger as a bare colour swatch (no hex text / field box). */
  swatchOnly?: boolean;
  /** Extra classes for the swatch trigger (e.g. size) when swatchOnly. */
  swatchClassName?: string;
  /** Render the trigger as a plain button with this content (e.g. a "+") instead
   *  of a colour swatch — used for the palette "add colour" flow. */
  triggerContent?: ReactNode;
  triggerClassName?: string;
  /** When set, the popover shows a confirm button; clicking it calls onConfirm
   *  with the current value and closes. Turns the picker into a pick-then-confirm
   *  flow (and hides the session-palette shortcut). */
  onConfirm?: (color: string) => void;
  confirmLabel?: string;
}

const POPOVER_WIDTH = 208; // matches w-52
const POPOVER_MAX_HEIGHT = 260; // hue picker + hex field + recent swatches

export function ColorPicker({
  value,
  onChange,
  label,
  swatchOnly,
  swatchClassName,
  triggerContent,
  triggerClassName,
  onConfirm,
  confirmLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const palette = useUIStore((s) => s.palette);
  const t = useT();

  // The popover is portalled to <body> with position:fixed so it escapes the
  // sidebar's overflow clipping. Position it from the trigger rect, flipping to
  // the left / above when it would run past the viewport edge.
  function place() {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let left = rect.left;
    if (left + POPOVER_WIDTH > window.innerWidth - 8) left = rect.right - POPOVER_WIDTH;
    left = Math.max(8, left);
    let top = rect.bottom + 4;
    if (top + POPOVER_MAX_HEIGHT > window.innerHeight - 8) {
      top = Math.max(8, rect.top - POPOVER_MAX_HEIGHT - 4);
    }
    setCoords({ top, left });
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    }
    // A scroll of any ancestor would detach a fixed popover from its trigger —
    // just close it instead of chasing the position.
    function onScrollOrResize() {
      setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open]);

  function toggle() {
    if (!open) place();
    setOpen((v) => !v);
  }

  function commit(color: string) {
    onChange(color);
  }

  return (
    <div ref={triggerRef} className="relative">
      {label && <div className="text-xs text-neutral-400 mb-1">{label}</div>}
      {triggerContent !== undefined ? (
        <button type="button" onClick={toggle} aria-label="Pick colour" className={triggerClassName}>
          {triggerContent}
        </button>
      ) : swatchOnly ? (
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

      {open &&
        createPortal(
          <div
            ref={popRef}
            className="fixed z-50 rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl p-3 flex flex-col gap-2.5 w-52"
            style={{ top: coords.top, left: coords.left }}
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

            {/* Session palette — favourite colours managed in the Palette panel.
                Hidden in the palette's own add flow (onConfirm). */}
            {!onConfirm && palette.length > 0 && (
              <div>
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">
                  {t('palette')}
                </div>
                <div className="flex flex-wrap gap-1">
                  {palette.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        commit(c);
                        setOpen(false);
                      }}
                      title={c}
                      className="h-5 w-5 rounded-md border border-neutral-600 hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Confirm button (pick-then-confirm flow). */}
            {onConfirm && (
              <button
                type="button"
                onClick={() => {
                  onConfirm(value);
                  setOpen(false);
                }}
                className="w-full py-1.5 text-xs rounded-lg border border-neutral-600 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 transition"
              >
                {confirmLabel ?? '✓'}
              </button>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
