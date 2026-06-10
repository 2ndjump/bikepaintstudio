import { useEffect, useRef, useState } from 'react';
import { ensureFontLoaded, type FontEntry } from '../../fonts/fontLoader';

interface Props {
  value: string;
  options: FontEntry[];
  onChange: (family: string) => void;
}

const SOURCE_BADGE: Record<FontEntry['source'], string> = {
  google: 'G',
  system: 'S',
  upload: 'U',
};

function FontRow({
  entry,
  selected,
  onClick,
}: {
  entry: FontEntry;
  selected: boolean;
  onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !loaded) {
          ensureFontLoaded(entry.family).then(() => setLoaded(true));
        }
      },
      { threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [entry.family, loaded]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-neutral-700 transition ${
        selected ? 'bg-neutral-700 text-white' : 'text-neutral-200'
      }`}
    >
      <span className="text-[9px] text-neutral-500 w-3 shrink-0">{SOURCE_BADGE[entry.source]}</span>
      <span
        style={{ fontFamily: loaded ? `'${entry.family}', sans-serif` : undefined }}
        className="text-sm truncate"
      >
        {entry.family}
      </span>
    </button>
  );
}

export function FontPicker({ value, options, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? options.filter((f) => f.family.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    if (!open) { setQuery(''); return; }
    setTimeout(() => searchRef.current?.focus(), 0);
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 rounded px-2 py-1.5 border border-neutral-700 text-sm"
        style={{ fontFamily: `'${value}', sans-serif` }}
      >
        <span className="truncate">{value}</span>
        <span className="text-neutral-500 text-xs font-sans shrink-0">▾</span>
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded border border-neutral-700 bg-neutral-800 shadow-2xl overflow-hidden">
          <div className="p-1.5 border-b border-neutral-700">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search fonts…"
              className="w-full bg-neutral-900 text-neutral-100 text-xs rounded px-2 py-1 outline-none border border-neutral-700 placeholder:text-neutral-500"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs text-neutral-500">No fonts found</div>
            )}
            {filtered.map((f) => (
              <FontRow
                key={`${f.source}:${f.family}`}
                entry={f}
                selected={f.family === value}
                onClick={() => {
                  onChange(f.family);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
