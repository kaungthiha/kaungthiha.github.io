/* ──────────────────────────────────────────────────────────────────────
   Work — the web-native résumé data.

   Single source of truth for the Work section. Reconciled from the public
   résumé (src/pages/resume.astro), the old homepage "about" copy, and the
   redesign brief's list of public-safe themes. Everything here is meant to be
   public: no phone number, no confidential employer detail, no invented metric.

   Metrics worth emphasising are wrapped in the sentinel **like this** inside
   outcome strings; the component renders those spans as <strong class="metric">.
   ────────────────────────────────────────────────────────────────────── */

export interface WorkRole {
  company: string;
  role: string;
  /** Human date range, e.g. "2025 — Now". Shown as a quiet anchor. */
  dates: string;
  /** Location / work mode, when useful. */
  mode?: string;
  /** One concise scope sentence. */
  scope: string;
  /** Two or three high-value outcomes. Wrap metrics in **double asterisks**. */
  outcomes: string[];
  /** Optional technology / practice labels. */
  tags?: string[];
  /** Optional external link. */
  link?: { label: string; href: string };
  /** Optional public-safe disclaimer, shown quietly. */
  note?: string;
  /** Collapsed under an "Earlier" disclosure when true. */
  earlier?: boolean;
}

/** Short personal statement that opens the Work section (~45–80 words). */
export const workIntro =
  "I'm currently " +
  "an Associate Data Product Analyst at Capital One, on the Data Products & " +
  "Experiences team, and I've previously worked across startups, AI operations, " +
  "fintech, and university systems.";

/**
 * Reference-site-style summary — a few short lines that say what I do, not a
 * blow-by-blow résumé. Each string is one line/clause; the résumé PDF has the
 * detail. Kept lowercase-ish and conversational on purpose.
 */
export const workSummary: string[] = [
  "data & product analytics at capital one — card adoption, usage growth, and the data infra behind it.",
  "before that: rev ops at a construction-tech startup, RLHF Research + Ops at AWS, product ops at a fintech.",
  "co-founded an AI research tool in college — shipped the MVP, owned the roadmap.",
  "mostly data and product, some building. i like tinkering with small things for fun.",
];

/**
 * Work as flowing prose. Each paragraph is a list of parts; a part is either
 * plain text or a { text, detail } highlight. Highlights bold on hover and open
 * the matching workHighlights[detail] entry in the side detail panel.
 */
export type ProsetPart = string | { text: string; detail: string };
export const workProse: ProsetPart[][] = [
  [
    'Currently an Associate Data Product Analyst at ',
    { text: 'Capital One', detail: 'capital-one' },
    ', on the Data Products & Experiences team. Before that: rev ops at a ',
    { text: 'construction-tech startup', detail: 'outbuild' },
    ', RLHF research at ',
    { text: 'AWS', detail: 'aws' },
    ', product ops at a ',
    { text: 'fintech', detail: 'fintech' },
    '.',
  ],
  [
    'Co-founded ',
    { text: 'an AI research tool', detail: 'askcyborg' },
    ' in college — shipped the MVP, owned the roadmap. Mostly data and product, ' +
      'some building. I like shipping small things for fun.',
  ],
];

export interface WorkHighlight {
  title: string;
  body: string[];
  link?: { label: string; href: string };
}

/** Detail content shown when a work highlight is clicked (public-safe). */
export const workHighlights: Record<string, WorkHighlight> = {
  'capital-one': {
    title: 'Capital One',
    body: [
      'Building the mechanisms for driving data product adoption across Card' +
        'while drinking alot of sugary Starbies',
    
    ],
  },
  outbuild: {
    title: 'Outbuild — Revenue Operations',
    body: [
      'Rev Ops and sales enablement at a Series A construction tech' +
        'and learning a lot about scrappy GTM motions' +
    
    ],
  },
  aws: {
    title: 'AWS — RLHF Research & Ops',
    body: [
      'LLM / agentic-model operations.  Exposed to human in the loop learning systems. ' +
        'Signed an NDA though. '
    ],
  },
  fintech: {
    title: 'Wefunder — Product Ops',
    body: [
      'Product operations and compliance at an equity crowdfunding platform. ' +
        'a VIP product from 0 → 547 users, creating $161,365 in new revenue, and ran ' +
  
    ],
  },
  askcyborg: {
    title: 'AskCyborg',
    body: [
      'Co-founded an AI research assistant for SEC EDGAR filings — ask a question, ' +
        'get a sourced report. Shipped the MVP and owned the roadmap through product ' +
        'discovery, using embeddings and vector retrieval to assemble reports.',
    ],
  },
};

export const roles: WorkRole[] = [
  {
    company: 'Capital One',
    role: 'Associate Data Product Analyst · Data Products & Experiences',
    dates: '2025 — Now',
    mode: 'McLean, VA',
    scope:
      'Adoption and usage analytics for the Card line of business, plus the ' +
      'data plumbing and reporting that keeps a usage-growth objective honest.',
    outcomes: [
      'Built Databricks/Python automation that removed **5+ hours/week** of manual validation while cutting script complexity and runtime.',
      'Modeled roughly **1.2 TB** of event data and stitched references across Snowflake, OneLake, and internal APIs for discovery.',
      'Wired QuickSuite reporting to a usage-growth objective, and analysed API + GraphQL usage to inform product decisions.',
    ],
    tags: ['Databricks', 'Python', 'Snowflake', 'QuickSuite', 'GraphQL'],
    note: 'Described at the level already approved for public use — no internal data, code, or systems.',
  },
  {
    company: 'Outbuild',
    role: 'Revenue Operations Analyst',
    dates: '2025',
    mode: 'Remote · construction-tech startup',
    scope:
      'Revenue operations and sales enablement for a Series A construction ' +
      'scheduling SaaS scaling its go-to-market team.',
    outcomes: [
      'Designed an AI-assisted learning system for AEs and SDRs that shortened onboarding from **~4 weeks to ~1 week**.',
      'Automated the flow end-to-end with Claude, Notion, Google Forms, and n8n, returning results to an executive dashboard.',
      'Built HubSpot automations that tightened the revenue-operations funnel.',
    ],
    tags: ['HubSpot', 'Claude', 'n8n', 'Notion', 'JavaScript'],
  },
  {
    company: 'Amazon Web Services (via Keywords Studios)',
    role: 'Research Associate 3 · LLM Operations',
    dates: '2025',
    mode: 'Remote',
    scope:
      'LLM / agentic-model operations — training, evaluating, and quality-' +
      'checking model outputs with a team of annotators.',
    outcomes: [
      'Directed a team of **50+** research associates training and evaluating an AI classification model.',
      'Used Hex dashboards to surface knowledge gaps and error patterns, improving QA pass rate **~5% month-over-month**.',
      'Wrote Python test cases for the agent SDK, mocking and stubbing contributor behaviour to strengthen evaluation workflows.',
    ],
    tags: ['LLMOps', 'Hex', 'Python', 'RLHF'],
  },
  {
    company: 'Wefunder',
    role: 'Closing & Compliance Product Operations',
    dates: '2024',
    mode: 'San Francisco, CA',
    scope:
      'Product operations and compliance for an equity-crowdfunding platform — ' +
      'transaction flow, investor experience, and a new VIP product.',
    outcomes: [
      'Grew a VIP product from **0 → 547** users through a data-driven go-to-market, creating **$161,365** in new revenue.',
      'Managed weekly transaction flow and built SQL ETL that cut cash-flow turnaround, improving trust across 500+ active campaigns.',
      'Ran A/B tests and market analysis that lifted investor engagement and improved NPS.',
    ],
    tags: ['Product Ops', 'SQL', 'A/B Testing', 'Compliance'],
  },
  {
    company: 'AskCyborg (CrossWork)',
    role: 'Co-Founder & Product Manager',
    dates: '2023',
    mode: 'San Francisco, CA',
    scope:
      'An AI-powered SEC EDGAR research product — I shipped the MVP and owned ' +
      'the roadmap.',
    outcomes: [
      'Shipped an AI-powered MVP and owned the product roadmap using user-feedback loops.',
      'Integrated a cloud vector database with engineers to speed data retrieval by roughly **2×**.',
      'Coordinated three UI/UX contractors on Figma demos to overhaul the product visual language.',
    ],
    tags: ['Product', 'Python', 'Vector Search', 'Embeddings', 'Figma'],
  },
  {
    company: 'University of San Francisco · ITS',
    role: 'Salesforce Product Administrator',
    dates: '2022 — 2023',
    mode: 'San Francisco, CA',
    scope:
      'Salesforce administration for the university, plus Agile facilitation ' +
      'for a small development team.',
    outcomes: [
      'Administered Salesforce for **10,000+** users, restructuring objects to reduce license costs by **33%**.',
      'Led cross-functional Agile ceremonies as Scrum master for 10 developers and analysts, managing backlogs in Jira.',
    ],
    tags: ['Salesforce', 'Scrum', 'Jira'],
  },
  // ── Earlier (collapsed) ──────────────────────────────────────────────
  {
    company: 'Alpha Phi Omega · Service Fraternity',
    role: 'Finance Chair & Pledge Trainer',
    dates: '2021 — 2024',
    scope: 'Fundraising strategy and recruitment for a campus service fraternity.',
    outcomes: [
      'Raised **$2,000+** for charity in partnership with Chipotle and local businesses.',
      'Grew international-student presence by **30%** through recruitment and community engagement.',
    ],
    earlier: true,
  },
  {
    company: 'USF Fiscal Affairs Council',
    role: 'Chair of Annual Budget · Investment Task Force',
    dates: '2021 — 2022',
    scope: 'Oversight of the student-organization budget during a lean stretch.',
    outcomes: [
      'Revised and oversaw a **$1.6M** budget for student organizations through COVID-19 and declining enrollment.',
      'Researched alternative investment vehicles before the Fiscal portfolio adopted money-market accounts.',
    ],
    earlier: true,
  },
];

/** Compact editorial skills line, grouped — not a card grid. */
export const skills: Array<{ group: string; items: string[] }> = [
  {
    group: 'Product',
    items: ['PRDs', 'product analytics', 'A/B testing', 'stakeholder management'],
  },
  {
    group: 'Data',
    items: ['SQL', 'Python', 'Snowflake', 'Databricks', 'QuickSuite', 'Tableau', 'R'],
  },
  {
    group: 'Building',
    items: ['Astro', 'JavaScript / TypeScript', 'AI coding agents', 'n8n'],
  },
];

/** Résumé download. TODO: add the real PDF at this path (see summary). */
export const resumeHref = '/assets/Kaung_Thiha_Resume.pdf';
