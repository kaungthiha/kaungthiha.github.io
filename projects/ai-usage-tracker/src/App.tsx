import { useState, useMemo } from 'react';
import { LogEntry } from './types';
import { loadEntries, addEntry, deleteEntry, exportCSV, importCSV, computeStats, generateSeedData, saveEntries, computeUserSummaries } from './lib/storage';
import { LogForm } from './components/LogForm';
import { Dashboard } from './components/Dashboard';
import { LogHistory } from './components/LogHistory';
import { InsightsPanel } from './components/InsightsPanel';
import { UserBreakdown } from './components/UserBreakdown';
import { BenchmarkCalibration } from './components/BenchmarkCalibration';

type Tab = 'log' | 'dashboard' | 'insights' | 'analysts' | 'benchmarks' | 'history';

const ANALYST_KEY = 'dc_analyst_name';

function loadAnalystName(): string {
  try { return localStorage.getItem(ANALYST_KEY) ?? ''; } catch { return ''; }
}
function saveAnalystName(name: string) {
  try { localStorage.setItem(ANALYST_KEY, name); } catch { /* ignore */ }
}

function IdentityGate({ onConfirm }: { onConfirm: (name: string) => void }) {
  const [name, setName] = useState('');
  const trimmed = name.trim();
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0b0f1a' }}>
      {/* Brand glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #004879 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #D22E1E 0%, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-sm text-center">
        {/* Logo mark */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #004879, #D22E1E)' }}>
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-black text-white mb-1">Data Compass</h1>
        <p className="text-sm text-dc-muted mb-8">AI Usage Tracker · Capital One</p>

        <div className="bg-dc-card border border-dc-border rounded-2xl p-6 text-left">
          <p className="text-sm text-dc-subtext mb-4 text-center">
            Who's logging today? Your name stays local — it's just used to attribute your entries in the dashboard.
          </p>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && trimmed && onConfirm(trimmed)}
            placeholder="First name or initial (e.g. Alex R.)"
            maxLength={32}
            autoFocus
            className="w-full px-4 py-3 rounded-xl text-center text-white text-base outline-none transition-all mb-3"
            style={{
              backgroundColor: '#0b0f1a',
              border: `1.5px solid ${trimmed ? '#004879' : '#1f2d45'}`,
              caretColor: '#004879',
            }}
          />
          <button
            onClick={() => trimmed && onConfirm(trimmed)}
            disabled={!trimmed}
            className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{ background: trimmed ? 'linear-gradient(135deg, #004879, #D22E1E)' : '#1f2d45' }}
          >
            Start logging →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [analystName, setAnalystName] = useState<string>(loadAnalystName);
  const [entries, setEntries] = useState<LogEntry[]>(loadEntries);
  const [activeTab, setActiveTab] = useState<Tab>('log');
  const [importError, setImportError] = useState('');
  const [hasSeed, setHasSeed] = useState(false);

  const stats = useMemo(() => computeStats(entries), [entries]);
  const userSummaries = useMemo(() => computeUserSummaries(entries), [entries]);

  function handleIdentityConfirm(name: string) {
    saveAnalystName(name);
    setAnalystName(name);
  }

  function handleAddEntry(entry: LogEntry) {
    setEntries(prev => addEntry(prev, entry));
    setActiveTab('dashboard');
  }

  function handleDelete(id: string) {
    setEntries(prev => deleteEntry(prev, id));
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    importCSV(file).then(imported => {
      const next = [...imported, ...entries];
      setEntries(next);
      saveEntries(next);
    }).catch(() => {
      setImportError('Could not parse CSV. Make sure it was exported from this app.');
    });
    e.target.value = '';
  }

  function handleLoadSeed() {
    const seed = generateSeedData();
    const next = [...seed, ...entries];
    setEntries(next);
    saveEntries(next);
    setHasSeed(true);
    setActiveTab('dashboard');
  }

  if (!analystName) {
    return <IdentityGate onConfirm={handleIdentityConfirm} />;
  }

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'log', label: 'Log' },
    { id: 'dashboard', label: 'Dashboard', badge: stats.totalEntries > 0 ? stats.totalEntries : undefined },
    { id: 'insights', label: 'Insights' },
    { id: 'analysts', label: 'Analysts', badge: userSummaries.length > 1 ? userSummaries.length : undefined },
    { id: 'benchmarks', label: 'Benchmarks' },
    { id: 'history', label: 'History' },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0b0f1a' }}>
      {/* Header */}
      <header className="border-b border-dc-border sticky top-0 z-50 backdrop-blur-md" style={{ backgroundColor: 'rgba(11,15,26,0.92)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #004879, #D22E1E)' }}>
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div>
                <h1 className="text-base font-black leading-none" style={{
                  background: 'linear-gradient(135deg, #004879, #D22E1E)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  Data Compass
                </h1>
                <p className="text-xs text-dc-muted">AI Usage Tracker</p>
              </div>
            </div>

            {/* Right side: analyst chip + actions */}
            <div className="flex items-center gap-2">
              {/* Analyst identity chip */}
              <button
                onClick={() => { saveAnalystName(''); setAnalystName(''); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dc-border hover:border-dc-navy/60 transition-colors group"
                title="Switch analyst"
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #004879, #D22E1E)' }}>
                  {analystName[0].toUpperCase()}
                </div>
                <span className="text-xs text-dc-subtext group-hover:text-dc-text transition-colors hidden sm:inline">{analystName}</span>
                <span className="text-xs text-dc-border group-hover:text-dc-muted transition-colors">↩</span>
              </button>

              {entries.length > 0 && (
                <button
                  onClick={() => exportCSV(entries)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-dc-border text-dc-muted hover:text-dc-text hover:border-dc-navy/40 transition-colors"
                >
                  ↓ CSV
                </button>
              )}
              <label className="text-xs px-3 py-1.5 rounded-lg border border-dc-border text-dc-muted hover:text-dc-text hover:border-dc-navy/40 transition-colors cursor-pointer">
                ↑ Import
                <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
              </label>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-3">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'text-white border'
                    : 'text-dc-muted hover:text-dc-text hover:bg-dc-surface'
                }`}
                style={activeTab === tab.id ? {
                  background: 'rgba(0,72,121,0.25)',
                  borderColor: 'rgba(0,72,121,0.5)',
                } : {}}
              >
                {tab.label}
                {tab.badge !== undefined && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    activeTab === tab.id ? 'bg-dc-navy/40 text-white/70' : 'bg-dc-surface text-dc-muted'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 py-6 pb-16">
        {importError && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-dc-red/10 border border-dc-red/30 text-dc-red text-sm">
            {importError}
          </div>
        )}

        {/* Demo seed banner */}
        {entries.length === 0 && !hasSeed && (
          <div className="mb-6 px-5 py-4 rounded-2xl border flex items-center justify-between gap-4 flex-wrap"
            style={{ background: 'rgba(0,72,121,0.08)', borderColor: 'rgba(0,72,121,0.25)' }}>
            <div>
              <div className="text-sm font-bold text-dc-text">Try the demo</div>
              <div className="text-xs text-dc-muted mt-0.5">Load 28 sample logs across 5 analysts to explore the dashboard.</div>
            </div>
            <button
              onClick={handleLoadSeed}
              className="text-sm px-4 py-2 rounded-xl font-semibold text-white flex-shrink-0 transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #004879, #D22E1E)' }}
            >
              Load sample data
            </button>
          </div>
        )}

        {activeTab === 'log' && (
          <div className="max-w-xl">
            <div className="mb-5">
              <h2 className="text-xl font-black text-dc-text">Log an AI assist</h2>
              <p className="text-sm text-dc-muted mt-1">
                Log the pattern, not the prompt. No queries, table names, or proprietary context.
              </p>
            </div>
            <LogForm analystName={analystName} onSubmit={handleAddEntry} />
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div>
            <div className="mb-5">
              <h2 className="text-xl font-black text-dc-text">Dashboard</h2>
              <p className="text-sm text-dc-muted mt-1">Snapshots about how the team is using AI</p>
            </div>
            <Dashboard stats={stats} entries={entries} />
          </div>
        )}

        {activeTab === 'insights' && (
          <div>
            <div className="mb-5">
              <h2 className="text-xl font-black text-dc-text">Insights</h2>
              <p className="text-sm text-dc-muted mt-1">Auto-generated patterns from logs.</p>
            </div>
            <InsightsPanel stats={stats} entries={entries} userSummaries={userSummaries} />
          </div>
        )}

        {activeTab === 'analysts' && (
          <div>
            <div className="mb-5">
              <h2 className="text-xl font-black text-dc-text">Analyst Breakdown</h2>
              <p className="text-sm text-dc-muted mt-1">Per-analyst usage patterns, tool preferences, and stage distribution.</p>
            </div>
            {userSummaries.length === 0 ? (
              <div className="bg-dc-card border border-dc-border rounded-2xl p-12 text-center">
                <div className="text-4xl mb-3">👥</div>
                <p className="text-sm text-dc-muted">No logs yet. Log some AI assists to see per-analyst breakdowns.</p>
              </div>
            ) : userSummaries.length === 1 ? (
              <div className="bg-dc-card border border-dc-border rounded-2xl p-8 text-center">
                <div className="text-3xl mb-3">👤</div>
                <p className="text-sm text-dc-text font-semibold mb-1">Only one analyst logged so far</p>
                <p className="text-xs text-dc-muted">Multi-analyst comparisons unlock when more team members log their workflows.</p>
              </div>
            ) : (
              <UserBreakdown summaries={userSummaries} />
            )}
          </div>
        )}

        {activeTab === 'benchmarks' && (
          <div>
            <div className="mb-5">
              <h2 className="text-xl font-black text-dc-text">Benchmark Calibration</h2>
              <p className="text-sm text-dc-muted mt-1">How reported time savings compare to published research baselines.</p>
            </div>
            {entries.length === 0 ? (
              <div className="bg-dc-card border border-dc-border rounded-2xl p-12 text-center">
                <div className="text-4xl mb-3">📊</div>
                <p className="text-sm text-dc-muted">Log some AI assists to compare against research benchmarks.</p>
              </div>
            ) : (
              <BenchmarkCalibration entries={entries} />
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <div className="mb-5">
              <h2 className="text-xl font-black text-dc-text">Log History</h2>
              <p className="text-sm text-dc-muted mt-1">{entries.length} total entries</p>
            </div>
            <LogHistory entries={entries} onDelete={handleDelete} />
          </div>
        )}
      </main>

      <footer className="border-t border-dc-border py-5 text-center text-xs text-dc-border">
        Data Compass · AI Usage Tracker · Capital One · All data stays in local storage.
      </footer>
    </div>
  );
}
