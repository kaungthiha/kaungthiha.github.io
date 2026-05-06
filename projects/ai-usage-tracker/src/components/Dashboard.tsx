import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import { AggStats, LogEntry } from '../types';

const TOOL_COLORS: Record<string, string> = {
  Gemini:       '#3b82f6',
  ChatGPT:      '#10b981',
  Claude:       '#f59e0b',
  'Claude Code':'#a78bfa',
  Copilot:      '#22d3ee',
  Other:        '#64748b',
};

const STAGE_COLORS: Record<string, string> = {
  Build:       '#6366f1',
  Validate:    '#f59e0b',
  Communicate: '#10b981',
  Explore:     '#22d3ee',
  Other:       '#64748b',
};

const VERIFICATION_COLORS = {
  none:  '#10b981',
  light: '#3b82f6',
  heavy: '#ef4444',
};

function StatCard({ label, value, sub, accent = '#3b82f6' }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-dc-card border border-dc-border rounded-xl p-4">
      <div className="text-xs font-semibold text-dc-muted uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-black" style={{ color: accent }}>{value}</div>
      {sub && <div className="text-xs text-dc-muted mt-0.5">{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dc-surface border border-dc-border rounded-xl px-3 py-2 text-xs shadow-xl">
      <div className="font-semibold text-dc-text mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="text-dc-subtext">{p.name}: <span className="text-dc-text font-semibold">{p.value}</span></div>
      ))}
    </div>
  );
};

interface DashboardProps {
  stats: AggStats;
  entries: LogEntry[];
}

export function Dashboard({ stats, entries }: DashboardProps) {
  if (stats.totalEntries === 0) {
    return (
      <div className="bg-dc-card border border-dc-border rounded-2xl p-12 text-center">
        <div className="text-5xl mb-4">🧭</div>
        <h3 className="font-bold text-dc-text text-lg mb-2">No data yet</h3>
        <p className="text-dc-muted text-sm">Log your first AI assist to see the dashboard come to life.</p>
      </div>
    );
  }

  // Use cases sorted by time saved
  const useCaseData = Object.entries(stats.byUseCase)
    .sort((a, b) => b[1].timeSaved - a[1].timeSaved)
    .slice(0, 6)
    .map(([uc, d]) => ({
      name: uc.length > 24 ? uc.slice(0, 22) + '…' : uc,
      timeSaved: Math.round(d.timeSaved / 60 * 10) / 10,
      count: d.count,
    }));

  // Tool pie
  const toolPie = Object.entries(stats.byTool).map(([tool, count]) => ({
    name: tool,
    value: count,
    fill: TOOL_COLORS[tool] ?? '#64748b',
  }));

  // Workflow stage bar
  const stageData = Object.entries(stats.byStage)
    .sort((a, b) => b[1] - a[1])
    .map(([stage, count]) => ({ name: stage, count, fill: STAGE_COLORS[stage] ?? '#64748b' }));

  // Output type bar
  const outputData = Object.entries(stats.byOutputType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([ot, count]) => ({
      name: ot.length > 20 ? ot.slice(0, 18) + '…' : ot,
      count,
    }));

  // Verification breakdown
  const verifyData = [
    { name: 'No verify',   value: stats.byVerification.none,  fill: VERIFICATION_COLORS.none },
    { name: 'Light check', value: stats.byVerification.light, fill: VERIFICATION_COLORS.light },
    { name: 'Heavy review',value: stats.byVerification.heavy, fill: VERIFICATION_COLORS.heavy },
  ].filter(d => d.value > 0);

  // Radar: use cases by avg value (min 2 entries)
  const radarData = Object.entries(stats.byUseCase)
    .filter(([, d]) => d.count >= 2)
    .map(([uc, d]) => ({
      subject: uc.split('/')[0].trim().slice(0, 12),
      avgValue: Math.round(d.avgValue * 10) / 10,
    }));

  const recent = entries.slice(0, 8);

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Total Logs"    value={String(stats.totalEntries)}          sub={`${stats.recentWeekEntries} this week`}    accent="#3b82f6" />
        <StatCard label="Hours Saved"   value={`${stats.totalTimeSavedHours}h`}     sub="self-reported"                             accent="#10b981" />
        <StatCard label="Avg Value"     value={`${stats.avgValueRating}/5`}         sub="across all logs"                           accent="#f59e0b" />
        <StatCard label="Use Again"     value={`${stats.wouldUseAgainPct}%`}        sub="would repeat"                              accent="#22d3ee" />
        <StatCard label="Standardize"   value={String(stats.standardizeCount)}      sub="worth teaching"                            accent="#a78bfa" />
      </div>

      {/* Analyst contributions */}
      {Object.keys(stats.byAnalyst).length > 1 && (
        <div className="bg-dc-card border border-dc-border rounded-xl px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-dc-muted uppercase tracking-wider">Analyst Contributions</span>
            <span className="text-xs text-dc-muted">{Object.keys(stats.byAnalyst).length} analysts</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byAnalyst)
              .sort((a, b) => b[1] - a[1])
              .map(([name, count]) => {
                const pct = Math.round((count / stats.totalEntries) * 100);
                return (
                  <div key={name} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dc-border bg-dc-surface">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #004879, #D22E1E)' }}>
                      {name[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-dc-text">{name}</span>
                    <span className="text-xs text-dc-muted">{count} <span className="text-dc-border">({pct}%)</span></span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Row 1: Use cases + Tool */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-dc-card border border-dc-border rounded-2xl p-5">
          <h3 className="text-sm font-bold text-dc-text mb-0.5">Time Saved by Use Case</h3>
          <p className="text-xs text-dc-muted mb-4">Hours saved (self-reported)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={useCaseData} layout="vertical" margin={{ left: 0, right: 16 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.07)' }} />
              <Bar dataKey="timeSaved" name="Hours saved" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-dc-card border border-dc-border rounded-2xl p-5">
          <h3 className="text-sm font-bold text-dc-text mb-0.5">Tool Usage</h3>
          <p className="text-xs text-dc-muted mb-4">Logs by AI tool</p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="55%" height={180}>
              <PieChart>
                <Pie data={toolPie} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value">
                  {toolPie.map((entry, i) => <Cell key={i} fill={entry.fill} stroke="transparent" />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {toolPie.map(t => (
                <div key={t.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.fill }} />
                    <span className="text-xs text-dc-subtext truncate">{t.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-dc-text flex-shrink-0">{t.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Workflow stage + Output type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-dc-card border border-dc-border rounded-2xl p-5">
          <h3 className="text-sm font-bold text-dc-text mb-0.5">Workflow Stage</h3>
          <p className="text-xs text-dc-muted mb-4">Where in the analyst workflow is AI being used?</p>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={stageData} margin={{ left: 0, right: 8 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.07)' }} />
              <Bar dataKey="count" name="Logs" radius={[4, 4, 0, 0]}>
                {stageData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-dc-card border border-dc-border rounded-2xl p-5">
          <h3 className="text-sm font-bold text-dc-text mb-0.5">AI Output Type</h3>
          <p className="text-xs text-dc-muted mb-4">What the AI actually produced</p>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={outputData} layout="vertical" margin={{ left: 0, right: 16 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" width={145} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(34,211,238,0.07)' }} />
              <Bar dataKey="count" name="Logs" fill="#22d3ee" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Verification + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-dc-card border border-dc-border rounded-2xl p-5">
          <h3 className="text-sm font-bold text-dc-text mb-0.5">Verification Load</h3>
          <p className="text-xs text-dc-muted mb-4">How much checking is required?</p>
          <div className="space-y-3">
            {verifyData.map(v => (
              <div key={v.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-dc-subtext">{v.name}</span>
                  <span className="font-semibold text-dc-text">{v.value} <span className="text-dc-muted font-normal">({Math.round(v.value / stats.totalEntries * 100)}%)</span></span>
                </div>
                <div className="h-1.5 rounded-full bg-dc-surface overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.round(v.value / stats.totalEntries * 100)}%`, backgroundColor: v.fill }} />
                </div>
              </div>
            ))}
          </div>
          {stats.byVerification.heavy > 0 && (
            <div className="mt-4 pt-3 border-t border-dc-border text-xs text-dc-muted">
              <span className="text-dc-red font-semibold">{stats.byVerification.heavy} logs</span> required heavy review — candidates for better prompting guidance.
            </div>
          )}
        </div>

        {radarData.length >= 3 && (
          <div className="bg-dc-card border border-dc-border rounded-2xl p-5 lg:col-span-2">
            <h3 className="text-sm font-bold text-dc-text mb-0.5">Value by Use Case</h3>
            <p className="text-xs text-dc-muted mb-2">Avg rating per category (min 2 logs)</p>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1f2d45" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Radar name="Avg Value" dataKey="avgValue" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Use case table */}
      <div className="bg-dc-card border border-dc-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-dc-border">
          <h3 className="text-sm font-bold text-dc-text">Use Case Breakdown</h3>
          <p className="text-xs text-dc-muted mt-0.5">Sorted by time saved</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dc-border">
                <th className="text-left px-5 py-3 text-xs font-semibold text-dc-muted uppercase tracking-wider">Use Case</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-dc-muted uppercase tracking-wider">Logs</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-dc-muted uppercase tracking-wider">Time Saved</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-dc-muted uppercase tracking-wider">Avg Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dc-border/50">
              {Object.entries(stats.byUseCase)
                .sort((a, b) => b[1].timeSaved - a[1].timeSaved)
                .map(([uc, d]) => (
                  <tr key={uc} className="hover:bg-dc-surface/60 transition-colors">
                    <td className="px-5 py-3 text-dc-text font-medium">{uc}</td>
                    <td className="px-4 py-3 text-right text-dc-subtext">{d.count}</td>
                    <td className="px-4 py-3 text-right text-dc-green font-semibold">
                      {d.timeSaved >= 60 ? `${Math.round(d.timeSaved / 60 * 10) / 10}h` : `${d.timeSaved}m`}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${d.avgValue >= 4 ? 'text-dc-amber' : d.avgValue >= 3 ? 'text-dc-blue' : 'text-dc-muted'}`}>
                        {Math.round(d.avgValue * 10) / 10}/5
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent log feed */}
      <div className="bg-dc-card border border-dc-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-dc-border">
          <h3 className="text-sm font-bold text-dc-text">Recent Logs</h3>
        </div>
        <div className="divide-y divide-dc-border/50">
          {recent.map(entry => (
            <div key={entry.id} className="px-5 py-3 flex items-center gap-4 hover:bg-dc-surface/40 transition-colors">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: TOOL_COLORS[entry.tool] ?? '#64748b' }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-dc-text">{entry.tool}</span>
                  <span className="text-xs text-dc-border">·</span>
                  <span className="text-xs text-dc-subtext">{entry.useCase}</span>
                  <span className="text-xs text-dc-border">·</span>
                  <span className="text-xs" style={{ color: STAGE_COLORS[entry.workflowStage] ?? '#64748b' }}>{entry.workflowStage}</span>
                </div>
                {entry.notes && <p className="text-xs text-dc-muted mt-0.5 truncate">{entry.notes}</p>}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 text-xs text-dc-muted">
                {entry.timeSavedMinutes > 0 && (
                  <span className="text-dc-green">{entry.timeSavedMinutes >= 60 ? `${entry.timeSavedMinutes / 60}h` : `${entry.timeSavedMinutes}m`}</span>
                )}
                <span>{'★'.repeat(entry.valueRating)}</span>
                <span className="hidden sm:inline text-dc-border">{new Date(entry.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
