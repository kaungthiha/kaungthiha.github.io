import React, { useRef, useState } from 'react';
import { FestivalSet } from '../types/festival';
import { parseCsv } from '../lib/csvParser';

interface CsvUploaderProps {
  onSetsLoaded: (sets: FestivalSet[]) => void;
}

export function CsvUploader({ onSetsLoaded }: CsvUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const sets = parseCsv(text);
        if (sets.length === 0) {
          setError('No valid sets found in CSV. Check column headers: artist, stage, day, start, end');
          return;
        }
        onSetsLoaded(sets);
      } catch (err) {
        setError((err as Error).message);
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="border-2 border-dashed border-festival-border rounded-xl p-6 text-center hover:border-festival-fuchsia transition-colors">
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFile}
      />
      <div className="text-4xl mb-3">📂</div>
      <p className="text-slate-300 mb-2">
        {fileName ? `Loaded: ${fileName}` : 'Drop a CSV lineup file here'}
      </p>
      <button
        onClick={() => inputRef.current?.click()}
        className="px-4 py-2 bg-festival-fuchsia/20 border border-festival-fuchsia text-festival-fuchsia rounded-lg text-sm hover:bg-festival-fuchsia/30 transition-colors"
      >
        Browse CSV
      </button>
      {error && (
        <p className="mt-3 text-red-400 text-sm">{error}</p>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Columns: artist, stage, day, start, end, genre (optional)
      </p>
    </div>
  );
}
