import { UseCase } from '../types';
import { RESEARCH_SOURCES } from './researchSources';

export interface BenchmarkReference {
  useCase: UseCase;
  lowMinutes: number;   // lower bound of expected time savings range
  highMinutes: number;  // upper bound
  medianMinutes: number;
  confidence: 'high' | 'medium' | 'low';
  caveat: string;
  sourceIds: string[];  // references into RESEARCH_SOURCES
}

export const BENCHMARK_REFERENCES: BenchmarkReference[] = [
  {
    useCase: 'SQL / query writing',
    lowMinutes: 20,
    highMinutes: 75,
    medianMinutes: 45,
    confidence: 'high',
    caveat: 'Range assumes moderate-complexity queries; simple SELECTs sit at the low end; multi-join analytics queries at the high end. Most outputs still need a correctness pass.',
    sourceIds: ['delaware-sql-2023', 'github-copilot-2022', 'deloitte-analytics-2024'],
  },
  {
    useCase: 'Data cleaning / transformation',
    lowMinutes: 15,
    highMinutes: 60,
    medianMinutes: 30,
    confidence: 'medium',
    caveat: 'Highly dependent on data complexity. AI accelerates boilerplate column renaming and reshaping; savings drop for domain-specific cleaning logic.',
    sourceIds: ['mckinsey-productivity-2023', 'deloitte-analytics-2024'],
  },
  {
    useCase: 'Dashboard / viz support',
    lowMinutes: 10,
    highMinutes: 45,
    medianMinutes: 20,
    confidence: 'low',
    caveat: 'Limited controlled research for BI-specific tooling. Savings largely in boilerplate chart config and label copy; design and data decisions remain manual.',
    sourceIds: ['mckinsey-productivity-2023'],
  },
  {
    useCase: 'Report writing / summarization',
    lowMinutes: 25,
    highMinutes: 90,
    medianMinutes: 50,
    confidence: 'high',
    caveat: 'Strong evidence base for writing tasks. AI drafts executive summaries quickly; analysts typically invest 20–30% of original time on tone, structure, and fact-check.',
    sourceIds: ['mit-whitecollars-2023', 'nielsen-ux-2023', 'bain-finserv-2024', 'anthropic-enterprise-2024'],
  },
  {
    useCase: 'Ad-hoc analysis',
    lowMinutes: 15,
    highMinutes: 60,
    medianMinutes: 30,
    confidence: 'medium',
    caveat: 'Savings cluster around hypothesis structuring and initial data pull; final interpretation and stakeholder framing remain high-effort human steps.',
    sourceIds: ['harvard-coding-2023', 'deloitte-analytics-2024'],
  },
  {
    useCase: 'Code review / debugging',
    lowMinutes: 15,
    highMinutes: 50,
    medianMinutes: 25,
    confidence: 'medium',
    caveat: 'Best for explaining unfamiliar code or surfacing obvious errors. AI misses context-specific business logic bugs; heavy review still warranted.',
    sourceIds: ['github-copilot-2022', 'harvard-coding-2023'],
  },
  {
    useCase: 'Documentation',
    lowMinutes: 20,
    highMinutes: 70,
    medianMinutes: 40,
    confidence: 'high',
    caveat: 'High confidence for first-draft generation. Accuracy of auto-generated docs degrades for proprietary systems without explicit context — always review.',
    sourceIds: ['mit-whitecollars-2023', 'anthropic-enterprise-2024', 'mckinsey-productivity-2023'],
  },
  {
    useCase: 'Exploratory research',
    lowMinutes: 10,
    highMinutes: 45,
    medianMinutes: 20,
    confidence: 'low',
    caveat: 'Savings depend heavily on research depth required. AI is fast for landscape overviews; risks hallucinated citations — always verify sources before citing.',
    sourceIds: ['stanford-hai-2023', 'mckinsey-productivity-2023'],
  },
  {
    useCase: 'Meeting prep / notes',
    lowMinutes: 10,
    highMinutes: 35,
    medianMinutes: 18,
    confidence: 'low',
    caveat: 'Limited research for meeting-specific tasks. Savings mainly in agenda drafting and note cleanup; context-setting and discussion capture remain manual.',
    sourceIds: ['nielsen-ux-2023'],
  },
  {
    useCase: 'Other',
    lowMinutes: 10,
    highMinutes: 45,
    medianMinutes: 20,
    confidence: 'low',
    caveat: 'No specific benchmark for miscellaneous tasks. Treat as a general reference range.',
    sourceIds: ['mckinsey-productivity-2023'],
  },
];

export function getBenchmark(useCase: UseCase): BenchmarkReference | undefined {
  return BENCHMARK_REFERENCES.find(b => b.useCase === useCase);
}

export function getSourcesForBenchmark(benchmark: BenchmarkReference): typeof RESEARCH_SOURCES {
  return RESEARCH_SOURCES.filter(s => benchmark.sourceIds.includes(s.id));
}
