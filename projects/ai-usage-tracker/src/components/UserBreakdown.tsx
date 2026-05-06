import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { UserSummary } from '../types';

const ANALYST_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#a78bfa', '#22d3ee',
  '#ec4899', '#f97316', '#84cc16', '#e879f9', '#6366f1',
];

function colorFor(i: number) {
  return ANALYST_COLORS[i % ANALYST_COLORS.length];
}

const STAGE_ORDER = ['Build', 'Validate', 'Communicate', 'Explore', 'Other'];
const TOOL_ORDER = ['Gemini', 'ChatGPT', 'Claude', 'Claude Code', 'Copilot', 'Other'];

const STAGE_COLORS: Record<string, string> = {
  Build:       '#6366f1',
  Validate:    '#f59e0b',
  Communicate: '#10b981',
  Explore:     '#22d3ee',
  Other:       '#64748b',
};

const TOOL_COLORS: Record<string, string> = {
  Gemini:       '#3b82f6',
  ChatGPT:      '#10b981',
  Claude:       '#f59e0b',
  'Claude Code':'#a78bfa',
  Copilot:      '#22d3ee',
  Other:        '#64748b',
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: UserSummary & { color: string } }[] }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-dc-surface border border-dc-border rounded-xl px-3 py-2 text-xs shadow-xl max-w-[200px]">
      <div className="font-bold text-dc-text mb-1">{d.analystName}</div>
      <div className="text-dc-subtext">{d.totalEntries} logs · {d.totalTimeSavedHours}h saved</div>
      <div className="text-dc-subtext">Avg value: {d.avgValueRating}/5</div>
      <div className="text-dc-subtext">Would repeat: {d.wouldUseAgainPct}%</div>
    </div>
  );
};

interface HeatmapProps {
  summaries: UserSummary[];
  dimension: 'byStage' | 'byTool';
}

function UsageHeatmap({ summaries, dimension }: HeatmapProps) {
  const keys = dimension === 'byStage' ? STAGE_ORDER : TOOL_ORDER;
  const colors = dimension === 'byStage' ? STAGE_COLORS : TOOL_COLORS;
  const analysts = summaries.map(s => s.analystName);

  // Normalize: each cell = (user's count for that key) / (user's total) * 100
  const cells: { analyst: string; key: string; pct: number }[] = [];
  for (const s of summaries) {
    const data = s[dimension];
    for (const k of keys) {
      const count = data[k] ?? 0;
      const pct = s.totalEntries > 0 ? Math.round((count / s.totalEntries) * 100) : 0;
      cells.push({ analyst: s.analystName, key: k, pct });
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="text-left px-3 py-2 text-dc-muted font-semibold uppercase tracking-wider w-28">Analyst</th>
            {keys.map(k => (
              <th key={k} className="text-center px-2 py-2 text-dc-muted font-semibold uppercase tracking-wider min-w-[70px]"
                style={{ color: colors[k] ?? '#64748b' }}>
                {k.length > 10 ? k.slice(0, 9) + '…' : k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-dc-border/30">
          {analysts.map(analyst => (
            <tr key={analyst} className="hover:bg-dc-surface/40 transition-colors">
              <td className="px-3 py-2 font-semibold text-dc-subtext whitespace-nowrap">{analyst}</td>
              {keys.map(k => {
                const cell = cells.find(c => c.analyst === analyst && c.key === k);
                const pct = cell?.pct ?? 0;
                const bg = pct === 0 ? 'transparent'
                  : `rgba(${hexToRgb(colors[k] ?? '#64748b')},${Math.max(0.08, pct / 100 * 0.7)})`;
                return (
                  <td key={k} className="text-center px-2 py-2 font-semibold"
                    style={{ color: pct > 0 ? (colors[k] ?? '#64748b') : '#334155', backgroundColor: bg }}>
                    {pct > 0 ? `${pct}%` : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r},${g},${b}`;
}

interface UserBreakdownProps {
  summaries: UserSummary[];
}

export function UserBreakdown({ summaries }: UserBreakdownProps) {
  if (summaries.length === 0) return null;

  // Scatter: x = totalTimeSavedHours, y = avgValueRating, size = totalEntries
  const scatterData = summaries.map((s, i) => ({
    ...s,
    color: colorFor(i),
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-bold text-dc-text">Analyst Breakdown</h2>
        <span className="text-xs text-dc-muted">· {summaries.length} analysts</span>
      </div>

      {/* Summary table */}
      <div className="bg-dc-card border border-dc-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-dc-border">
          <h3 className="text-sm font-bold text-dc-text">Overview</h3>
          <p className="text-xs text-dc-muted mt-0.5">Per-analyst aggregate metrics</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dc-border">
                {['Analyst', 'Logs', 'Time Saved', 'Avg Value', 'Use Again', 'Standardize', 'Direct Use', 'Heavy Review', 'Top Tool'].map(h => (
                  <th key={h} className={`py-3 text-xs font-semibold text-dc-muted uppercase tracking-wider ${h === 'Analyst' ? 'text-left px-5' : 'text-right px-4'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-dc-border/50">
              {summaries.map((s, i) => (
                <tr key={s.analystName} className="hover:bg-dc-surface/60 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #004879, #D22E1E)' }}>
                        {s.analystName[0].toUpperCase()}
                      </div>
                      <span className="text-dc-text font-semibold">{s.analystName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-dc-subtext">{s.totalEntries}</td>
                  <td className="px-4 py-3 text-right text-dc-green font-semibold">{s.totalTimeSavedHours}h</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${s.avgValueRating >= 4 ? 'text-dc-amber' : s.avgValueRating >= 3 ? 'text-dc-blue' : 'text-dc-muted'}`}>
                      {s.avgValueRating}/5
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={s.wouldUseAgainPct >= 70 ? 'text-dc-green font-semibold' : 'text-dc-muted'}>
                      {s.wouldUseAgainPct}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-dc-subtext">{s.wouldStandardizePct}%</td>
                  <td className="px-4 py-3 text-right">
                    <span className={s.directUsePct >= 30 ? 'text-dc-amber' : 'text-dc-subtext'}>
                      {s.directUsePct}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={s.heavyVerificationPct >= 30 ? 'text-dc-red' : 'text-dc-subtext'}>
                      {s.heavyVerificationPct}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-dc-subtext text-xs"
                    style={{ color: TOOL_COLORS[s.topTool] ?? '#64748b' }}>
                    {s.topTool}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scatter: time saved vs value */}
      {summaries.length >= 2 && (
        <div className="bg-dc-card border border-dc-border rounded-2xl p-5">
          <h3 className="text-sm font-bold text-dc-text mb-0.5">Time Saved vs. Value Rating</h3>
          <p className="text-xs text-dc-muted mb-4">Each dot = one analyst. Size reflects log count. Hover for details.</p>
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="#1f2d45" strokeDasharray="3 3" />
              <XAxis
                dataKey="totalTimeSavedHours"
                name="Hours Saved"
                type="number"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                label={{ value: 'Hours Saved', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#475569' }}
              />
              <YAxis
                dataKey="avgValueRating"
                name="Avg Value"
                type="number"
                domain={[1, 5]}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                label={{ value: 'Avg Value', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#475569' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Scatter data={scatterData} shape={({ cx, cy, payload }: { cx?: number; cy?: number; payload: typeof scatterData[0] }) => {
                const r = Math.max(8, Math.min(22, payload.totalEntries * 2.5));
                return (
                  <circle cx={cx} cy={cy} r={r} fill={payload.color} fillOpacity={0.7} stroke={payload.color} strokeWidth={1.5} />
                );
              }}>
                {scatterData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-3 justify-center">
            {scatterData.map(d => (
              <div key={d.analystName} className="flex items-center gap-1.5 text-xs text-dc-muted">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                {d.analystName}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage heatmap */}
      <div className="bg-dc-card border border-dc-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-dc-border">
          <h3 className="text-sm font-bold text-dc-text">Workflow Stage Distribution</h3>
          <p className="text-xs text-dc-muted mt-0.5">% of each analyst's logs per stage</p>
        </div>
        <div className="p-1">
          <UsageHeatmap summaries={summaries} dimension="byStage" />
        </div>
      </div>

      {/* Tool heatmap */}
      <div className="bg-dc-card border border-dc-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-dc-border">
          <h3 className="text-sm font-bold text-dc-text">Tool Preference by Analyst</h3>
          <p className="text-xs text-dc-muted mt-0.5">% of each analyst's logs per tool</p>
        </div>
        <div className="p-1">
          <UsageHeatmap summaries={summaries} dimension="byTool" />
        </div>
      </div>
    </div>
  );
}
