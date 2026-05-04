import { useState } from 'react';
import { FlockInfo, createTrip, joinTrip } from '../lib/flockApi';

interface FlockGateProps {
  onJoined: (info: FlockInfo) => void;
  onSkip: () => void;
}

type Mode = 'choose' | 'create' | 'join';

export function FlockGate({ onJoined, onSkip }: FlockGateProps) {
  const [mode, setMode] = useState<Mode>('choose');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingJoin, setPendingJoin] = useState<FlockInfo | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    const result = await createTrip(name.trim());
    setLoading(false);
    if (!result) {
      setError('Failed to create flock. Please try again.');
      return;
    }
    setPendingJoin(result);
  }

  async function handleJoin() {
    if (!name.trim() || !code.trim()) return;
    setLoading(true);
    setError('');
    const result = await joinTrip(code.trim(), name.trim());
    setLoading(false);
    if (!result) {
      setError("Couldn't find that flock. Check the code and try again.");
      return;
    }
    onJoined(result);
  }

  function handleCopy() {
    if (!pendingJoin) return;
    navigator.clipboard.writeText(pendingJoin.tripCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // After creating — show the code
  if (pendingJoin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0a0a0f' }}>
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 70%)' }} />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #38bdf8 0%, transparent 70%)' }} />
        </div>

        <div className="relative w-full max-w-sm text-center">
          <div className="text-4xl mb-2">🐑</div>
          <h2 className="text-2xl font-black text-white mb-1">Flock Created!</h2>
          <p className="text-slate-500 text-sm mb-6">Share this code with your crew so they can join the herd</p>

          <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl p-6 mb-4">
            <div
              className="text-4xl font-black tracking-[0.25em] mb-4"
              style={{
                background: 'linear-gradient(135deg, #2563eb, #38bdf8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {pendingJoin.tripCode}
            </div>
            <button
              onClick={handleCopy}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors border border-slate-700 hover:border-slate-500 px-4 py-1.5 rounded-lg"
            >
              {copied ? '✓ Copied!' : '📋 Copy code'}
            </button>
          </div>

          <button
            onClick={() => onJoined(pendingJoin)}
            className="w-full py-3 rounded-xl font-bold text-white text-sm"
            style={{ background: 'linear-gradient(135deg, #2563eb, #0ea5e9)' }}
          >
            Enter the Pasture 🐑
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #38bdf8 0%, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-1">🐑</div>
          <h1
            className="text-3xl font-black mb-1"
            style={{
              background: 'linear-gradient(135deg, #2563eb, #38bdf8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            SheepHerder
          </h1>
          <p className="text-slate-500 text-sm">EDC Las Vegas 2026</p>
        </div>

        <div className="rounded-2xl p-6 border" style={{ backgroundColor: '#111118', borderColor: '#1e1e2e' }}>
          {mode === 'choose' && (
            <>
              <p className="text-slate-300 text-sm text-center mb-5">
                Planning with a crew? Herd together to compare itineraries.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => setMode('create')}
                  className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #0ea5e9)' }}
                >
                  🐑 Start a new flock
                </button>
                <button
                  onClick={() => setMode('join')}
                  className="w-full py-3 rounded-xl font-semibold text-slate-300 text-sm border border-slate-700 hover:border-slate-500 hover:text-white transition-all"
                >
                  Join an existing flock
                </button>
              </div>
              <button
                onClick={onSkip}
                className="w-full mt-4 text-xs text-slate-600 hover:text-slate-400 transition-colors py-1"
              >
                Skip — I'll herd solo
              </button>
            </>
          )}

          {mode === 'create' && (
            <>
              <button
                onClick={() => { setMode('choose'); setError(''); setName(''); }}
                className="text-xs text-slate-600 hover:text-slate-400 mb-4 flex items-center gap-1 transition-colors"
              >
                ← Back
              </button>
              <p className="text-slate-300 text-sm text-center mb-5">
                What should the flock call you?
              </p>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="Your name"
                maxLength={24}
                autoFocus
                className="w-full px-4 py-3 rounded-xl text-center text-white text-base outline-none transition-all mb-3"
                style={{
                  backgroundColor: '#0a0a0f',
                  border: `1px solid ${name ? '#2563eb' : '#1e1e2e'}`,
                  caretColor: '#2563eb',
                }}
              />
              {error && <p className="text-red-400 text-xs text-center mb-3">{error}</p>}
              <button
                onClick={handleCreate}
                disabled={!name.trim() || loading}
                className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                style={{ background: name.trim() ? 'linear-gradient(135deg, #2563eb, #0ea5e9)' : '#1e1e2e' }}
              >
                {loading ? 'Creating flock...' : 'Create Flock 🐑'}
              </button>
            </>
          )}

          {mode === 'join' && (
            <>
              <button
                onClick={() => { setMode('choose'); setError(''); setName(''); setCode(''); }}
                className="text-xs text-slate-600 hover:text-slate-400 mb-4 flex items-center gap-1 transition-colors"
              >
                ← Back
              </button>
              <p className="text-slate-300 text-sm text-center mb-5">
                Enter your flock code and pick a name
              </p>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="Flock code (e.g. AB3XY7)"
                maxLength={6}
                autoFocus
                className="w-full px-4 py-3 rounded-xl text-center text-white text-lg tracking-widest outline-none transition-all mb-3 font-mono"
                style={{
                  backgroundColor: '#0a0a0f',
                  border: `1px solid ${code ? '#2563eb' : '#1e1e2e'}`,
                  caretColor: '#2563eb',
                }}
              />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder="Your name"
                maxLength={24}
                className="w-full px-4 py-3 rounded-xl text-center text-white text-base outline-none transition-all mb-3"
                style={{
                  backgroundColor: '#0a0a0f',
                  border: `1px solid ${name ? '#2563eb' : '#1e1e2e'}`,
                  caretColor: '#2563eb',
                }}
              />
              {error && <p className="text-red-400 text-xs text-center mb-3">{error}</p>}
              <button
                onClick={handleJoin}
                disabled={!name.trim() || !code.trim() || loading}
                className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                style={{ background: name.trim() && code.trim() ? 'linear-gradient(135deg, #2563eb, #0ea5e9)' : '#1e1e2e' }}
              >
                {loading ? 'Joining flock...' : 'Join Flock 🐑'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
