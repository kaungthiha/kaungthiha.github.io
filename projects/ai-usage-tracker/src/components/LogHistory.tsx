import { useState } from 'react';
import { LogEntry } from '../types';

const VERIFICATION_LABEL = { none: 'No verify', light: 'Light check', heavy: 'Heavy review' };
const VERIFICATION_COLOR = {
  none:  'text-dc-green border-dc-green/40 bg-dc-green/10',
  light: 'text-dc-blue border-dc-blue/40 bg-dc-blue/10',
  heavy: 'text-dc-red border-dc-red/40 bg-dc-red/10',
};
const STAGE_COLOR: Record<string, string> = {
  Build: 'text-violet-300', Validate: 'text-dc-amber',
  Communicate: 'text-dc-green', Explore: 'text-dc-cyan', Other: 'text-dc-muted',
};

interface LogHistoryProps {
  entries: LogEntry[];
  onDelete: (id: string) => void;
}

export function LogHistory({ entries, onDelete }: LogHistoryProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <div className="bg-dc-card border border-dc-border rounded-2xl p-10 text-center">
        <div className="text-4xl mb-3">📋</div>
        <p className="text-dc-muted text-sm">No logs yet. Start logging your AI assists.</p>
      </div>
    );
  }

  return (
    <div className="bg-dc-card border border-dc-border rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-dc-border">
        <h3 className="text-sm font-bold text-dc-text">All Logs</h3>
        <p className="text-xs text-dc-muted mt-0.5">{entries.length} entries</p>
      </div>

      <div className="divide-y divide-dc-border/50">
        {entries.map(entry => (
          <div key={entry.id} className="px-5 py-4 hover:bg-dc-surface/40 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Line 1: analyst · tool · use case */}
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #004879, #D22E1E)', fontSize: '9px', fontWeight: 700 }}>
                      {entry.analystName[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-dc-subtext">{entry.analystName}</span>
                  </div>
                  <span className="text-dc-border text-xs">·</span>
                  <span className="text-sm font-bold text-dc-text">{entry.tool}</span>
                  <span className="text-dc-border text-xs">·</span>
                  <span className="text-sm text-dc-subtext">{entry.useCase}</span>
                </div>
                {/* Line 2: badges */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`px-2 py-0.5 rounded-full border font-medium ${VERIFICATION_COLOR[entry.verificationLevel]}`}>
                    {VERIFICATION_LABEL[entry.verificationLevel]}
                  </span>
                  <span className={`font-medium ${STAGE_COLOR[entry.workflowStage] ?? 'text-dc-muted'}`}>
                    {entry.workflowStage}
                  </span>
                  <span className="text-dc-muted">{entry.outputType}</span>
                  {entry.timeSavedMinutes > 0 && (
                    <span className="text-dc-green font-semibold">
                      {entry.timeSavedMinutes >= 60 ? `${entry.timeSavedMinutes / 60}h saved` : `${entry.timeSavedMinutes}m saved`}
                    </span>
                  )}
                  <span className="text-dc-amber">{'★'.repeat(entry.valueRating)}{'☆'.repeat(5 - entry.valueRating)}</span>
                  {entry.wouldStandardize && (
                    <span className="px-2 py-0.5 rounded-full border border-dc-indigo/40 bg-dc-indigo/10 text-dc-indigo font-medium">
                      ✓ standardize
                    </span>
                  )}
                  {!entry.wouldUseAgain && (
                    <span className="px-2 py-0.5 rounded-full border border-dc-red/30 bg-dc-red/10 text-dc-red/70 font-medium">
                      wouldn't repeat
                    </span>
                  )}
                </div>
                {entry.notes && (
                  <p className="mt-2 text-xs text-dc-muted italic leading-relaxed">{entry.notes}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className="text-xs text-dc-muted">
                  {new Date(entry.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                {confirmDelete === entry.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { onDelete(entry.id); setConfirmDelete(null); }}
                      className="text-xs px-2 py-1 rounded-lg bg-dc-red/20 border border-dc-red/40 text-dc-red hover:bg-dc-red/30 transition-colors"
                    >
                      Delete
                    </button>
                    <button onClick={() => setConfirmDelete(null)} className="text-xs text-dc-muted hover:text-dc-text transition-colors">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(entry.id)} className="text-xs text-dc-border hover:text-dc-muted transition-colors" title="Delete">
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
