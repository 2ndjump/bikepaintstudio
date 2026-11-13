import { useState } from 'react';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  /** Display multiplier (e.g. 100 to show a 0..1 value as percent). */
  scale?: number;
  unit?: string;
}

/**
 * Labelled range slider with an editable number field: drag for speed, type
 * for precision (any value inside [min, max], finer than the slider step).
 */
export function Slider({ label, value, min, max, step, onChange, scale = 1, unit }: Props) {
  // While typing, keep the raw text so partial input ("-", "1.") isn't clobbered.
  const [draft, setDraft] = useState<string | null>(null);
  const decimals = Math.max(0, Math.min(3, Math.ceil(-Math.log10(step * scale) - 1e-9)));
  const shown = (value * scale).toFixed(decimals);

  function commitText(text: string) {
    const n = parseFloat(text.replace(',', '.'));
    if (!isFinite(n)) return;
    onChange(Math.min(max, Math.max(min, n / scale)));
  }

  return (
    <label className="m3-label flex flex-col gap-0.5">
      <span className="flex items-center justify-between gap-2">
        <span className="truncate">{label}</span>
        <span className="m3-num">
          <input
            type="text"
            inputMode="decimal"
            value={draft ?? shown}
            onFocus={(e) => {
              setDraft(shown);
              e.target.select();
            }}
            onChange={(e) => {
              setDraft(e.target.value);
              commitText(e.target.value);
            }}
            onBlur={() => setDraft(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            aria-label={label}
          />
          {unit && <span>{unit}</span>}
        </span>
      </span>
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
