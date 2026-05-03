import { FestivalSet } from '../types/festival';
import { parseEDCTime } from './sampleData';

/**
 * Parse a CSV file containing festival set data.
 * Expected columns (case-insensitive):
 *   artist, stage, day, start, end, genre, notes
 */
export function parseCsv(text: string): FestivalSet[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  const colIndex = (name: string): number => header.indexOf(name);

  const artistIdx = colIndex('artist');
  const stageIdx = colIndex('stage');
  const dayIdx = colIndex('day');
  const startIdx = colIndex('start');
  const endIdx = colIndex('end');
  const genreIdx = colIndex('genre');
  const notesIdx = colIndex('notes');

  if (artistIdx === -1 || stageIdx === -1 || dayIdx === -1 || startIdx === -1 || endIdx === -1) {
    throw new Error('CSV must have columns: artist, stage, day, start, end');
  }

  const sets: FestivalSet[] = [];
  let counter = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const artist = cols[artistIdx]?.replace(/['"]/g, '').trim();
    const stage = cols[stageIdx]?.replace(/['"]/g, '').trim();
    const day = cols[dayIdx]?.replace(/['"]/g, '').trim();
    const startStr = cols[startIdx]?.replace(/['"]/g, '').trim();
    const endStr = cols[endIdx]?.replace(/['"]/g, '').trim();
    const genre = genreIdx !== -1 ? cols[genreIdx]?.replace(/['"]/g, '').trim() : undefined;
    const notes = notesIdx !== -1 ? cols[notesIdx]?.replace(/['"]/g, '').trim() : undefined;

    if (!artist || !stage || !day || !startStr || !endStr) continue;

    try {
      sets.push({
        id: `csv-${++counter}`,
        artist,
        stage,
        day,
        startTime: parseEDCTime(day, startStr),
        endTime: parseEDCTime(day, endStr),
        genre: genre || undefined,
        notes: notes || undefined,
      });
    } catch {
      console.warn(`Skipping row ${i}: could not parse times`);
    }
  }

  return sets;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
