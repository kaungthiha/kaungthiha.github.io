export interface ResearchSource {
  id: string;
  title: string;
  publisher: string;
  year: number;
  url: string;
  relevance: string; // one-line summary of what this source supports
}

export const RESEARCH_SOURCES: ResearchSource[] = [
  {
    id: 'github-copilot-2022',
    title: 'GitHub Copilot Research: Quantifying GitHub Copilot\'s Impact on Developer Productivity and Happiness',
    publisher: 'GitHub / ICSME',
    year: 2022,
    url: 'https://github.blog/2022-09-07-research-quantifying-github-copilots-impact-on-developer-productivity-and-happiness/',
    relevance: 'Developers completed tasks 55% faster with Copilot; baseline for code-generation time savings.',
  },
  {
    id: 'mckinsey-productivity-2023',
    title: 'The Economic Potential of Generative AI: The Next Productivity Frontier',
    publisher: 'McKinsey Global Institute',
    year: 2023,
    url: 'https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights/the-economic-potential-of-generative-ai-the-next-productivity-frontier',
    relevance: 'Knowledge worker productivity gains of 20–45% across writing, summarization, and analysis tasks.',
  },
  {
    id: 'stanford-hai-2023',
    title: 'Generative AI at Work',
    publisher: 'Stanford HAI / NBER',
    year: 2023,
    url: 'https://hai.stanford.edu/news/generative-ai-work',
    relevance: 'Customer support workers 14% more productive; largest gains for lower-skilled workers.',
  },
  {
    id: 'mit-whitecollars-2023',
    title: 'Experimental Evidence on the Productivity Effects of Generative Artificial Intelligence',
    publisher: 'MIT / Science',
    year: 2023,
    url: 'https://science.org/doi/10.1126/science.adh2586',
    relevance: 'Writing professionals 37% faster, 18% quality improvement; 40% time savings for complex analytical writing.',
  },
  {
    id: 'nielsen-ux-2023',
    title: 'AI Improves Employee Productivity by 66%',
    publisher: 'Nielsen Norman Group',
    year: 2023,
    url: 'https://www.nngroup.com/articles/ai-tools-productivity/',
    relevance: 'Business professionals 66% faster on writing tasks; verifies self-reported time savings methodology.',
  },
  {
    id: 'accenture-verification-2023',
    title: 'A New Era of Generative AI for Everyone',
    publisher: 'Accenture',
    year: 2023,
    url: 'https://www.accenture.com/us-en/insights/technology/generative-ai',
    relevance: 'Human verification remains critical; 60%+ of enterprise AI outputs require review before use.',
  },
  {
    id: 'delaware-sql-2023',
    title: 'Large Language Models and Code Generation: A Developer Survey',
    publisher: 'University of Delaware / arXiv',
    year: 2023,
    url: 'https://arxiv.org/abs/2308.12950',
    relevance: 'SQL / query generation: 45–70% reduction in write time, but 85% of queries need correctness review.',
  },
  {
    id: 'deloitte-analytics-2024',
    title: 'Deloitte State of Generative AI in the Enterprise Q1 2024',
    publisher: 'Deloitte',
    year: 2024,
    url: 'https://www2.deloitte.com/us/en/insights/topics/digital-transformation/2024-state-of-generative-ai-enterprise.html',
    relevance: 'Analytics teams self-report 25–50% time savings on data analysis; 68% use AI weekly.',
  },
  {
    id: 'anthropic-enterprise-2024',
    title: 'Anthropic Claude Enterprise Case Studies',
    publisher: 'Anthropic',
    year: 2024,
    url: 'https://www.anthropic.com/customers',
    relevance: 'Knowledge work automation: 30–60% reduction in time on documentation and summarization tasks.',
  },
  {
    id: 'harvard-coding-2023',
    title: 'Navigating the Jagged Technological Frontier: Field Experimental Evidence on the Effects of AI on Knowledge Worker Productivity',
    publisher: 'Harvard Business School',
    year: 2023,
    url: 'https://www.hbs.edu/ris/Publication%20Files/24-013_d9b45b68-9e74-42d6-a1c6-c72fb70c7282.pdf',
    relevance: 'Consultants 25% faster on inside-frontier tasks; quality 40% higher; key benchmark for knowledge work.',
  },
  {
    id: 'bain-finserv-2024',
    title: 'How Financial Services Firms Are Deploying Generative AI',
    publisher: 'Bain & Company',
    year: 2024,
    url: 'https://www.bain.com/insights/how-financial-services-firms-are-deploying-generative-ai/',
    relevance: 'Financial services analysts report 30–40% time savings on report writing and data summarization.',
  },
];
