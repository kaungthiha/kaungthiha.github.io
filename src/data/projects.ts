/* ──────────────────────────────────────────────────────────────────────
   Create — projects, tools, prototypes, analyses, experiments.

   Single source of truth for the Create section. Descriptions are reconciled
   from the old inline project-modal copy (all verified, public-safe) and the
   redesign brief. Live-tool routes, PDFs, and case-study routes are the exact
   existing URLs so nothing 404s. Images are reused only where a real owned
   asset exists; projects without one render a tasteful neutral placeholder
   (no invented screenshots). See the summary for the image TODO list.
   ────────────────────────────────────────────────────────────────────── */

export type ProjectType =
  | 'Live tool'
  | 'Prototype'
  | 'Product case'
  | 'Analytics'
  | 'AI automation'
  | 'Experiment'
  | 'Case study';

export type ProjectStatus = 'Live' | 'Complete' | 'In progress' | 'Archived';

export interface ProjectLink {
  label: string;
  href: string;
  kind?: 'live' | 'case-study' | 'pdf' | 'github';
}

export interface Project {
  slug: string;
  title: string;
  shortTitle?: string;
  type: ProjectType;
  year?: string;
  status?: ProjectStatus;
  featured?: boolean;
  summary: string;
  problem?: string;
  contribution?: string[];
  outcomes?: string[];
  stack?: string[];
  image?: string;
  imageAlt?: string;
  gallery?: Array<{ src: string; alt: string; caption?: string }>;
  links?: ProjectLink[];
  confidentialityNote?: string;
}

export const projects: Project[] = [
  {
    slug: 'festival-thingamabob',
    title: 'Festival Thingamabob',
    shortTitle: 'Festival Thingamabob',
    type: 'Live tool',
    year: '2025',
    status: 'Live',
    featured: true,
    summary:
      'Plan festival meetups with the squad and build a schedule around the ' +
      'sets nobody wants to miss.',
    problem:
      'Group festival planning is chaos: overlapping sets, must-see artists, ' +
      'and everyone squinting at a grid on their phone.',
    contribution: [
      'Ingests a festival schedule and lets you flag must-see artists.',
      'Optimises an itinerary using weighted interval scheduling under time and distance constraints.',
      'Supports shared group planning so the whole squad converges on one plan.',
    ],
    stack: ['React', 'TypeScript', 'Supabase'],
    links: [
      { label: 'Open the tool', href: '/tools/festival-thingamabob/', kind: 'live' },
    ],
  },
  {
    slug: 'outbuild-learning',
    title: 'Outbuild AI Learning System',
    shortTitle: 'Outbuild Learning',
    type: 'AI automation',
    year: '2025',
    status: 'Complete',
    summary:
      'An automated learning-assessment system that cut new-hire sales ' +
      'onboarding from about four weeks to one.',
    problem:
      'Selling construction software means knowing industry terminology, ' +
      'delivery methods, lean principles, and how pull planning works. New AEs ' +
      'and SDRs historically spent 3–4 weeks self-studying and shadowing before ' +
      'they could sell.',
    contribution: [
      'Combined Claude for quiz generation and grading, Notion as the knowledge base and results hub, Google Forms for delivery, and n8n as the automation layer.',
      'Returned assessment results to an executive dashboard so leadership could see ramp progress.',
    ],
    outcomes: [
      'Shortened onboarding from ~4 weeks to ~1 week, so new hires could start revenue-generating activity sooner.',
    ],
    stack: ['Claude', 'Notion', 'n8n', 'Google Forms', 'JavaScript'],
    image: '/assets/images/Outbuild.jpg',
    imageAlt: 'Outbuild AI learning system',
    gallery: [
      {
        src: '/assets/projects/outbuild_diagram.png',
        alt: 'V1 vs V2 system architecture for the Outbuild learning system',
        caption: 'V1 vs V2 system architecture',
      },
    ],
    links: [
      {
        label: 'Read the write-up (PDF)',
        href: '/assets/projects/Outbuild_AI Learning System_KT.docx.pdf',
        kind: 'pdf',
      },
    ],
  },
  {
    slug: 'askcyborg',
    title: 'AskCyborg',
    type: 'Prototype',
    year: '2023',
    status: 'Archived',
    summary:
      'An AI research assistant for SEC EDGAR filings — ask a question, get a ' +
      'sourced report. Co-founded; I shipped the MVP and owned the roadmap.',
    problem:
      'Financial research buries useful signal inside dense regulatory filings. ' +
      'Analysts spend hours reading EDGAR to answer questions a good assistant ' +
      'could surface in seconds.',
    contribution: [
      'Built a filing ingestion + parsing flow over SEC EDGAR.',
      'Used embeddings and vector retrieval to answer queries and assemble reports.',
      'Ran product discovery and user-feedback loops to shape the roadmap.',
    ],
    outcomes: [
      'Integrating a cloud vector database sped retrieval by roughly 2×.',
    ],
    stack: ['Python', 'Vector DB', 'Embeddings', 'ReportLab', 'Figma'],
    links: [],
  },
  {
    slug: 'ease-dsc',
    title: 'EASE — Debt-Support Flow',
    shortTitle: 'EASE (DSC case study)',
    type: 'Case study',
    year: '2025',
    status: 'Complete',
    summary:
      'An interactive mobile prototype for a debt-support flow — meeting ' +
      'customers in financial distress with a clearer path forward.',
    problem:
      'Customers in financial distress need differentiated help fast, and the ' +
      'flow should also improve how at-risk customers are identified.',
    contribution: [
      'Designed a dashboard home with a financial snapshot and a prompt to get a personalised plan.',
      'Built a smart survey capturing four key signals (payment difficulty, external debt, intent, primary concern) with segmentation logic that routes to the right path.',
      'Laid out three support paths — a payment plan, budgeting tools, and debt-settlement education — with a comparison table and a "rebuild with us" confirmation screen.',
    ],
    stack: ['React', 'Tailwind CSS', 'JavaScript'],
    image: '/assets/images/ease.png',
    imageAlt: 'EASE debt-support flow mobile prototype',
    links: [
      { label: 'Launch the prototype', href: '/pages/dsc-case-study/', kind: 'case-study' },
    ],
    confidentialityNote:
      'An independent UX concept built with public-safe wording and no customer data.',
  },
  {
    slug: 'attendance-tracker',
    title: 'Attendance Tracker',
    type: 'Live tool',
    year: '2025',
    status: 'Live',
    summary:
      'A personal utility for tracking office attendance across rolling ' +
      '13-week periods, with prorated requirements and JSON import/export.',
    problem:
      'Rolling attendance windows with prorated requirements are annoying to ' +
      'track by hand and easy to get wrong.',
    contribution: [
      'Calculates prorated requirements across rolling 13-week periods.',
      'Marks attendance on a calendar and exports/imports state as JSON.',
    ],
    stack: ['JavaScript', 'HTML', 'CSS'],
    links: [
      { label: 'Open the tracker', href: '/tools/attendance-tracker/', kind: 'live' },
    ],
    confidentialityNote:
      'A personal attendance tracker — not an official product of any employer.',
  },
  {
    slug: 'instacart-reddit-pulse',
    title: 'Instacart Reddit Pulse',
    shortTitle: 'Reddit Pulse',
    type: 'Analytics',
    year: '2026',
    status: 'In progress',
    summary:
      'A lightweight tool that reads the Reddit API to surface sentiment and ' +
      'narrative signals, then auto-generates two visuals and a short memo.',
    problem:
      'Emerging narratives about a product live scattered across forums. Reading ' +
      'them all by hand does not scale.',
    contribution: [
      'Pulls posts via the Reddit API and scores sentiment and volume signals.',
      'Auto-generates two visuals and a memo artifact for quick review.',
    ],
    outcomes: [
      'Sample run (Mar 4–11, 2026): 24 posts across 3 subreddits, 66.7% negative, with substitutions / out-of-stock the top pain point.',
    ],
    stack: ['Python', 'Reddit API', 'matplotlib'],
    image: '/assets/images/instacart.jpg',
    imageAlt: 'Instacart Reddit Pulse analysis',
    gallery: [
      {
        src: '/assets/projects/negative_themes.png',
        alt: 'Bar chart of top themes in negative posts',
        caption: 'Top themes in negative posts',
      },
      {
        src: '/assets/projects/sentiment_trend.png',
        alt: 'Line chart of the daily negative-share trend',
        caption: 'Daily negative share trend',
      },
    ],
    links: [
      { label: 'View on GitHub', href: 'https://github.com/kaungthiha', kind: 'github' },
    ],
    confidentialityNote:
      'An independent analysis, not work done for Instacart.',
  },
  {
    slug: 'ai-usage-tracker',
    title: 'AI Usage Tracker',
    type: 'Experiment',
    year: '2025',
    status: 'In progress',
    summary:
      'A proof-of-concept for tracking a team\'s AI usage and adoption signals ' +
      'in one simple dashboard.',
    problem:
      'Teams adopting AI tools rarely have a simple read on who is using what, ' +
      'or whether adoption is actually landing.',
    contribution: [
      'Prototyped a tracker that captures adoption signals and rolls them into a simple view.',
    ],
    stack: ['JavaScript', 'HTML', 'CSS'],
    links: [
      { label: 'Open the tracker', href: '/tools/ai-usage-tracker/', kind: 'live' },
    ],
    confidentialityNote: 'An early proof-of-concept, still a work in progress.',
  },
  {
    slug: 'ewa-proposal',
    title: 'Early Wage Access — Feature Proposal',
    shortTitle: 'Early Wage Access',
    type: 'Product case',
    year: '2025',
    status: 'Complete',
    summary:
      'A product proposal evaluating whether to launch an Early Wage Access ' +
      'feature for construction-tech. Recommendation: a limited pilot.',
    problem:
      'Should a construction-tech product launch Early Wage Access? It needs a ' +
      'clear read on customer value, risk, and how to decide.',
    contribution: [
      'Made the case that EWA aligns with supporting construction workforces and rides the labor-shortage tailwind for differentiated benefits.',
      'Framed a small pilot to limit downside while generating the real-world learning needed for a confident go/no-go.',
      'Laid out risks, success metrics, and the go/no-go framing.',
    ],
    stack: ['Product strategy', 'Market analysis'],
    links: [
      {
        label: 'Read the proposal (PDF)',
        href: '/assets/projects/KT_LumberProposal.pdf',
        kind: 'pdf',
      },
    ],
  },
];
