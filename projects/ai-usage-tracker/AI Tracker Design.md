# AI Usage Tracker — Design Document

A complete reference for replicating the Data Compass AI Usage Tracker from scratch. Covers architecture, data models, algorithms, component logic, theming, and every file.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Type System](#4-type-system)
5. [Storage & Business Logic](#5-storage--business-logic)
6. [CSV Format](#6-csv-format)
7. [Benchmark Data](#7-benchmark-data)
8. [App.tsx — Root State & Handlers](#8-apptsx--root-state--handlers)
9. [Component Architecture](#9-component-architecture)
10. [Insights Engine](#10-insights-engine)
11. [Theming & Design System](#11-theming--design-system)
12. [Environment & Build](#12-environment--build)
13. [Replication Checklist](#13-replication-checklist)

---

## 1. Project Overview

**Data Compass · AI Usage Tracker** is a frontend-only React SPA for logging and benchmarking AI tool usage across a knowledge-worker team. Analysts log each AI interaction — tool used, task type, time saved, value rating, verification burden — and the app surfaces team-wide patterns, per-analyst breakdowns, research-calibrated benchmarks, and auto-generated insights.

**Key design decisions:**

- **No backend.** All data lives in `localStorage`. CSV import/export handles cross-device sharing.
- **Research-baked benchmarks.** Expected time savings by use case are compiled into the app as static data from published studies.
- **Dual-purpose logging.** Each entry captures both productivity signal (time saved, value rating) and trust/readiness signal (verification level, would use again, would standardize).
- **Progressive insights.** Dashboard, insights, and analyst comparison views unlock incrementally as more data accumulates.

---

## 2. Tech Stack

| Layer | Choice | Version |
|---|---|---|
| UI | React | 18.3.1 |
| Language | TypeScript | 5.4.5 |
| Build | Vite | 6.3.5 |
| Styling | Tailwind CSS | 3.4.4 |
| Charts | Recharts | 2.12.7 |
| Fonts | Inter, Work Sans, JetBrains Mono | Google Fonts |

No external UI library. All components are custom Tailwind. Recharts is the only non-trivial runtime dependency beyond React.

---

## 3. Repository Structure

```
projects/ai-usage-tracker/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── package.json
└── src/
    ├── main.tsx                        # React entry point
    ├── App.tsx                         # Root component, all app state
    ├── index.css                       # Tailwind directives + global utilities
    ├── types/
    │   └── index.ts                    # All shared TypeScript types
    ├── lib/
    │   └── storage.ts                  # localStorage CRUD, stats, benchmarks, CSV
    ├── data/
    │   ├── benchmarkReferences.ts      # Per-use-case time-savings benchmarks
    │   └── researchSources.ts          # Cited research papers/studies
    └── components/
        ├── LogForm.tsx                 # 4-step entry form
        ├── Dashboard.tsx              # Team stats, charts, recent feed
        ├── LogHistory.tsx             # Sortable entry table with delete
        ├── InsightsPanel.tsx          # Auto-generated pattern insights
        ├── UserBreakdown.tsx          # Per-analyst comparison
        └── BenchmarkCalibration.tsx   # Research calibration & sources
```

**Build output** goes to `../../tools/ai-usage-tracker/` (sibling in the same repo), deployed as a static site at `/tools/ai-usage-tracker/`.

---

## 4. Type System

All types live in `src/types/index.ts`.

### 4.1 Enum-style Union Types

```typescript
type AITool =
  | 'Gemini' | 'ChatGPT' | 'Claude' | 'Claude Code' | 'Copilot' | 'Other';

type UseCase =
  | 'SQL / query writing'
  | 'Data cleaning / transformation'
  | 'Dashboard / viz support'
  | 'Report writing / summarization'
  | 'Ad-hoc analysis'
  | 'Code review / debugging'
  | 'Documentation'
  | 'Exploratory research'
  | 'Meeting prep / notes'
  | 'Other';

type WorkflowStage = 'Build' | 'Validate' | 'Communicate' | 'Explore' | 'Other';

type AIOutputType =
  | 'Code / query'
  | 'Explanation / breakdown'
  | 'Draft text'
  | 'Edited / improved my text'
  | 'Data interpretation'
  | 'Structured outline'
  | 'Troubleshooting steps'
  | 'Other';

type VerificationLevel = 'none' | 'light' | 'heavy';

type ValueRating = 1 | 2 | 3 | 4 | 5;
```

### 4.2 LogEntry

The core data unit. One row per AI interaction.

```typescript
interface LogEntry {
  id: string;                       // UUID-style unique ID
  timestamp: string;                // ISO 8601
  analystName: string;
  tool: AITool;
  useCase: UseCase;
  workflowStage: WorkflowStage;
  outputType: AIOutputType;
  timeSavedMinutes: number;         // 0 = "less than 15 min"
  valueRating: ValueRating;         // 1–5 stars
  verificationLevel: VerificationLevel;
  wouldUseAgain: boolean;
  wouldStandardize: boolean;
  notes?: string;                   // max 300 chars, no proprietary context
}
```

### 4.3 AggStats

Aggregate statistics computed over all entries.

```typescript
interface AggStats {
  totalEntries: number;
  totalTimeSavedHours: number;      // rounded to 1 decimal
  avgValueRating: number;           // rounded to 1 decimal
  byTool: Record<string, number>;
  byUseCase: Record<string, {
    count: number;
    timeSaved: number;              // total minutes
    avgValue: number;               // rounded to 1 decimal
  }>;
  byStage: Record<string, number>;
  byOutputType: Record<string, number>;
  byVerification: Record<VerificationLevel, number>;
  byAnalyst: Record<string, number>;
  standardizeCount: number;
  wouldUseAgainPct: number;         // 0–100
  recentWeekEntries: number;
}
```

### 4.4 BenchmarkClassification

```typescript
type BenchmarkPosition = 'above' | 'within' | 'below' | 'unknown';

interface BenchmarkClassification {
  position: BenchmarkPosition;
  benchmarkMedian: number;
  benchmarkLow: number;
  benchmarkHigh: number;
  gap: number;                      // timeSavedMinutes – benchmarkMedian
}
```

### 4.5 UserSummary

Per-analyst rollup for the comparison view.

```typescript
interface UserSummary {
  analystName: string;
  totalEntries: number;
  totalTimeSavedHours: number;
  avgValueRating: number;
  wouldUseAgainPct: number;
  wouldStandardizePct: number;
  heavyVerificationPct: number;     // % with verificationLevel='heavy'
  directUsePct: number;             // % with verificationLevel='none'
  topTool: string;
  topUseCase: string;
  topStage: WorkflowStage;
  calibrationRate: number;          // % of logs within benchmark band
  aboveBandPct: number;
  belowBandPct: number;
  byTool: Record<string, number>;
  byStage: Record<string, number>;
  byUseCase: Record<string, { count: number; timeSaved: number; avgValue: number }>;
  recentWeekEntries: number;
}
```

---

## 5. Storage & Business Logic

**File:** `src/lib/storage.ts`

**localStorage keys:**

| Key | Content |
|---|---|
| `dc_ai_usage_logs` | `LogEntry[]` JSON array |
| `dc_analyst_name` | Current analyst's display name string |

### 5.1 CRUD Functions

```typescript
loadEntries(): LogEntry[]
// Reads dc_ai_usage_logs from localStorage. Returns [] on missing or parse failure.

saveEntries(entries: LogEntry[]): void
// Writes JSON to dc_ai_usage_logs. Silently swallows quota errors.

addEntry(entries: LogEntry[], entry: LogEntry): LogEntry[]
// Prepends entry, calls saveEntries, returns new array.

deleteEntry(entries: LogEntry[], id: string): LogEntry[]
// Filters out by id, saves, returns new array.
```

### 5.2 Statistics Computation

`computeStats(entries: LogEntry[]): AggStats`

Single pass over all entries:
1. Count into `byTool`, `byStage`, `byOutputType`, `byVerification`, `byAnalyst`.
2. For each use case: accumulate `count`, `timeSaved` (minutes), `valueRatingSum`.
3. Accumulate `totalTimeSaved`, `totalValue`, `standardizeCount`, `wouldUseAgainCount`.
4. Count entries where `timestamp` is within the last 7 days → `recentWeekEntries`.
5. Derive `avgValue` per use case = `valueRatingSum / count`.
6. Round `totalTimeSavedHours` (= total minutes / 60) and `avgValueRating` to 1 decimal.

### 5.3 Benchmark Classification

`classifyBenchmark(entry: LogEntry): BenchmarkClassification | null`

1. Calls `getBenchmark(entry.useCase)` — returns `null` if no benchmark defined.
2. If `timeSavedMinutes === 0` → position `'unknown'`.
3. If `< lowMinutes` → `'below'`.
4. If `> highMinutes` → `'above'`.
5. Otherwise → `'within'`.
6. `gap = timeSavedMinutes – medianMinutes`.

```typescript
computeCalibrationRate(entries: LogEntry[]): number
// % of entries (with timeSavedMinutes > 0) where position === 'within'.

computeAboveBandPct(entries: LogEntry[]): number
// % where position === 'above'.

computeBelowBandPct(entries: LogEntry[]): number
// % where position === 'below'.
```

### 5.4 User Summaries

`computeUserSummaries(entries: LogEntry[]): UserSummary[]`

1. Group entries by `analystName`.
2. For each analyst, compute all fields in `UserSummary`:
   - `topTool`, `topUseCase`, `topStage` from highest-count bucket.
   - `calibrationRate`, `aboveBandPct`, `belowBandPct` via helpers above.
3. Sort result descending by `totalEntries`.

### 5.5 Seed Data

`generateSeedData(): LogEntry[]`

Eh we don't need this cause I can just use my manual logs and continue from there. 

---

## 6. CSV Format

### 6.1 Export

Triggered by `exportCSV(entries)`. Downloads as `ai-usage-YYYY-MM-DD.csv`.

**Column order (12 columns):**

| # | Header | Notes |
|---|---|---|
| 1 | Date | `MM/DD/YYYY` |
| 2 | Analyst | |
| 3 | Tool | |
| 4 | Use Case | |
| 5 | Workflow Stage | |
| 6 | Output Type | |
| 7 | Time Saved (min) | Integer |
| 8 | Value Rating | 1–5 |
| 9 | Verification | `none` / `light` / `heavy` |
| 10 | Would Use Again | `Yes` / `No` |
| 11 | Would Standardize | `Yes` / `No` |
| 12 | Notes | Commas escaped as semicolons |

### 6.2 Import

`importCSV(file: File): Promise<LogEntry[]>`

- Skips row 0 (header).
- Splits on commas (no quote support — notes are joined from remaining fields).
- Generates new IDs: `imported-${Date.now()}-${index}`.
- Default fallbacks on missing/unknown values: `workflowStage='Other'`, `outputType='Other'`, `verificationLevel='light'`, `valueRating=3`.
- Rejects the promise with a descriptive error string on parse failure.

Imported entries are merged in front of existing entries in `App.tsx`.

---

## 7. Benchmark Data

**File:** `src/data/benchmarkReferences.ts`

### 7.1 BenchmarkReference Shape

```typescript
interface BenchmarkReference {
  useCase: UseCase;
  lowMinutes: number;
  highMinutes: number;
  medianMinutes: number;
  confidence: 'high' | 'medium' | 'low';
  caveat: string;
  sourceIds: string[];   // keys into RESEARCH_SOURCES
}
```

### 7.2 Benchmark Table

| Use Case | Low | Median | High | Confidence |
|---|---|---|---|---|
| SQL / query writing | 20 | 45 | 75 | high |
| Data cleaning / transformation | 15 | 30 | 60 | medium |
| Dashboard / viz support | 10 | 20 | 45 | low |
| Report writing / summarization | 25 | 50 | 90 | high |
| Ad-hoc analysis | 15 | 30 | 60 | medium |
| Code review / debugging | 15 | 25 | 50 | medium |
| Documentation | 20 | 40 | 70 | high |
| Exploratory research | 10 | 20 | 45 | low |
| Meeting prep / notes | 10 | 18 | 35 | low |
| Other | 10 | 20 | 45 | low |

Confidence reflects how many studies cover the use case and how consistent they are.

### 7.3 Exported Functions

```typescript
getBenchmark(useCase: UseCase): BenchmarkReference | undefined
getSourcesForBenchmark(benchmark: BenchmarkReference): ResearchSource[]
```

### 7.4 Research Sources

**File:** `src/data/researchSources.ts`

```typescript
interface ResearchSource {
  id: string;
  title: string;
  publisher: string;
  year: number;
  url: string;
  relevance: string;   // one-line takeaway
}
```

Ten cited sources used across benchmarks: #We can def get

| ID | Publisher | Year | Key Finding |
|---|---|---|---|
| `github-copilot-2022` | GitHub | 2022 | 55% faster on code tasks |
| `mckinsey-productivity-2023` | McKinsey | 2023 | 20–45% gains on writing/analysis |
| `stanford-hai-2023` | Stanford HAI | 2023 | 14% productivity boost, larger for entry-level |
| `mit-whitecollars-2023` | MIT | 2023 | 37% faster writing, 18% quality improvement |
| `nielsen-ux-2023` | Nielsen Norman | 2023 | 66% faster writing; validates self-reporting |
| `accenture-verification-2023` | Accenture | 2023 | 60%+ enterprise outputs need review |
| `delaware-sql-2023` | U. of Delaware | 2023 | 45–70% SQL write-time reduction |
| `deloitte-analytics-2024` | Deloitte | 2024 | 25–50% time savings on data analysis |
| `anthropic-enterprise-2024` | Anthropic | 2024 | 30–60% reduction on docs/summarization |
| `harvard-coding-2023` | Harvard | 2023 | 25% faster inside-frontier, 40% quality gain |

---

## 8. App.tsx — Root State & Handlers

### 8.1 State

```typescript
const [analystName, setAnalystName] = useState<string>(loadAnalystName)
const [entries, setEntries]         = useState<LogEntry[]>(loadEntries)
const [activeTab, setActiveTab]     = useState<Tab>('log')
const [importError, setImportError] = useState<string>('')
const [hasSeed, setHasSeed]         = useState<boolean>(false)

type Tab = 'log' | 'dashboard' | 'insights' | 'analysts' | 'benchmarks' | 'history'
```

Derived values (memoised):

```typescript
const stats        = useMemo(() => computeStats(entries), [entries])
const userSummaries = useMemo(() => computeUserSummaries(entries), [entries])
```

### 8.2 Handlers

```typescript
handleIdentityConfirm(name: string)
// Saves to localStorage key dc_analyst_name, updates analystName state.

handleAddEntry(entry: LogEntry)
// Calls addEntry(), updates entries, switches to 'dashboard' tab.

handleDelete(id: string)
// Calls deleteEntry(), updates entries state.

handleImport(e: React.ChangeEvent<HTMLInputElement>)
// Reads File from input, calls importCSV() promise.
// On resolve: merges imported + existing (imported first), saves, clears input.
// On reject: sets importError string.

handleLoadSeed()
// Calls generateSeedData(), prepends to existing entries, setHasSeed(true),
// switches to 'dashboard'.
```

### 8.3 Identity Gate

Shown full-screen when `analystName` is empty. Blocks access to all tabs.

- Dark modal with blue + cyan glow accents.
- Capital One gradient logo wordmark (`navy → coral`).
- Text input (max 32 chars), Enter key supported.
- Submit disabled until trimmed name is non-empty.
- On confirm: writes to `dc_analyst_name` localStorage key.

### 8.4 Header

Sticky, backdrop-blurred. Contains:
- Brand chip (gradient logo)
- Analyst identity chip (first name initial in circle + full name, clickable to reset to identity gate)
- **Export CSV** button (visible when `entries.length > 0`)
- **Import** file input (always visible, hidden `<input type="file" accept=".csv">` behind label)
- Tab bar with badge counts:
  - Dashboard: shows `totalEntries` if > 0
  - Analysts: shows analyst count if > 1

### 8.5 Empty State Banner

Shown on the Log tab when `entries.length === 0 && !hasSeed`. Contains a "Load sample data" button that calls `handleLoadSeed()`.

---

## 9. Component Architecture

### 9.1 LogForm.tsx

**Props:** `{ analystName: string; onSubmit: (entry: LogEntry) => void }`

A 4-step wizard. Each step is a separate section of the same form; progress is shown by a step indicator.

#### State

```typescript
step: 0 | 1 | 2 | 3

// Step 0
tool: AITool | ''
useCase: UseCase | ''

// Step 1
workflowStage: WorkflowStage | ''
outputType: AIOutputType | ''

// Step 2
timeSaved: number | null          // 0 = "< 15 min"
valueRating: ValueRating | null
verification: VerificationLevel | null

// Step 3
wouldUseAgain: boolean | null
wouldStandardize: boolean | null
notes: string                     // max 300 chars

submitted: boolean                // success flash (2.5s)
```

#### Step Validation

```typescript
stepValid = {
  0: !!(tool && useCase),
  1: !!(workflowStage && outputType),
  2: timeSaved !== null && valueRating !== null && verification !== null,
  3: wouldUseAgain !== null && wouldStandardize !== null,
}
```

#### Steps

**Step 0 — Tool & Task**
- Chip grid: 6 tool options
- Chip grid: 10 use-case options
- If `useCase` is set and not `'Other'`: inline `BenchmarkCard`

**Step 1 — Workflow**
- Chip grid: 5 workflow stages (each with a short description sub-label)
- Chip grid: 8 output types

**Step 2 — Impact**
- Chip grid: 6 time-saved options (`< 15 min` → 0, `15 min`, `30 min`, `1 hr`, `1.5 hrs`, `2+ hrs` → 120)
- Star picker: 1–5, fills left-to-right on click
- Chip grid: 3 verification levels (each with a description)

**Step 3 — Reflection**
- Binary choice: Would use again? (Yes / No chips)
- Binary choice: Worth standardizing? (Teach team / One-off chips)
- Textarea: notes (300-char limit, character counter shown)

#### Sub-components

**ChipButton**
- Props: `selected, onClick, color, children, sub?`
- Renders a bordered button. Selected state: colored background + border. `sub` renders smaller text below label.

**BenchmarkCard**
- Shown inline in Step 0 when a benchmarkable use case is selected.
- Displays: confidence badge, expected range (low–high), median.
- Visual band: a horizontal bar with a median tick mark.
- Caveat text.
- Top 3 source citations (publisher, year, one-line relevance).

#### Submit Behaviour

On submit: generate `id` (`log-${Date.now()}-${Math.random().toString(36).slice(2)}`), call `onSubmit(entry)`, reset all state, show success feedback for 2.5 s, return to step 0.

---

### 9.2 Dashboard.tsx

**Props:** `{ stats: AggStats; entries: LogEntry[] }`

Renders nothing meaningful when `stats.totalEntries === 0`.

#### Sections

**1. KPI Cards** (5-column responsive grid)

| Metric | Sub-label |
|---|---|
| Total Logs | "X this week" |
| Hours Saved | "self-reported" |
| Avg Value | "/ 5 rating" |
| Would Use Again % | "would repeat" |
| Standardize Count | "worth teaching" |

**2. Analyst Contributions** (shown if > 1 analyst)
- Row of avatar chips: initials circle, name, count, percentage.

**3. Time Saved by Use Case** — horizontal bar chart (Recharts)
- Top 6 use cases by total minutes saved.
- X-axis: hours (minutes ÷ 60). Y-axis: use case name (truncated at 22 chars).

**4. Tool Usage** — donut pie chart (Recharts)
- Custom colors per tool. Legend with count per tool.

**5. Workflow Stage** — vertical bar chart
- Count per stage. Bars colored by stage.

**6. AI Output Type** — horizontal bar chart
- Top 6 output types. Blue bars.

**7. Verification Load** — progress bars
- Three stacked bars: `none` (green), `light` (blue), `heavy` (red).
- Callout text if heavy > 0.

**8. Value by Use Case** — radar chart (shown if ≥ 3 use cases with 2+ logs)
- Avg value rating (1–5 scale) per use case on each axis.

**9. Use Case Breakdown** — sortable table
- Columns: Use Case, Logs, Time Saved (formatted as h/m), Avg Value (colored by threshold).
- Sorted by time saved descending.

**10. Recent Logs Feed** — last 8 entries
- Colored tool dot, use case, stage badge, notes snippet.
- Time saved chip, star rating, date.

---

### 9.3 LogHistory.tsx

**Props:** `{ entries: LogEntry[]; onDelete: (id: string) => void }`

Reverse-chronological list of all entries. Each entry row shows:
- Analyst avatar chip (initials), tool, use case.
- Badge row: verification level (colored), stage, output type, time saved, value stars, standardize flag, wouldn't-repeat flag.
- Notes (italic, muted, one line truncated).
- Date/time on the right.
- Delete button: first click shows "Delete / Cancel" confirmation inline; second click calls `onDelete`.

**Delete state:** `confirmDelete: string | null` — holds the entry ID being confirmed.

**Empty state:** Large 📋 icon + "No logs yet" text.

---

### 9.4 InsightsPanel.tsx

**Props:** `{ stats: AggStats; entries: LogEntry[]; userSummaries: UserSummary[] }`

See [Section 10](#10-insights-engine) for the full insight rules.

**Rendering:**
- Fewer than 3 entries: progress bar showing `totalEntries / 3`, message "Keep logging to unlock insights."
- 0 insights generated: "Keep logging — more patterns will emerge."
- Otherwise:
  - Insight count summary: "X flags, Y wins, Z tips."
  - Insight cards sorted: flags first, then tips, then wins.
  - Each card: icon (⚠️ / 💡 / ✅), colored title, body text.
  - **Standardization Candidates** table below (use cases with avgValue ≥ 4 and count ≥ 2 not yet flagged for standardization).

---

### 9.5 UserBreakdown.tsx

**Props:** `{ summaries: UserSummary[] }`

Renders only when `summaries.length >= 2`.

#### Sections

**1. Overview Table**

Columns: Analyst, Logs, Time Saved, Avg Value, Use Again %, Standardize %, Direct Use %, Heavy Review %, Top Tool.

Cell colouring thresholds:
- Use Again %: green if ≥ 70%, red if < 50%.
- Heavy Review %: red if ≥ 30%.
- Avg Value: green if ≥ 4, amber if 3–3.9, red if < 3.

**2. Time Saved vs Value Rating — scatter plot (Recharts)**
- X: `totalTimeSavedHours`. Y: `avgValueRating` (domain 1–5).
- Bubble radius scales with `totalEntries` (clamped 8–22 px).
- Custom `AnalystDot` scatter shape.
- Colour legend below.

**3. Workflow Stage Distribution — heatmap table**
- Rows: analysts. Columns: Build, Validate, Communicate, Explore, Other.
- Each cell: % of that analyst's logs in that stage.
- Background opacity scales with value; text colour matches stage colour.

**4. Tool Preference by Analyst — heatmap table**
- Same structure as stage heatmap.
- Columns: Gemini, ChatGPT, Claude, Claude Code, Copilot, Other.

Analyst colours rotate through a fixed palette (blue, pink, emerald, violet, amber, cyan).

---

### 9.6 BenchmarkCalibration.tsx

**Props:** `{ entries: LogEntry[] }`

#### Sections

**1. KPI Cards** (4-column grid)
- Calibration Rate %, In Range %, Above Band %, Below Band %.

**2. Explainer callout**
- "About these benchmarks" — explains ranges come from external research, not targets.

**3. Per-Use-Case Calibration Table**
- For each use case that has at least one log:
  - Use Case, Logs, Benchmark median, In range %, Above %, Below %, Confidence badge.
- Sorted by log count descending.

**4. Entry-Level Classification Feed** (up to 25 entries with `timeSavedMinutes > 0`)
- Per entry: position badge (Above band / In range / Below band), tool, use case, analyst, time saved, gap vs median.

**5. Research Sources List**
- All 10 `RESEARCH_SOURCES` entries.
- Each: title, publisher · year, relevance one-liner, external link (opens in new tab).

---

## 10. Insights Engine

**File:** `src/components/InsightsPanel.tsx`

`deriveInsights(stats, entries, userSummaries): Insight[]`

Each insight has `{ type: 'win' | 'flag' | 'tip', title: string, body: string }`.

### Rules (19 total)

| # | Type | Trigger | Title pattern |
|---|---|---|---|
| 1 | win | Any use case: count ≥ 2 AND avgValue ≥ 4 | `"X" is your highest-value use case` |
| 2 | win | `wouldUseAgainPct ≥ 80` | `X% of workflows are repeatable` |
| 2b | flag | `wouldUseAgainPct < 60` | `Only X% would be repeated` |
| 3 | flag | `byVerification.heavy / total ≥ 25%` | `X% require heavy review` |
| 4 | flag | Use case: count ≥ 2 AND avgValue ≤ 2.5 | `"X" is a habit without payoff` |
| 5 | tip | Top stage ≥ 50% of logs | `X% of usage in Y stage — consider broadening` |
| 6 | tip | `standardizeCount ≥ 3` | `X workflows flagged for standardization` |
| 7 | tip | ≥ 3 distinct tools used | `X tools in use — healthy diversity` |
| 8 | win | ≥ 2 logs: outputType='Edited…' AND verification≠'heavy' AND avgValue ≥ 3.5 | Editing sweet spot |
| 9 | win | ≥ 2 logs: verification='none' AND wouldUseAgain AND valueRating ≥ 4 | Direct-use candidates |
| 10 | flag | ≥ 2 logs: useCase in [SQL, Data cleaning, Ad-hoc] AND verification='none' | Sensitive direct-use warning |
| 11 | win | ≥ 3 Communicate-stage logs, avgValue ≥ 3.5, ≥ 60% not heavy | Communication is low-friction |
| 12 | tip | High-value use cases (avgValue ≥ 4, count ≥ 3) without `wouldStandardize` | Reuse gap |
| 13 | tip | Use case: count 1–2 AND avgValue ≥ 4.5 | Underused bright spot |
| 14 | win | ≥ 2 logs with position='above' | Team outperforming research baselines |
| 15 | flag | ≥ 3 logs position='below' AND ≥ 30% of benchmarked entries | Below-benchmark pattern |
| 16 | flag | ≥ 8 entries AND calibrationRate < 40% | Low calibration — estimates misaligned |
| 17 | flag | ≥ 2 analysts AND top analyst ≥ 50% of logs AND totalEntries ≥ 10 | User concentration risk |
| 18 | flag | Any analyst: ≥ 3 entries, avgValue ≤ 2.5, wouldUseAgainPct < 50 | User needs enablement |
| 19 | win | Any analyst: ≥ 5 entries, avgValue ≥ 4, wouldUseAgainPct ≥ 75, wouldStandardizePct ≥ 30 | Power user pattern |

Insights are deduplicated within a single render (the function generates at most one insight per rule per run). Rules are evaluated in order; if an analyst-level insight fires for multiple analysts, only the first is included.

---

## 11. Theming & Design System

### 11.1 Tailwind Custom Colors (`dc.*` namespace)

```javascript
// tailwind.config.js
dc: {
  bg:      '#080e18',   // page background (darkest)
  surface: '#161c26',   // card elevation layer
  card:    '#1a202a',   // primary card background
  border:  '#424655',   // border / divider
  outline: '#8c90a1',   // tertiary text / outline
  navy:    '#004879',   // Capital One brand
  coral:   '#D22E1E',   // Capital One accent
  blue:    '#0067ff',   // primary interactive
  indigo:  '#b3c5ff',   // indigo tint
  cyan:    '#4cd6ff',   // accent
  green:   '#10b981',   // success / positive
  amber:   '#f59e0b',   // warning / value
  red:     '#ffb4aa',   // danger
  text:    '#dde2f1',   // primary text
  subtext: '#c2c6d8',   // secondary text
  muted:   '#8c90a1',   // tertiary text
}
```

### 11.2 Typography

| Role | Font | Weights |
|---|---|---|
| Body | Inter | 400, 500, 600, 700, 800 |
| Display / headings | Work Sans | 600, 700 |
| Mono (code, IDs) | JetBrains Mono | 400, 500 |

All loaded from Google Fonts. Set via Tailwind `fontFamily.sans`, `fontFamily.display`, `fontFamily.mono`.

### 11.3 Shadows

```javascript
'glow-blue': '0 0 20px rgba(0,103,255,0.35)'
'glow-cyan': '0 0 20px rgba(76,214,255,0.25)'
'card':      '0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.4)'
```

### 11.4 Global CSS Utilities (`src/index.css`)

```css
.text-gradient          { background: linear-gradient(to right, #0067ff, #4cd6ff);
                          -webkit-background-clip: text; color: transparent; }
.text-gradient-brand    { background: linear-gradient(to right, #004879, #D22E1E); ... }
.glass-card             { background: rgba(255,255,255,0.04);
                          border: 1px solid rgba(255,255,255,0.07);
                          backdrop-filter: blur(12px); }
.btn-primary            { background: #0067ff; inset highlight; hover: darken; }
```

Custom scrollbar: 6 px, dark gray track and thumb, darkens on hover.

### 11.5 Chart Colors

Tool colors (used in pie/bar charts):

| Tool | Color |
|---|---|
| Gemini | `#4285F4` (Google blue) |
| ChatGPT | `#10a37f` (OpenAI green) |
| Claude | `#d97706` (Amber) |
| Claude Code | `#7c3aed` (Violet) |
| Copilot | `#0078d4` (Microsoft blue) |
| Other | `#6b7280` (Gray) |

Stage colors:

| Stage | Color |
|---|---|
| Build | `#3b82f6` (blue) |
| Validate | `#f59e0b` (amber) |
| Communicate | `#10b981` (green) |
| Explore | `#8b5cf6` (violet) |
| Other | `#6b7280` (gray) |

### 11.6 Recurring UI Patterns

| Pattern | Implementation |
|---|---|
| Primary button | `bg-dc-blue` with `glow-blue` shadow, hover darkens |
| Card | `bg-dc-card border border-dc-border rounded-xl` |
| Sticky header | `backdrop-blur-md` + `bg-dc-bg/90` |
| Insight flag | Red-tinted card, `⚠️` icon |
| Insight win | Green-tinted card, `✅` icon |
| Insight tip | Blue-tinted card, `💡` icon |
| Verification badge | Green (`none`), blue (`light`), red (`heavy`) |
| Value star row | Amber filled stars up to rating |
| Heatmap cell | `rgba(r,g,b, value/100 * 0.6)` background |

---

## 12. Environment & Build

### 12.1 No Environment Variables

The app has no external services. No `.env` file needed.

### 12.2 Vite Config

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  base: '/tools/ai-usage-tracker/',
  build: {
    outDir: '../../tools/ai-usage-tracker',
    emptyOutDir: true,
  },
})
```

Adjust `base` and `outDir` to match your deployment path.

### 12.3 Scripts

```json
"dev":     "vite"
"build":   "tsc && vite build"
"preview": "vite preview"
```

### 12.4 Dependencies

```json
{
  "dependencies": {
    "react":    "18.3.1",
    "react-dom":"18.3.1",
    "recharts": "2.12.7"
  },
  "devDependencies": {
    "@types/react":        "...",
    "@types/react-dom":    "...",
    "@vitejs/plugin-react":"...",
    "autoprefixer":        "...",
    "postcss":             "...",
    "tailwindcss":         "3.4.4",
    "typescript":          "5.4.5",
    "vite":                "6.3.5"
  }
}
```

### 12.5 index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI Usage Tracker · Data Compass</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@600;700
      &family=Inter:wght@400;500;600;700;800
      &family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## 13. Replication Checklist

Build in this order:

- [ ] Scaffold: `npm create vite@latest -- --template react-ts`
- [ ] Install: `recharts`, Tailwind CSS + PostCSS + autoprefixer
- [ ] Configure Tailwind with the `dc.*` color palette
- [ ] Add Google Fonts (Work Sans, Inter, JetBrains Mono) in `index.html`
- [ ] Add global CSS utilities to `index.css` (text-gradient, glass-card, btn-primary, scrollbar)
- [ ] Define all types in `src/types/index.ts`
- [ ] Implement `src/data/researchSources.ts` (10 sources with IDs, publisher, year, URL, relevance)
- [ ] Implement `src/data/benchmarkReferences.ts` (10 use-case benchmarks referencing source IDs)
- [ ] Implement `src/lib/storage.ts` (CRUD, computeStats, classifyBenchmark, computeUserSummaries, generateSeedData, exportCSV, importCSV)
- [ ] Build `LogForm.tsx` (4-step wizard, ChipButton, BenchmarkCard, star picker)
- [ ] Build `Dashboard.tsx` (KPI cards, Recharts bar/pie/radar, use-case table, recent feed)
- [ ] Build `LogHistory.tsx` (entry rows, badge system, delete confirmation)
- [ ] Build `InsightsPanel.tsx` (deriveInsights with all 19 rules, card rendering)
- [ ] Build `UserBreakdown.tsx` (overview table, scatter plot, stage heatmap, tool heatmap)
- [ ] Build `BenchmarkCalibration.tsx` (KPI cards, per-use-case table, entry feed, source list)
- [ ] Wire everything in `App.tsx` (identity gate, tab routing, all handlers, memoised stats)
- [ ] Test edge cases: 0 entries, 1 analyst vs multiple, entries with `timeSavedMinutes=0`, CSV round-trip
- [ ] Adjust `vite.config.ts` base path for your deployment target

---

*Data Compass · AI Usage Tracker*
