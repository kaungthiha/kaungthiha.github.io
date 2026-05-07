import { useState } from 'react';
import { LogEntry, AITool, UseCase, WorkflowStage, AIOutputType, VerificationLevel, ValueRating } from '../types';
import { getBenchmark, getSourcesForBenchmark } from '../data/benchmarkReferences';

const TOOLS: AITool[] = ['Gemini', 'ChatGPT', 'Claude', 'Claude Code', 'Copilot', 'Other'];

const USE_CASES: UseCase[] = [
  'SQL / query writing',
  'Data cleaning / transformation',
  'Ad-hoc analysis',
  'Dashboard / viz support',
  'Report writing / summarization',
  'Code review / debugging',
  'Documentation',
  'Exploratory research',
  'Meeting prep / notes',
  'Other',
];

const WORKFLOW_STAGES: { value: WorkflowStage; desc: string }[] = [
  { value: 'Build',       desc: 'Writing queries, transforms, code' },
  { value: 'Validate',    desc: 'Checking results, debugging, QA' },
  { value: 'Communicate', desc: 'Summaries, decks, docs' },
  { value: 'Explore',     desc: 'Research, scoping, ideation' },
  { value: 'Other',       desc: '' },
];

const OUTPUT_TYPES: AIOutputType[] = [
  'Code / query',
  'Explanation / breakdown',
  'Draft text',
  'Edited / improved my text',
  'Data interpretation',
  'Structured outline',
  'Troubleshooting steps',
  'Other',
];

const TIME_OPTIONS = [
  { label: '< 15 min', value: 0 },
  { label: '15 min',   value: 15 },
  { label: '30 min',   value: 30 },
  { label: '1 hr',     value: 60 },
  { label: '1.5 hrs',  value: 90 },
  { label: '2+ hrs',   value: 120 },
];

const VERIFICATION_OPTIONS: { label: string; value: VerificationLevel; desc: string }[] = [
  { label: 'None',  value: 'none',  desc: 'Used the output directly' },
  { label: 'Light', value: 'light', desc: 'Quick sanity check' },
  { label: 'Heavy', value: 'heavy', desc: 'Significant manual review' },
];

// Step definitions — controls progress bar and section visibility
const STEPS = ['Tool & task', 'Workflow', 'Output', 'Impact'] as const;
type Step = 0 | 1 | 2 | 3;

interface ChipButtonProps {
  selected: boolean;
  onClick: () => void;
  color?: 'blue' | 'indigo' | 'green' | 'amber' | 'cyan' | 'red' | 'violet';
  children: React.ReactNode;
  sub?: string;
}

function ChipButton({ selected, onClick, color = 'blue', children, sub }: ChipButtonProps) {
  const activeStyles: Record<string, string> = {
    blue:   'bg-dc-blue/20 border-dc-blue text-dc-blue',
    indigo: 'bg-dc-indigo/20 border-dc-indigo text-dc-indigo',
    green:  'bg-dc-green/20 border-dc-green text-dc-green',
    amber:  'bg-dc-amber/20 border-dc-amber text-dc-amber',
    cyan:   'bg-dc-cyan/20 border-dc-cyan text-dc-cyan',
    red:    'bg-dc-red/20 border-dc-red text-dc-red',
    violet: 'bg-violet-500/20 border-violet-400 text-violet-300',
  };
  const hoverStyles: Record<string, string> = {
    blue:   'hover:border-dc-blue/40',
    indigo: 'hover:border-dc-indigo/40',
    green:  'hover:border-dc-green/40',
    amber:  'hover:border-dc-amber/40',
    cyan:   'hover:border-dc-cyan/40',
    red:    'hover:border-dc-red/40',
    violet: 'hover:border-violet-400/40',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all text-left ${
        selected
          ? activeStyles[color]
          : `bg-dc-surface border-dc-border text-dc-subtext hover:text-dc-text ${hoverStyles[color]}`
      }`}
    >
      <div>{children}</div>
      {sub && <div className="text-xs opacity-60 mt-0.5">{sub}</div>}
    </button>
  );
}

const CONFIDENCE_STYLES = {
  high:   { label: 'High confidence', color: 'text-dc-green border-dc-green/40 bg-dc-green/10' },
  medium: { label: 'Medium confidence', color: 'text-dc-amber border-dc-amber/40 bg-dc-amber/10' },
  low:    { label: 'Low confidence', color: 'text-dc-muted border-dc-border bg-dc-surface' },
};

function BenchmarkCard({ useCase }: { useCase: UseCase }) {
  const bench = getBenchmark(useCase);
  if (!bench) return null;
  const sources = getSourcesForBenchmark(bench);
  const conf = CONFIDENCE_STYLES[bench.confidence];
  const rangeLabel = bench.lowMinutes < 60
    ? `${bench.lowMinutes}–${bench.highMinutes >= 60 ? `${Math.round(bench.highMinutes / 60 * 10) / 10}h` : `${bench.highMinutes}m`}`
    : `${Math.round(bench.lowMinutes / 60 * 10) / 10}–${Math.round(bench.highMinutes / 60 * 10) / 10}h`;
  const medLabel = bench.medianMinutes >= 60
    ? `${Math.round(bench.medianMinutes / 60 * 10) / 10}h`
    : `${bench.medianMinutes}m`;

  return (
    <div className="rounded-xl border border-dc-border bg-dc-surface/60 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-dc-subtext uppercase tracking-wider mb-1">Research Benchmark</div>
          <div className="text-sm font-bold text-dc-text">{useCase}</div>
        </div>
        <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${conf.color}`}>
          {conf.label}
        </span>
      </div>

      <div className="flex items-end gap-4">
        <div>
          <div className="text-xs text-dc-muted mb-0.5">Expected range</div>
          <div className="text-lg font-black text-dc-blue">{rangeLabel}</div>
        </div>
        <div>
          <div className="text-xs text-dc-muted mb-0.5">Median</div>
          <div className="text-base font-bold text-dc-subtext">{medLabel}</div>
        </div>
      </div>

      {/* Visual band */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-dc-muted">
          <span>{bench.lowMinutes}m</span>
          <span className="text-dc-blue font-semibold">↑ median {medLabel}</span>
          <span>{bench.highMinutes >= 60 ? `${Math.round(bench.highMinutes / 60 * 10) / 10}h` : `${bench.highMinutes}m`}</span>
        </div>
        <div className="h-2 rounded-full bg-dc-border/30 relative overflow-hidden">
          <div
            className="absolute h-full rounded-full bg-dc-blue/30"
            style={{
              left: '0%',
              width: '100%',
            }}
          />
          <div
            className="absolute top-0 h-full w-0.5 bg-dc-blue"
            style={{
              left: `${((bench.medianMinutes - bench.lowMinutes) / (bench.highMinutes - bench.lowMinutes)) * 100}%`,
            }}
          />
        </div>
      </div>

      <p className="text-xs text-dc-muted leading-relaxed">{bench.caveat}</p>

      {sources.length > 0 && (
        <div className="pt-1 border-t border-dc-border/40">
          <div className="text-xs text-dc-border mb-1">Sources</div>
          <div className="space-y-0.5">
            {sources.slice(0, 3).map(s => (
              <div key={s.id} className="text-xs text-dc-muted">
                {s.publisher} ({s.year}) — <span className="text-dc-border italic">{s.relevance.slice(0, 80)}{s.relevance.length > 80 ? '…' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface LogFormProps {
  analystName: string;
  onSubmit: (entry: LogEntry) => void;
}

export function LogForm({ analystName, onSubmit }: LogFormProps) {
  const [step, setStep] = useState<Step>(0);

  // Step 0 — Tool & task
  const [tool, setTool] = useState<AITool | ''>('');
  const [useCase, setUseCase] = useState<UseCase | ''>('');

  // Step 1 — Workflow
  const [workflowStage, setWorkflowStage] = useState<WorkflowStage | ''>('');
  const [outputType, setOutputType] = useState<AIOutputType | ''>('');

  // Step 2 — Impact
  const [timeSaved, setTimeSaved] = useState<number | null>(null);
  const [valueRating, setValueRating] = useState<ValueRating | null>(null);
  const [verification, setVerification] = useState<VerificationLevel | null>(null);

  // Step 3 — Reflection
  const [wouldUseAgain, setWouldUseAgain] = useState<boolean | null>(null);
  const [wouldStandardize, setWouldStandardize] = useState<boolean | null>(null);
  const [notes, setNotes] = useState('');

  const [submitted, setSubmitted] = useState(false);

  const stepValid: Record<Step, boolean> = {
    0: !!(tool && useCase),
    1: !!(workflowStage && outputType),
    2: timeSaved !== null && valueRating !== null && verification !== null,
    3: wouldUseAgain !== null && wouldStandardize !== null,
  };

  const allValid = stepValid[0] && stepValid[1] && stepValid[2] && stepValid[3];

  function handleSubmit() {
    if (!allValid) return;
    const entry: LogEntry = {
      id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      analystName,
      tool: tool as AITool,
      useCase: useCase as UseCase,
      workflowStage: workflowStage as WorkflowStage,
      outputType: outputType as AIOutputType,
      timeSavedMinutes: timeSaved!,
      valueRating: valueRating!,
      verificationLevel: verification!,
      wouldUseAgain: wouldUseAgain!,
      wouldStandardize: wouldStandardize!,
      notes: notes.trim() || undefined,
    };
    onSubmit(entry);
    setStep(0);
    setTool(''); setUseCase(''); setWorkflowStage(''); setOutputType('');
    setTimeSaved(null); setValueRating(null); setVerification(null);
    setWouldUseAgain(null); setWouldStandardize(null); setNotes('');
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2500);
  }

  return (
    <div className="bg-dc-card border border-dc-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-dc-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-dc-blue/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-dc-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-dc-text text-base">Log an AI Assist</h2>
          </div>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => {
            const isActive = step === i;
            const isDone = stepValid[i as Step] && step > i;
            return (
              <button
                key={label}
                type="button"
                onClick={() => { if (isDone || isActive) setStep(i as Step); }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-dc-blue/20 text-dc-blue border border-dc-blue/30'
                    : isDone
                    ? 'text-dc-green cursor-pointer hover:bg-dc-green/10'
                    : 'text-dc-border cursor-default'
                }`}
              >
                {isDone ? '✓' : <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center" style={{ fontSize: '10px' }}>{i + 1}</span>}
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
          <div className="flex-1 h-px bg-dc-border ml-1" />
        </div>
      </div>

      {/* Step content */}
      <div className="px-6 py-5 space-y-5">

        {/* Step 0: Tool & task */}
        {step === 0 && (
          <>
            <div>
              <label className="block text-xs font-semibold text-dc-subtext uppercase tracking-wider mb-2">Which AI tool did you use?</label>
              <div className="flex flex-wrap gap-2">
                {TOOLS.map(t => (
                  <ChipButton key={t} selected={tool === t} onClick={() => setTool(t)} color="blue">{t}</ChipButton>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-dc-subtext uppercase tracking-wider mb-2">What kind of work did it help with?</label>
              <div className="flex flex-wrap gap-2">
                {USE_CASES.map(uc => (
                  <ChipButton key={uc} selected={useCase === uc} onClick={() => setUseCase(uc)} color="indigo">{uc}</ChipButton>
                ))}
              </div>
            </div>

            {useCase && useCase !== 'Other' && (
              <BenchmarkCard useCase={useCase as UseCase} />
            )}
          </>
        )}

        {/* Step 1: Workflow */}
        {step === 1 && (
          <>
            <div>
              <label className="block text-xs font-semibold text-dc-subtext uppercase tracking-wider mb-1">Where in the analyst workflow?</label>
              <p className="text-xs text-dc-muted mb-3">Think about what stage of the work you were in, not the specific task.</p>
              <div className="flex flex-wrap gap-2">
                {WORKFLOW_STAGES.map(s => (
                  <ChipButton key={s.value} selected={workflowStage === s.value} onClick={() => setWorkflowStage(s.value)} color="violet" sub={s.desc || undefined}>
                    {s.value}
                  </ChipButton>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-dc-subtext uppercase tracking-wider mb-1">What did the AI produce?</label>
              <p className="text-xs text-dc-muted mb-3">Not what you asked for — what did it actually give you?</p>
              <div className="flex flex-wrap gap-2">
                {OUTPUT_TYPES.map(ot => (
                  <ChipButton key={ot} selected={outputType === ot} onClick={() => setOutputType(ot)} color="cyan">{ot}</ChipButton>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Step 2: Impact */}
        {step === 2 && (
          <>
            <div>
              <label className="block text-xs font-semibold text-dc-subtext uppercase tracking-wider mb-2">How much time did it save?</label>
              <div className="flex flex-wrap gap-2">
                {TIME_OPTIONS.map(opt => (
                  <ChipButton key={opt.value} selected={timeSaved === opt.value} onClick={() => setTimeSaved(opt.value)} color="green">{opt.label}</ChipButton>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-dc-subtext uppercase tracking-wider mb-2">
                How useful was it? <span className="font-normal normal-case text-dc-muted">Overall value, not just time.</span>
              </label>
              <div className="flex gap-2">
                {([1, 2, 3, 4, 5] as ValueRating[]).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setValueRating(v)}
                    className={`w-11 h-11 rounded-xl text-xl border transition-all ${
                      valueRating !== null && v <= valueRating
                        ? 'bg-dc-amber/20 border-dc-amber text-dc-amber'
                        : 'bg-dc-surface border-dc-border text-dc-border hover:text-dc-amber/60'
                    }`}
                  >
                    ★
                  </button>
                ))}
                {valueRating !== null && (
                  <span className="self-center text-xs text-dc-muted ml-1">
                    {valueRating === 1 ? 'Not useful' : valueRating === 2 ? 'Marginal' : valueRating === 3 ? 'Useful' : valueRating === 4 ? 'Very useful' : 'Excellent'}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-dc-subtext uppercase tracking-wider mb-2">How much did you verify the output?</label>
              <div className="flex flex-wrap gap-2">
                {VERIFICATION_OPTIONS.map(opt => (
                  <ChipButton
                    key={opt.value}
                    selected={verification === opt.value}
                    onClick={() => setVerification(opt.value)}
                    color={opt.value === 'heavy' ? 'red' : opt.value === 'none' ? 'cyan' : 'blue'}
                    sub={opt.desc}
                  >
                    {opt.label}
                  </ChipButton>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Step 3: Reflection */}
        {step === 3 && (
          <>
            <div>
              <label className="block text-xs font-semibold text-dc-subtext uppercase tracking-wider mb-2">Would you use this AI workflow again for this task?</label>
              <div className="flex gap-2">
                {[
                  { label: 'Yes', value: true },
                  { label: 'No / unsure', value: false },
                ].map(opt => (
                  <ChipButton key={String(opt.value)} selected={wouldUseAgain === opt.value} onClick={() => setWouldUseAgain(opt.value)} color={opt.value ? 'green' : 'red'}>
                    {opt.label}
                  </ChipButton>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-dc-subtext uppercase tracking-wider mb-2">Worth building a team workflow around?</label>
              <div className="flex gap-2">
                {[
                  { label: 'Yes — teach the team', value: true },
                  { label: 'No — one-off', value: false },
                ].map(opt => (
                  <ChipButton key={String(opt.value)} selected={wouldStandardize === opt.value} onClick={() => setWouldStandardize(opt.value)} color={opt.value ? 'blue' : 'red'}>
                    {opt.label}
                  </ChipButton>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-dc-subtext uppercase tracking-wider mb-1">
                Notes <span className="font-normal normal-case text-dc-muted">— optional</span>
              </label>
              <p className="text-xs text-dc-muted mb-2">Describe the pattern or what made it work. No prompts, queries, table names, or proprietary context.</p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Generated a first-pass summary of the metric definitions, edited the structure and tone before sharing."
                rows={3}
                maxLength={300}
                className="w-full px-4 py-3 rounded-xl bg-dc-surface border border-dc-border text-dc-text placeholder:text-dc-muted text-sm focus:outline-none focus:border-dc-blue/60 resize-none"
              />
              <div className="text-xs text-dc-border text-right mt-1">{notes.length}/300</div>
            </div>
          </>
        )}

      </div>

      {/* Footer nav */}
      <div className="px-6 pb-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep(s => (s - 1) as Step)}
          disabled={step === 0}
          className="px-4 py-2 rounded-xl text-sm font-medium border border-dc-border text-dc-muted hover:text-dc-text hover:border-dc-blue/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Back
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep(s => (s + 1) as Step)}
            disabled={!stepValid[step]}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={stepValid[step] ? { background: '#0067ff', boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.15)' } : { background: '#242a35' }}
          >
            Next →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!allValid}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
              submitted
                ? 'bg-dc-green/30 border border-dc-green text-dc-green'
                : 'text-white disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
            style={allValid && !submitted ? { background: '#0067ff', boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.15)' } : {}}
          >
            {submitted ? '✓ Logged!' : 'Submit log →'}
          </button>
        )}
      </div>
    </div>
  );
}
