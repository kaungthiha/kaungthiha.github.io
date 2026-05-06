import { AggStats } from '../types';

interface Insight {
  type: 'win' | 'flag' | 'tip';
  title: string;
  body: string;
}

function deriveInsights(stats: AggStats): Insight[] {
  if (stats.totalEntries < 3) return [];
  const insights: Insight[] = [];

  // High-value use cases
  const highValue = Object.entries(stats.byUseCase)
    .filter(([, d]) => d.count >= 2 && d.avgValue >= 4)
    .sort((a, b) => b[1].avgValue - a[1].avgValue);
  if (highValue.length > 0) {
    insights.push({
      type: 'win',
      title: `"${highValue[0][0]}" is your highest-value use case`,
      body: `Avg rating of ${Math.round(highValue[0][1].avgValue * 10) / 10}/5 across ${highValue[0][1].count} logs. Worth documenting a reusable prompt pattern.`,
    });
  }

  // Would use again
  if (stats.wouldUseAgainPct >= 80) {
    insights.push({
      type: 'win',
      title: `${stats.wouldUseAgainPct}% of workflows are repeatable`,
      body: 'Strong signal that AI is adding consistent value. Focus on standardizing the highest-rated ones.',
    });
  } else if (stats.wouldUseAgainPct < 60) {
    insights.push({
      type: 'flag',
      title: `Only ${stats.wouldUseAgainPct}% of workflows would be repeated`,
      body: 'A lot of assists aren\'t landing. Consider auditing which use cases are driving this and refining the approach.',
    });
  }

  // High verification burden
  const heavyPct = Math.round((stats.byVerification.heavy / stats.totalEntries) * 100);
  if (heavyPct >= 25) {
    insights.push({
      type: 'flag',
      title: `${heavyPct}% of logs require heavy review`,
      body: 'High verification burden suggests the AI output needs more refinement before it\'s trustworthy. Better prompts or a validation checklist could help.',
    });
  }

  // Low-value use cases
  const lowValue = Object.entries(stats.byUseCase)
    .filter(([, d]) => d.count >= 2 && d.avgValue <= 2.5)
    .sort((a, b) => a[1].avgValue - b[1].avgValue);
  if (lowValue.length > 0) {
    insights.push({
      type: 'flag',
      title: `"${lowValue[0][0]}" is consistently low-value`,
      body: `Avg ${Math.round(lowValue[0][1].avgValue * 10) / 10}/5 — may not be the right fit for AI, or the current approach needs rethinking.`,
    });
  }

  // Workflow stage concentration
  const stageEntries = Object.entries(stats.byStage).sort((a, b) => b[1] - a[1]);
  if (stageEntries.length > 0) {
    const topStage = stageEntries[0];
    const topPct = Math.round((topStage[1] / stats.totalEntries) * 100);
    if (topPct >= 50) {
      insights.push({
        type: 'tip',
        title: `${topPct}% of usage is in the ${topStage[0]} stage`,
        body: `Heavy concentration in one stage. Exploring AI in other stages (${stageEntries.slice(1).map(([s]) => s).join(', ')}) could uncover new time savings.`,
      });
    }
  }

  // Standardization candidates
  if (stats.standardizeCount >= 3) {
    insights.push({
      type: 'tip',
      title: `${stats.standardizeCount} workflows flagged for standardization`,
      body: 'These are team-teachable. Consider a short knowledge-share or adding them to a shared prompt library.',
    });
  }

  // Tool diversity
  const toolCount = Object.keys(stats.byTool).length;
  if (toolCount >= 3) {
    const topTool = Object.entries(stats.byTool).sort((a, b) => b[1] - a[1])[0];
    insights.push({
      type: 'tip',
      title: `${toolCount} tools in use — ${topTool[0]} leads at ${Math.round((topTool[1] / stats.totalEntries) * 100)}%`,
      body: 'Cross-tool comparison could reveal which tools work best for which use cases.',
    });
  }

  return insights;
}

const INSIGHT_STYLES = {
  win:  { border: 'border-dc-green/40',  bg: 'bg-dc-green/5',  icon: '✅', color: 'text-dc-green' },
  flag: { border: 'border-dc-amber/40',  bg: 'bg-dc-amber/5',  icon: '⚠️', color: 'text-dc-amber' },
  tip:  { border: 'border-dc-blue/40',   bg: 'bg-dc-blue/5',   icon: '💡', color: 'text-dc-blue' },
};

export function InsightsPanel({ stats }: { stats: AggStats }) {
  const insights = deriveInsights(stats);

  if (stats.totalEntries < 3) {
    return (
      <div className="bg-dc-card border border-dc-border rounded-2xl p-6">
        <h3 className="text-sm font-bold text-dc-text mb-2">Insights</h3>
        <p className="text-xs text-dc-muted mb-3">Log at least 3 assists to unlock auto-generated insights.</p>
        <div className="h-1 rounded-full bg-dc-border overflow-hidden">
          <div className="h-full rounded-full bg-dc-blue transition-all" style={{ width: `${(stats.totalEntries / 3) * 100}%` }} />
        </div>
        <p className="text-xs text-dc-muted mt-1">{stats.totalEntries}/3 logs</p>
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="bg-dc-card border border-dc-border rounded-2xl p-6">
        <h3 className="text-sm font-bold text-dc-text mb-1">Insights</h3>
        <p className="text-xs text-dc-muted">Keep logging — more patterns will emerge.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-dc-card border border-dc-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-dc-border">
          <h3 className="text-sm font-bold text-dc-text">Auto Insights</h3>
          <p className="text-xs text-dc-muted mt-0.5">Patterns from your logs — {stats.totalEntries} entries analyzed</p>
        </div>
        <div className="divide-y divide-dc-border/50">
          {insights.map((insight, i) => {
            const s = INSIGHT_STYLES[insight.type];
            return (
              <div key={i} className={`px-5 py-4 ${s.bg} border-l-2 ${s.border}`}>
                <div className="flex items-start gap-3">
                  <span className="text-base flex-shrink-0 mt-0.5">{s.icon}</span>
                  <div>
                    <div className={`text-sm font-semibold ${s.color} mb-1`}>{insight.title}</div>
                    <p className="text-xs text-dc-subtext leading-relaxed">{insight.body}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Standardize candidates table */}
      {stats.standardizeCount > 0 && (() => {
        const candidates = Object.entries(stats.byUseCase)
          .filter(([, d]) => d.avgValue >= 4)
          .sort((a, b) => b[1].avgValue - a[1].avgValue);
        if (candidates.length === 0) return null;
        return (
          <div className="bg-dc-card border border-dc-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-dc-border">
              <h3 className="text-sm font-bold text-dc-text">Standardization Candidates</h3>
              <p className="text-xs text-dc-muted mt-0.5">High-value use cases worth adding to a shared prompt library</p>
            </div>
            <div className="divide-y divide-dc-border/50">
              {candidates.map(([uc, d]) => (
                <div key={uc} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-dc-text">{uc}</div>
                    <div className="text-xs text-dc-muted mt-0.5">{d.count} logs · {d.timeSaved >= 60 ? `${Math.round(d.timeSaved / 60 * 10) / 10}h saved` : `${d.timeSaved}m saved`}</div>
                  </div>
                  <span className="text-dc-amber font-bold text-sm flex-shrink-0">{Math.round(d.avgValue * 10) / 10}/5</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
