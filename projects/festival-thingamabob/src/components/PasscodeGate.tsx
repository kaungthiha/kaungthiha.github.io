import { useState, useRef, useEffect } from 'react';

const STORAGE_KEY = 'rave_route_access';
const CORRECT = 'mikiya';

interface PasscodeGateProps {
  children: React.ReactNode;
}

export function PasscodeGate({ children }: PasscodeGateProps) {
  const [unlocked, setUnlocked] = useState(() => {
    try { return sessionStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });
  const [value, setValue] = useState('');
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!unlocked) inputRef.current?.focus();
  }, [unlocked]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim().toLowerCase() === CORRECT) {
      try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
      setUnlocked(true);
    } else {
      setAttempts(a => a + 1);
      setShake(true);
      setValue('');
      setTimeout(() => setShake(false), 600);
      inputRef.current?.focus();
    }
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Ambient glow blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #38bdf8 0%, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-1">🐑</div>
          <h1 className="text-4xl font-black mb-2" style={{
            background: 'linear-gradient(135deg, #2563eb, #38bdf8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            SheepHerder
          </h1>
          <p className="text-slate-500 text-sm">EDC Las Vegas 2026</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className={`rounded-2xl p-6 border ${shake ? 'animate-shake' : ''}`}
          style={{
            backgroundColor: '#111118',
            borderColor: shake ? '#ef4444' : '#1e1e2e',
            transition: 'border-color 0.2s',
          }}
        >
          <p className="text-slate-300 text-sm text-center mb-5">
            Enter the sheepfold passcode to join the herd.
          </p>

          <input
            ref={inputRef}
            type="password"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="passcode"
            autoComplete="off"
            className="w-full px-4 py-3 rounded-xl text-center text-white text-lg tracking-widest outline-none transition-all"
            style={{
              backgroundColor: '#0a0a0f',
              border: `1px solid ${shake ? '#ef4444' : value ? '#c026d3' : '#1e1e2e'}`,
              caretColor: '#c026d3',
            }}
          />

          {attempts > 0 && (
            <p className="text-red-400 text-xs text-center mt-2">
              Wrong passcode. Try again.
            </p>
          )}

          <button
            type="submit"
            disabled={!value.trim()}
            className="mt-4 w-full py-3 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: value.trim()
                ? 'linear-gradient(135deg, #2563eb, #0ea5e9)'
                : '#1e1e2e',
            }}
          >
            Baa me in 🐑
          </button>
        </form>

        <p className="text-center text-slate-700 text-xs mt-4">
          Don't have the passcode? Ask KT.
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-6px); }
          80%       { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
}
