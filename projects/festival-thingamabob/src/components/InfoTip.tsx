import { useState, useRef, useEffect } from 'react';

interface InfoTipProps {
  text: string;
}

export function InfoTip({ text }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex items-center">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="w-3.5 h-3.5 rounded-full border border-slate-700 hover:border-slate-500 text-slate-600 hover:text-slate-400 transition-colors flex items-center justify-center"
        style={{ fontSize: '9px', lineHeight: 1 }}
        aria-label="More info"
      >
        i
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 leading-relaxed z-50 shadow-xl">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-700" />
        </div>
      )}
    </div>
  );
}
