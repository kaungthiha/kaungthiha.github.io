export type AITool = 'Gemini' | 'ChatGPT' | 'Claude' | 'Claude Code' | 'Copilot' | 'Other';

export type UseCase =
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

// Where in the analyst workflow did this assist occur?
export type WorkflowStage =
  | 'Build'       // writing queries, transformations, code
  | 'Validate'    // checking results, debugging, QA
  | 'Communicate' // writing summaries, decks, docs
  | 'Explore'     // research, scoping, ideation
  | 'Other';

// What did the AI actually produce?
export type AIOutputType =
  | 'Code / query'
  | 'Explanation / breakdown'
  | 'Draft text'
  | 'Edited / improved my text'
  | 'Data interpretation'
  | 'Structured outline'
  | 'Troubleshooting steps'
  | 'Other';

export type VerificationLevel = 'none' | 'light' | 'heavy';
export type ValueRating = 1 | 2 | 3 | 4 | 5;

export interface LogEntry {
  id: string;
  timestamp: string;
  analystName: string;
  tool: AITool;
  useCase: UseCase;
  workflowStage: WorkflowStage;
  outputType: AIOutputType;
  timeSavedMinutes: number;
  valueRating: ValueRating;
  verificationLevel: VerificationLevel;
  wouldUseAgain: boolean;
  wouldStandardize: boolean;
  notes?: string;
}

export interface AggStats {
  totalEntries: number;
  totalTimeSavedHours: number;
  avgValueRating: number;
  byTool: Record<string, number>;
  byUseCase: Record<string, { count: number; timeSaved: number; avgValue: number }>;
  byStage: Record<string, number>;
  byOutputType: Record<string, number>;
  byVerification: Record<VerificationLevel, number>;
  byAnalyst: Record<string, number>;
  standardizeCount: number;
  wouldUseAgainPct: number;
  recentWeekEntries: number;
}
