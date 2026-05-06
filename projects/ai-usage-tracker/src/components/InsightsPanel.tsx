import { AggStats, LogEntry, UserSummary } from '../types';
import { classifyBenchmark, computeCalibrationRate } from '../lib/storage';

interface Insight {
  type: 'win' | 'flag' | 'tip';
  title: string;
  body: string;
}

function deriveInsights(stats: AggStats, entries: LogEntry[], userSummaries: UserSummary[]): Insight[] {
  if (stats.totalEntries < 3) return [];
  const insights: Insight[] = [];

  // ── Team-level rules ─────────────────────────────────────────────────────

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
      body: "A lot of assists aren't landing. Consider auditing which use cases are driving this and refining the approach.",
    });
  }

  // High verification burden
  const heavyPct = Math.round((stats.byVerification.heavy / stats.totalEntries) * 100);
  if (heavyPct >= 25) {
    insights.push({
      type: 'flag',
      title: `${heavyPct}% of logs require heavy review — verification tax hotspot`,
      body: 'High verification burden erodes time savings. Better prompts, explicit constraints, or a validation checklist could reduce the review load.',
    });
  }

  // Low-value use cases
  const lowValue = Object.entries(stats.byUseCase)
    .filter(([, d]) => d.count >= 2 && d.avgValue <= 2.5)
    .sort((a, b) => a[1].avgValue - b[1].avgValue);
  if (lowValue.length > 0) {
    insights.push({
      type: 'flag',
      title: `"${lowValue[0][0]}" is a habit without payoff`,
      body: `Avg ${Math.round(lowValue[0][1].avgValue * 10) / 10}/5 over ${lowValue[0][1].count} logs — AI may not be the right fit here, or the approach needs rethinking.`,
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

  // ── Edit-heavy sweet spot ─────────────────────────────────────────────────
  const editedOutputEntries = entries.filter(e => e.outputType === 'Edited / improved my text' && e.verificationLevel !== 'heavy');
  if (editedOutputEntries.length >= 2) {
    const avgValue = editedOutputEntries.reduce((s, e) => s + e.valueRating, 0) / editedOutputEntries.length;
    if (avgValue >= 3.5) {
      insights.push({
        type: 'win',
        title: 'Edit-heavy workflows are a sweet spot',
        body: `${editedOutputEntries.length} logs where AI edited or improved your text — avg value ${Math.round(avgValue * 10) / 10}/5 with low verification burden. A high-ROI pattern worth repeating.`,
      });
    }
  }

  // ── Direct-use candidates ─────────────────────────────────────────────────
  const directUseNoVerify = entries.filter(e => e.verificationLevel === 'none' && e.wouldUseAgain && e.valueRating >= 4);
  if (directUseNoVerify.length >= 2) {
    const ucCounts: Record<string, number> = {};
    for (const e of directUseNoVerify) ucCounts[e.useCase] = (ucCounts[e.useCase] ?? 0) + 1;
    const topUC = Object.entries(ucCounts).sort((a, b) => b[1] - a[1])[0];
    insights.push({
      type: 'win',
      title: `Direct-use candidate: "${topUC[0]}"`,
      body: `${topUC[1]} log${topUC[1] > 1 ? 's' : ''} where AI output was used directly with no verification, high value, and marked repeatable. Strong signal for a trusted workflow.`,
    });
  }

  // ── Sensitive direct-use warning ──────────────────────────────────────────
  const sensitiveDirect = entries.filter(e => {
    const isSensitive = e.useCase === 'SQL / query writing' || e.useCase === 'Data cleaning / transformation' || e.useCase === 'Ad-hoc analysis';
    return isSensitive && e.verificationLevel === 'none';
  });
  if (sensitiveDirect.length >= 2) {
    insights.push({
      type: 'flag',
      title: 'SQL/analysis outputs used directly without verification',
      body: `${sensitiveDirect.length} logs where data-critical AI output (queries, analysis) had no verification step. Even light review catches logic errors before they affect downstream reports.`,
    });
  }

  // ── Communication low-friction ────────────────────────────────────────────
  const commEntries = entries.filter(e => e.workflowStage === 'Communicate');
  if (commEntries.length >= 3) {
    const avgValue = commEntries.reduce((s, e) => s + e.valueRating, 0) / commEntries.length;
    const lightOrNone = commEntries.filter(e => e.verificationLevel !== 'heavy').length;
    const lowFrictionPct = Math.round((lightOrNone / commEntries.length) * 100);
    if (avgValue >= 3.5 && lowFrictionPct >= 60) {
      insights.push({
        type: 'win',
        title: 'Communication stage: low friction, high value',
        body: `${commEntries.length} Communicate-stage logs, avg ${Math.round(avgValue * 10) / 10}/5, ${lowFrictionPct}% light-or-no review. AI is fitting naturally into writing and summarization work.`,
      });
    }
  }

  // ── Reuse gap ─────────────────────────────────────────────────────────────
  const highValueNoStandardize = Object.entries(stats.byUseCase)
    .filter(([, d]) => d.avgValue >= 4 && d.count >= 3);
  const standardizeByUC: Record<string, number> = {};
  for (const e of entries) {
    if (e.wouldStandardize) standardizeByUC[e.useCase] = (standardizeByUC[e.useCase] ?? 0) + 1;
  }
  const reusableButNotFlagged = highValueNoStandardize.filter(([uc]) => !standardizeByUC[uc]);
  if (reusableButNotFlagged.length > 0) {
    insights.push({
      type: 'tip',
      title: `Reuse gap: ${reusableButNotFlagged.length} high-value use case${reusableButNotFlagged.length > 1 ? 's' : ''} not flagged for standardization`,
      body: `"${reusableButNotFlagged[0][0]}" has avg ${Math.round(reusableButNotFlagged[0][1].avgValue * 10) / 10}/5 but no standardization flags. Review if these workflows are teachable to the broader team.`,
    });
  }

  // ── Underused bright spot ─────────────────────────────────────────────────
  const underused = Object.entries(stats.byUseCase)
    .filter(([, d]) => d.count >= 1 && d.count <= 2 && d.avgValue >= 4.5);
  if (underused.length > 0) {
    insights.push({
      type: 'tip',
      title: `Underused bright spot: "${underused[0][0]}"`,
      body: `Only ${underused[0][1].count} log${underused[0][1].count > 1 ? 's' : ''} but avg ${Math.round(underused[0][1].avgValue * 10) / 10}/5 — exceptionally high value with low volume. May be underutilized.`,
    });
  }

  // ── Benchmark: above band ─────────────────────────────────────────────────
  const aboveBand = entries.filter(e => classifyBenchmark(e)?.position === 'above');
  if (aboveBand.length >= 2) {
    const ucCounts: Record<string, number> = {};
    for (const e of aboveBand) ucCounts[e.useCase] = (ucCounts[e.useCase] ?? 0) + 1;
    const topUC = Object.entries(ucCounts).sort((a, b) => b[1] - a[1])[0];
    insights.push({
      type: 'win',
      title: `Above-benchmark savings: "${topUC[0]}"`,
      body: `${aboveBand.length} log${aboveBand.length > 1 ? 's' : ''} reported time savings above the research band. This team is outperforming typical baselines — likely due to workflow maturity or tooling familiarity.`,
    });
  }

  // ── Benchmark: below band ─────────────────────────────────────────────────
  const belowBand = entries.filter(e => classifyBenchmark(e)?.position === 'below');
  if (belowBand.length >= 3) {
    const totalWithBench = entries.filter(e => classifyBenchmark(e) !== null && e.timeSavedMinutes > 0).length;
    const belowPct = totalWithBench > 0 ? Math.round((belowBand.length / totalWithBench) * 100) : 0;
    if (belowPct >= 30) {
      insights.push({
        type: 'flag',
        title: `${belowPct}% of logs below benchmark band`,
        body: "A significant share of reported savings falls below what research suggests is typical. This may reflect over-logging marginal assists, or tasks that aren't yet a good AI fit.",
      });
    }
  }

  // ── Low calibration ───────────────────────────────────────────────────────
  const calRate = computeCalibrationRate(entries);
  if (entries.length >= 8 && calRate < 40) {
    insights.push({
      type: 'flag',
      title: `Low calibration rate: only ${calRate}% of logs match research benchmarks`,
      body: 'Most reported savings are outside the expected research bands — either consistently high or low. Worth discussing with the team whether time estimates are being logged accurately.',
    });
  }

  // ── User concentration risk ───────────────────────────────────────────────
  if (userSummaries.length >= 2) {
    const topUser = userSummaries[0];
    const topUserPct = Math.round((topUser.totalEntries / stats.totalEntries) * 100);
    if (topUserPct >= 50 && stats.totalEntries >= 10) {
      insights.push({
        type: 'flag',
        title: `User concentration risk: ${topUser.analystName} accounts for ${topUserPct}% of logs`,
        body: 'Insight quality depends on broad participation. Encourage other team members to log their AI workflows for more representative patterns.',
      });
    }
  }

  // ── User needs enablement ──────────────────────────────────────────────────
  if (userSummaries.length >= 2) {
    const needsSupport = userSummaries.filter(u => u.totalEntries >= 3 && u.avgValueRating <= 2.5 && u.wouldUseAgainPct < 50);
    if (needsSupport.length > 0) {
      insights.push({
        type: 'flag',
        title: `${needsSupport[0].analystName} may need enablement support`,
        body: `Avg value ${needsSupport[0].avgValueRating}/5 and ${needsSupport[0].wouldUseAgainPct}% would-repeat rate over ${needsSupport[0].totalEntries} logs. Targeted guidance on prompt design or use case selection could help.`,
      });
    }
  }

  // ── User power pattern ────────────────────────────────────────────────────
  if (userSummaries.length >= 2) {
    const powerUser = userSummaries.find(u => u.totalEntries >= 5 && u.avgValueRating >= 4 && u.wouldUseAgainPct >= 75 && u.wouldStandardizePct >= 30);
    if (powerUser) {
      insights.push({
        type: 'win',
        title: `${powerUser.analystName} shows a power-user pattern`,
        body: `${powerUser.totalEntries} logs, avg ${powerUser.avgValueRating}/5, ${powerUser.wouldUseAgainPct}% repeat rate, ${powerUser.wouldStandardizePct}% flagged for standardization. A strong candidate to lead a prompt library or knowledge-share session.`,
      });
    }
  }

  return insights;
}

const INSIGHT_STYLES = {
  win:  { border: 'border-dc-green/40',  bg: 'bg-dc-green/5',  icon: '✅', color: 'text-dc-green' },
  flag: { border: 'border-dc-amber/40',  bg: 'bg-dc-amber/5',  icon: '⚠️', color: 'text-dc-amber' },
  tip:  { border: 'border-dc-blue/40',   bg: 'bg-dc-blue/5',   icon: '💡', color: 'text-dc-blue' },
};

interface InsightsPanelProps {
  stats: AggStats;
  entries: LogEntry[];
  userSummaries: UserSummary[];
}

export function InsightsPanel({ stats, entries, userSummaries }: InsightsPanelProps) {
  const insights = deriveInsights(stats, entries, userSummaries);

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

  const wins = insights.filter(i => i.type === 'win');
  const flags = insights.filter(i => i.type === 'flag');
  const tips = insights.filter(i => i.type === 'tip');
  const sorted = [...flags, ...tips, ...wins]; // flags first for attention

  return (
    <div className="space-y-3">
      <div className="bg-dc-card border border-dc-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-dc-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-dc-text">Auto Insights</h3>
              <p className="text-xs text-dc-muted mt-0.5">Patterns from your logs — {stats.totalEntries} entries analyzed</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {flags.length > 0 && <span className="text-dc-amber">{flags.length} flag{flags.length > 1 ? 's' : ''}</span>}
              {wins.length > 0 && <span className="text-dc-green">{wins.length} win{wins.length > 1 ? 's' : ''}</span>}
              {tips.length > 0 && <span className="text-dc-blue">{tips.length} tip{tips.length > 1 ? 's' : ''}</span>}
            </div>
          </div>
        </div>
        <div className="divide-y divide-dc-border/50">
          {sorted.map((insight, i) => {
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
