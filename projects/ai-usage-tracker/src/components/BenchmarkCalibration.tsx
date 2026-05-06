import { LogEntry } from '../types';
import { classifyBenchmark, computeCalibrationRate, computeAboveBandPct, computeBelowBandPct } from '../lib/storage';
import { BENCHMARK_REFERENCES } from '../data/benchmarkReferences';
import { RESEARCH_SOURCES } from '../data/researchSources';

const POSITION_STYLES = {
  above:   { label: 'Above band', color: 'text-dc-amber', bg: 'bg-dc-amber/10', border: 'border-dc-amber/30' },
  within:  { label: 'In range',   color: 'text-dc-green', bg: 'bg-dc-green/10', border: 'border-dc-green/30' },
  below:   { label: 'Below band', color: 'text-dc-muted', bg: 'bg-dc-surface',  border: 'border-dc-border' },
  unknown: { label: 'No time',    color: 'text-dc-border', bg: 'bg-dc-surface', border: 'border-dc-border' },
};

const CONFIDENCE_STYLES = {
  high:   'text-dc-green border-dc-green/40 bg-dc-green/10',
  medium: 'text-dc-amber border-dc-amber/40 bg-dc-amber/10',
  low:    'text-dc-muted border-dc-border bg-dc-surface',
};

interface BenchmarkCalibrationProps {
  entries: LogEntry[];
}

export function BenchmarkCalibration({ entries }: BenchmarkCalibrationProps) {
  if (entries.length === 0) return null;

  const calibrationRate = computeCalibrationRate(entries);
  const abovePct = computeAboveBandPct(entries);
  const belowPct = computeBelowBandPct(entries);
  const withinPct = 100 - abovePct - belowPct;

  // Per-use-case calibration table
  const useCaseStats: { useCase: string; total: number; above: number; within: number; below: number; noTime: number; median: number; confidence: string }[] = [];
  for (const bench of BENCHMARK_REFERENCES) {
    const ucEntries = entries.filter(e => e.useCase === bench.useCase);
    if (ucEntries.length === 0) continue;
    let above = 0, within = 0, below = 0, noTime = 0;
    for (const e of ucEntries) {
      const c = classifyBenchmark(e);
      if (!c || c.position === 'unknown') noTime++;
      else if (c.position === 'above') above++;
      else if (c.position === 'within') within++;
      else below++;
    }
    useCaseStats.push({
      useCase: bench.useCase,
      total: ucEntries.length,
      above, within, below, noTime,
      median: bench.medianMinutes,
      confidence: bench.confidence,
    });
  }
  useCaseStats.sort((a, b) => b.total - a.total);

  // Annotated entry list (recent 20 with benchmarks)
  const annotatedEntries = entries
    .filter(e => e.timeSavedMinutes > 0)
    .slice(0, 25)
    .map(e => ({ entry: e, classification: classifyBenchmark(e) }))
    .filter(({ classification }) => classification !== null);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-bold text-dc-text">Benchmark Calibration</h2>
        <span className="text-xs text-dc-muted">· How reported savings compare to research baselines</span>
      </div>

      {/* Global calibration stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-dc-card border border-dc-border rounded-xl p-4">
          <div className="text-xs font-semibold text-dc-muted uppercase tracking-wider mb-1">Calibration Rate</div>
          <div className="text-2xl font-black text-dc-blue">{calibrationRate}%</div>
          <div className="text-xs text-dc-muted mt-0.5">logs within research band</div>
        </div>
        <div className="bg-dc-card border border-dc-border rounded-xl p-4">
          <div className="text-xs font-semibold text-dc-muted uppercase tracking-wider mb-1">In Range</div>
          <div className="text-2xl font-black text-dc-green">{withinPct}%</div>
          <div className="text-xs text-dc-muted mt-0.5">matching expectations</div>
        </div>
        <div className="bg-dc-card border border-dc-border rounded-xl p-4">
          <div className="text-xs font-semibold text-dc-muted uppercase tracking-wider mb-1">Above Band</div>
          <div className="text-2xl font-black text-dc-amber">{abovePct}%</div>
          <div className="text-xs text-dc-muted mt-0.5">higher than benchmarks</div>
        </div>
        <div className="bg-dc-card border border-dc-border rounded-xl p-4">
          <div className="text-xs font-semibold text-dc-muted uppercase tracking-wider mb-1">Below Band</div>
          <div className="text-2xl font-black text-dc-muted">{belowPct}%</div>
          <div className="text-xs text-dc-muted mt-0.5">lower than benchmarks</div>
        </div>
      </div>

      {/* Calibration explainer */}
      <div className="bg-dc-surface border border-dc-border rounded-xl px-4 py-3 text-xs text-dc-muted leading-relaxed">
        <span className="text-dc-subtext font-semibold">About these benchmarks: </span>
        These ranges are derived from published research on knowledge worker productivity gains when using AI tools. They represent expected time savings under moderate-complexity conditions. Your team's numbers may differ based on task complexity, tool proficiency, and workflow fit. Treat calibration as a signal, not a verdict.
      </div>

      {/* Per-use-case calibration table */}
      {useCaseStats.length > 0 && (
        <div className="bg-dc-card border border-dc-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-dc-border">
            <h3 className="text-sm font-bold text-dc-text">Use Case Calibration</h3>
            <p className="text-xs text-dc-muted mt-0.5">How reported savings compare to research bands per use case</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dc-border">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-dc-muted uppercase tracking-wider">Use Case</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-dc-muted uppercase tracking-wider">Logs</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-dc-muted uppercase tracking-wider">Benchmark median</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-dc-green uppercase tracking-wider">In range</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-dc-amber uppercase tracking-wider">Above</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-dc-muted uppercase tracking-wider">Below</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-dc-border uppercase tracking-wider">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dc-border/50">
                {useCaseStats.map(row => {
                  const total = row.above + row.within + row.below;
                  const withinPct = total > 0 ? Math.round((row.within / total) * 100) : 0;
                  const abovePct = total > 0 ? Math.round((row.above / total) * 100) : 0;
                  const belowPct = total > 0 ? Math.round((row.below / total) * 100) : 0;
                  const medLabel = row.median >= 60
                    ? `${Math.round(row.median / 60 * 10) / 10}h`
                    : `${row.median}m`;
                  const conf = row.confidence as 'high' | 'medium' | 'low';
                  return (
                    <tr key={row.useCase} className="hover:bg-dc-surface/60 transition-colors">
                      <td className="px-5 py-3 text-dc-text font-medium">{row.useCase}</td>
                      <td className="px-3 py-3 text-right text-dc-subtext">{row.total}</td>
                      <td className="px-3 py-3 text-right text-dc-blue font-semibold">{medLabel}</td>
                      <td className="px-3 py-3 text-right text-dc-green font-semibold">{withinPct}%</td>
                      <td className="px-3 py-3 text-right text-dc-amber font-semibold">{abovePct}%</td>
                      <td className="px-3 py-3 text-right text-dc-muted">{belowPct}%</td>
                      <td className="px-3 py-3 text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CONFIDENCE_STYLES[conf]}`}>
                          {conf}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Annotated log entries */}
      {annotatedEntries.length > 0 && (
        <div className="bg-dc-card border border-dc-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-dc-border">
            <h3 className="text-sm font-bold text-dc-text">Entry-Level Classification</h3>
            <p className="text-xs text-dc-muted mt-0.5">Recent logs with benchmark position tags</p>
          </div>
          <div className="divide-y divide-dc-border/50">
            {annotatedEntries.map(({ entry, classification }) => {
              const pos = classification!.position;
              const style = POSITION_STYLES[pos];
              const gapLabel = pos === 'above'
                ? `+${classification!.gap}m vs median`
                : pos === 'below'
                ? `${classification!.gap}m vs median`
                : `within ${classification!.benchmarkLow}–${classification!.benchmarkHigh}m`;

              return (
                <div key={entry.id} className="px-5 py-3 flex items-center gap-4 hover:bg-dc-surface/40 transition-colors">
                  <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${style.bg} ${style.border} ${style.color}`}>
                    {style.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-dc-text">{entry.tool}</span>
                      <span className="text-xs text-dc-border">·</span>
                      <span className="text-xs text-dc-subtext">{entry.useCase}</span>
                      <span className="text-xs text-dc-border">·</span>
                      <span className="text-xs text-dc-muted">{entry.analystName}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-xs font-semibold text-dc-text">
                      {entry.timeSavedMinutes >= 60
                        ? `${Math.round(entry.timeSavedMinutes / 60 * 10) / 10}h`
                        : `${entry.timeSavedMinutes}m`}
                    </div>
                    <div className="text-xs text-dc-muted mt-0.5">{gapLabel}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Research citations */}
      <div className="bg-dc-card border border-dc-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-dc-border">
          <h3 className="text-sm font-bold text-dc-text">Research Sources</h3>
          <p className="text-xs text-dc-muted mt-0.5">Studies underlying the benchmark reference bands</p>
        </div>
        <div className="divide-y divide-dc-border/50">
          {RESEARCH_SOURCES.map(s => (
            <div key={s.id} className="px-5 py-3 hover:bg-dc-surface/40 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-dc-text leading-snug">{s.title}</div>
                  <div className="text-xs text-dc-muted mt-0.5">{s.publisher} · {s.year}</div>
                  <div className="text-xs text-dc-subtext mt-1 leading-relaxed">{s.relevance}</div>
                </div>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 text-xs text-dc-blue hover:text-dc-blue/70 transition-colors mt-0.5"
                >
                  ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
