import { LogEntry, AggStats, VerificationLevel, WorkflowStage, AIOutputType } from '../types';

const STORAGE_KEY = 'dc_ai_usage_logs';

export function loadEntries(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LogEntry[];
  } catch {
    return [];
  }
}

export function saveEntries(entries: LogEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch { /* ignore */ }
}

export function addEntry(entries: LogEntry[], entry: LogEntry): LogEntry[] {
  const next = [entry, ...entries];
  saveEntries(next);
  return next;
}

export function deleteEntry(entries: LogEntry[], id: string): LogEntry[] {
  const next = entries.filter(e => e.id !== id);
  saveEntries(next);
  return next;
}

export function exportCSV(entries: LogEntry[]): void {
  const headers = [
    'Date', 'Analyst', 'Tool', 'Use Case', 'Workflow Stage', 'Output Type',
    'Time Saved (min)', 'Value Rating', 'Verification',
    'Would Use Again', 'Would Standardize', 'Notes',
  ];
  const rows = entries.map(e => [
    new Date(e.timestamp).toLocaleDateString(),
    e.analystName,
    e.tool,
    e.useCase,
    e.workflowStage,
    e.outputType,
    String(e.timeSavedMinutes),
    String(e.valueRating),
    e.verificationLevel,
    e.wouldUseAgain ? 'Yes' : 'No',
    e.wouldStandardize ? 'Yes' : 'No',
    (e.notes ?? '').replace(/,/g, ';'),
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ai-usage-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importCSV(file: File): Promise<LogEntry[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = e.target?.result as string;
        const lines = text.trim().split('\n').slice(1);
        const entries: LogEntry[] = lines.map((line, i) => {
          const cols = line.split(',');
          const [date, analyst, tool, useCase, workflowStage, outputType, timeSaved, valueRating, verification, useAgain, standardize, ...notesParts] = cols;
          return {
            id: `imported-${Date.now()}-${i}`,
            timestamp: new Date(date).toISOString(),
            analystName: analyst?.trim() || 'Unknown',
            tool: tool.trim() as LogEntry['tool'],
            useCase: useCase.trim() as LogEntry['useCase'],
            workflowStage: (workflowStage?.trim() ?? 'Other') as WorkflowStage,
            outputType: (outputType?.trim() ?? 'Other') as AIOutputType,
            timeSavedMinutes: parseInt(timeSaved) || 0,
            valueRating: (parseInt(valueRating) || 3) as LogEntry['valueRating'],
            verificationLevel: (verification?.trim() ?? 'light') as VerificationLevel,
            wouldUseAgain: useAgain?.trim() === 'Yes',
            wouldStandardize: standardize?.trim() === 'Yes',
            notes: notesParts.join(',').trim() || undefined,
          };
        });
        resolve(entries);
      } catch {
        reject(new Error('Failed to parse CSV'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function computeStats(entries: LogEntry[]): AggStats {
  if (entries.length === 0) {
    return {
      totalEntries: 0,
      totalTimeSavedHours: 0,
      avgValueRating: 0,
      byTool: {},
      byUseCase: {},
      byStage: {},
      byOutputType: {},
      byAnalyst: {},
      byVerification: { none: 0, light: 0, heavy: 0 },
      standardizeCount: 0,
      wouldUseAgainPct: 0,
      recentWeekEntries: 0,
    };
  }

  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const byTool: Record<string, number> = {};
  const byUseCase: Record<string, { count: number; timeSaved: number; avgValue: number; _sum: number }> = {};
  const byStage: Record<string, number> = {};
  const byOutputType: Record<string, number> = {};
  const byAnalyst: Record<string, number> = {};
  const byVerification: Record<VerificationLevel, number> = { none: 0, light: 0, heavy: 0 };
  let totalTimeSaved = 0;
  let totalValue = 0;
  let standardizeCount = 0;
  let wouldUseAgainCount = 0;
  let recentWeekEntries = 0;

  for (const e of entries) {
    byTool[e.tool] = (byTool[e.tool] ?? 0) + 1;
    byStage[e.workflowStage] = (byStage[e.workflowStage] ?? 0) + 1;
    byOutputType[e.outputType] = (byOutputType[e.outputType] ?? 0) + 1;
    byAnalyst[e.analystName] = (byAnalyst[e.analystName] ?? 0) + 1;

    if (!byUseCase[e.useCase]) byUseCase[e.useCase] = { count: 0, timeSaved: 0, avgValue: 0, _sum: 0 };
    byUseCase[e.useCase].count++;
    byUseCase[e.useCase].timeSaved += e.timeSavedMinutes;
    byUseCase[e.useCase]._sum += e.valueRating;

    byVerification[e.verificationLevel]++;
    totalTimeSaved += e.timeSavedMinutes;
    totalValue += e.valueRating;
    if (e.wouldStandardize) standardizeCount++;
    if (e.wouldUseAgain) wouldUseAgainCount++;
    if (new Date(e.timestamp).getTime() > oneWeekAgo) recentWeekEntries++;
  }

  for (const uc of Object.values(byUseCase)) {
    uc.avgValue = uc._sum / uc.count;
  }

  return {
    totalEntries: entries.length,
    totalTimeSavedHours: Math.round((totalTimeSaved / 60) * 10) / 10,
    avgValueRating: Math.round((totalValue / entries.length) * 10) / 10,
    byTool,
    byUseCase,
    byStage,
    byOutputType,
    byAnalyst,
    byVerification,
    standardizeCount,
    wouldUseAgainPct: Math.round((wouldUseAgainCount / entries.length) * 100),
    recentWeekEntries,
  };
}

const WORKFLOW_STAGES: WorkflowStage[] = ['Build', 'Validate', 'Communicate', 'Explore', 'Other'];
const OUTPUT_TYPES: AIOutputType[] = [
  'Code / query', 'Explanation / breakdown', 'Draft text',
  'Edited / improved my text', 'Data interpretation',
  'Structured outline', 'Troubleshooting steps', 'Other',
];

export function generateSeedData(): LogEntry[] {
  const analysts = ['Alex R.', 'Priya M.', 'Jordan K.', 'Sam T.', 'Dana L.'];
  const tools: LogEntry['tool'][] = ['Gemini', 'ChatGPT', 'Gemini', 'Gemini', 'Claude', 'Copilot'];
  const useCases: LogEntry['useCase'][] = [
    'SQL / query writing',
    'Data cleaning / transformation',
    'Report writing / summarization',
    'Ad-hoc analysis',
    'Dashboard / viz support',
    'Documentation',
    'Code review / debugging',
    'Exploratory research',
  ];
  const timeSavedOptions = [15, 30, 30, 60, 60, 90, 120];
  const verificationLevels: VerificationLevel[] = ['none', 'light', 'light', 'heavy'];

  const entries: LogEntry[] = [];
  const now = Date.now();

  for (let i = 0; i < 28; i++) {
    const daysAgo = Math.floor(Math.random() * 21);
    const tool = tools[Math.floor(Math.random() * tools.length)];
    const useCase = useCases[Math.floor(Math.random() * useCases.length)];
    const timeSaved = timeSavedOptions[Math.floor(Math.random() * timeSavedOptions.length)];
    const verification = verificationLevels[Math.floor(Math.random() * verificationLevels.length)];
    const value = (Math.floor(Math.random() * 4) + 2) as LogEntry['valueRating'];
    const workflowStage = WORKFLOW_STAGES[Math.floor(Math.random() * (WORKFLOW_STAGES.length - 1))];
    const outputType = OUTPUT_TYPES[Math.floor(Math.random() * (OUTPUT_TYPES.length - 1))];

    const analystName = analysts[Math.floor(Math.random() * analysts.length)];
    entries.push({
      id: `seed-${i}`,
      timestamp: new Date(now - daysAgo * 24 * 60 * 60 * 1000 - Math.random() * 8 * 3600000).toISOString(),
      analystName,
      tool,
      useCase,
      workflowStage,
      outputType,
      timeSavedMinutes: timeSaved,
      valueRating: value,
      verificationLevel: verification,
      wouldUseAgain: value >= 3,
      wouldStandardize: value >= 4 && verification !== 'heavy',
      notes: undefined,
    });
  }

  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
