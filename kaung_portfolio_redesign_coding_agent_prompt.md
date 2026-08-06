# Kaung Thiha Portfolio Redesign — Coding Agent Brief and Implementation Prompt

**Target site:** https://kaungthiha.github.io/  
**Reference site:** https://www.charliekubal.com/  
**Repository:** `kaungthiha/kaungthiha.github.io`  
**Primary goal:** Preserve the existing tree-driven landing experience and weather-aware visual system, while fully replacing the content area below the landing with a cleaner **Work / Create / Loves** experience inspired by the reference site's information architecture.

---

## 1. How to Use This File

This document contains:

1. A short set of decisions for Kaung to confirm.
2. Recommended defaults so implementation can begin without waiting.
3. A complete prompt that can be pasted into a coding agent from the repository root.
4. Detailed UX, content, engineering, accessibility, testing, and acceptance requirements.

### Recommended workflow

1. Review the questions in the next section.
2. Replace any defaults that should change.
3. Give the entire **Coding Agent Prompt** section to the coding agent.
4. Have the agent create a feature branch and implement the redesign.
5. Review the first pass at desktop and mobile sizes before polishing content and imagery.

---

# 2. Questions for Kaung

Answer only the questions whose recommended defaults you want to change. The coding agent can proceed with the defaults for everything else.

## A. Navigation and landing

### 1. Should the three section labels be exactly lowercase `work`, `create`, and `loves`?

**Recommended default:** Yes. Use lowercase labels to retain the understated editorial feeling of the reference site.

### 2. Should the initial landing remain visually and structurally unchanged?

**Recommended default:** Preserve all major elements:

- Portrait
- “I’m Kaung (ကောင်းသီဟ)” heading
- Live Arlington weather text
- LinkedIn and Spotify links
- Existing forest scene
- Weather-responsive colors and effects
- Existing transition from the landing into the content area

Only make small integration changes if necessary:

- Change the scroll cue from `the work` to `explore`
- Replace the current top navigation labels with `work`, `create`, and `loves`
- Update active-section behavior

### 3. Should the main navigation stay visible while browsing the content area?

**Recommended default:** Yes. Keep it sticky and subtle after the user leaves the hero. Do not make it visually heavier than the content.

---

## B. Work section

### 4. How much of the resume should appear?

Choose one:

- **Selective:** 4–5 roles, one short paragraph and 1–2 outcomes each
- **Balanced:** All major roles, 2–3 concise outcomes each
- **Full:** Nearly all resume bullets and skills

**Recommended default:** Balanced. Include Capital One, Outbuild, AWS/Keywords Studios, Wefunder, AskCyborg/CrossWork, and USF ITS. Put older or less relevant experience behind an “Earlier work” disclosure if needed.

### 5. Should the Work section link to a downloadable resume PDF?

**Recommended default:** Yes. Include a quiet `Download résumé` link near the Work heading and another at the end of the timeline.

### 6. Should phone number and email appear directly on the page?

**Recommended default:** Show email, LinkedIn, and GitHub. Do not show the phone number on the website unless explicitly requested.

### 7. How much current-employer detail should be shown?

**Recommended default:** Use only information already approved for the public resume or already present on the public site. Do not expose internal screenshots, source code, company data, customer data, proprietary system names beyond what is already public, or confidential implementation details.

---

## C. Create section

### 8. Which projects should be featured, and in what order?

**Recommended starting order:**

1. SheepHerder / Festival Thingamabob
2. Outbuild AI Learning System
3. AskCyborg
4. EASE / DSC Case Study
5. Capital One Attendance Tracker
6. Instacart Reddit Pulse
7. AI Usage Tracker
8. Early Wage Access Feature Proposal

This list should be data-driven and easy to reorder.

### 9. Should “tools for friends” and formal projects remain separate?

**Recommended default:** No. Combine them under `Create`, but visually identify each item with a type such as:

- Live tool
- Product prototype
- Case study
- Analytics project
- AI automation
- Experiment

### 10. Should project details open in a modal, expand inline, or navigate to separate pages?

**Recommended default:**

- Desktop: project index on the left and active project detail on the right
- Mobile: accessible stacked project cards or accordions
- Preserve direct links to live tools, PDFs, GitHub repositories, and dedicated case-study pages
- Avoid making a modal the only way to read project details
- A lightweight image lightbox may remain for diagrams

### 11. Do you have project screenshots or hero images for every project?

**Recommended default:** Reuse existing images first. For missing assets, create clearly labeled placeholders or a content checklist—do not generate fake product screenshots or invent results.

---

## D. Loves section

### 12. What categories should appear in Loves?

**Recommended starting categories based on the site's current content and known interests:**

- Music
- Books
- Cooking and food
- Games, worlds, and lore
- Languages and learning
- Places and experiences
- Tools or objects with excellent design

Do not include people, private relationships, or personal photos unless explicitly provided and approved.

### 13. What should each slide contain?

**Recommended default:**

- One strong image or a restrained two-image collage
- Category label
- Item title
- One short personal caption explaining why Kaung loves it
- Optional link
- Optional `currently loving` badge

### 14. Should the slideshow autoplay?

**Recommended default:** No. Use manual controls, keyboard navigation, and touch swiping. Autoplay would conflict with the calm visual style and accessibility goals.

### 15. What happens to the current “Currently…” section?

**Recommended default:** Fold it into Loves as a small `Currently loving` row or as badges on relevant slides. Remove the old three-card “Currently…” layout.

---

## E. Voice and content

### 16. Should the playful personal voice remain?

**Recommended default:** Yes. Preserve lines that sound distinctly like Kaung, including the dry humor and conversational phrasing. The site should feel human and curious, not like a corporate résumé template.

### 17. Should the longer biography remain?

**Recommended default:** Condense it into a short introduction at the beginning of Work and a small closing note. Remove the current Work/Context card flip and the standalone long-form “Context” face.

---

# 3. Confirmed Design Direction

Use these requirements unless Kaung overrides them.

## Preserve

- The complete first-screen landing experience
- The tree and forest motif
- Weather-aware Arlington status
- Weather-responsive atmosphere and themes
- Glass surfaces
- Soft gradients
- Light-blue atmospheric palette
- Calm, semi-transparent visual language
- Slightly playful but professional tone
- Static GitHub Pages deployment
- Astro architecture
- Existing live tool URLs
- Existing project URLs and PDFs
- Existing GoatCounter analytics
- Existing SEO metadata foundation
- Existing reduced-motion support
- Existing WebGL fallback behavior
- Existing ripple effect, unless it conflicts with usability

## Replace

Replace the entire current content experience below the initial landing, including:

- The flippable Work/Context card shell
- The “Me / Tools for Friends / Projects / Currently…” navigation model
- The slim flip-control sidebar
- The front/back card-face interaction
- The current tool-card grid
- The current project-card grid as the primary navigation
- The standalone long biography face
- The standalone “Currently…” three-card section

## New structure

The content area below the landing becomes one coherent editorial portfolio surface with three primary sections:

1. **Work** — a web-native, selective résumé
2. **Create** — projects, tools, experiments, and case studies
3. **Loves** — a manually controlled visual slideshow of interests and taste

---

# 4. Coding Agent Prompt

Copy everything from this point through the end of the document into the coding agent.

---

<role>

You are a senior frontend engineer and product-minded interaction designer working inside an existing personal portfolio repository.

Your task is to redesign the portfolio content area below the landing screen. You must understand the current implementation before editing. Preserve the site's existing identity, forest scene, weather integration, static deployment, accessibility foundation, and playful voice.

Do not clone the reference site. Use its simple `work / create / think` information architecture and editorial restraint as inspiration, then reinterpret it using Kaung's existing glass, gradient, tree, weather, and light-blue visual language.

</role>

<project>

Repository: `kaungthiha/kaungthiha.github.io`

Production URL: `https://kaungthiha.github.io/`

Reference URL: `https://www.charliekubal.com/`

Current stack includes:

- Astro static site
- GitHub Pages
- Three.js
- `@dgreenheck/ez-tree`
- Plain CSS
- Lightweight inline or client-side JavaScript
- Static live tools under `public/tools/`
- Existing weather scripts and weather-driven page themes
- GoatCounter analytics

Important repository facts:

- The GitHub Pages site is served from the apex root.
- Do not add an Astro `base` path.
- Production output must remain static.
- Existing absolute internal URLs beginning with `/` must continue to resolve.
- `src/pages/index.astro` is the homepage source.
- `src/layouts/Base.astro` owns global metadata, weather backdrops, global scripts, and non-home navigation.
- The main homepage styling currently lives primarily in `public/assets/css/editorial.css`.
- The forest is dynamically imported from `src/scripts/forest` and initialized only when the homepage forest host exists.
- Existing tools are prebuilt static apps copied through `public/tools/`.
- Do not hand-edit generated output or legacy duplicate files when an Astro source file is the source of truth. Inspect deployment configuration and only update generated files if the repository's actual deployment workflow explicitly requires it.

</project>

<objective>

Preserve the initial landing screen—portrait, name, Burmese name, Arlington weather text, social icons, atmospheric forest, and weather behavior—while completely redesigning the main content area below it.

The new main content area must be organized into:

- `work`
- `create`
- `loves`

The result should feel:

- Personal
- Editorial
- Calm
- Deliberate
- Curious
- Product-minded
- Visually atmospheric
- Easier to scan than the current card wall
- More expressive than a standard résumé site

The result must not feel:

- Like a direct clone of the reference
- Like a generic SaaS dashboard
- Like a dense résumé template
- Like a component-library demo
- Like a gaming interface
- Like a heavy 3D showcase
- Like a page made of dozens of disconnected cards

</objective>

<non_negotiable_preservation_requirements>

Do not materially redesign the first-screen landing experience.

Preserve:

1. The existing full-screen hero.
2. The current portrait.
3. The “I'm Kaung (ကောင်းသီဟ)” identity.
4. The live weather text for Arlington, Virginia.
5. LinkedIn and Spotify links.
6. The forest canvas host and lazy-loaded forest bundle.
7. Weather-based color and backdrop behavior.
8. The existing soft, light-blue, glass-and-gradient visual language.
9. Static GitHub Pages compatibility.
10. GoatCounter.
11. Existing live-tool routes.
12. Existing case-study and project routes.
13. Reduced-motion behavior.
14. Keyboard accessibility.
15. WebGL fallback behavior.
16. The site's overall playful, conversational voice.

Small landing integration changes are allowed:

- Change the scroll-cue label from `the work` to `explore`.
- Replace the current homepage nav items with `work`, `create`, and `loves`.
- Update active-section state and hash routing.
- Make small spacing adjustments needed to connect the hero to the redesigned content.

Do not rebuild the forest as part of this task. Only make forest changes if necessary to preserve contrast or compatibility with the new content surface.

</non_negotiable_preservation_requirements>

<remove_or_replace>

Remove or retire the following homepage patterns:

- The Work/Context 3D card flip
- The narrow flip-control sidebar
- The `Me!` / `Back to the work` controls
- The mobile Work/Context segmented control
- Front-face and back-face routing
- The current `Me / Tools for Friends / Projects / Currently...` navigation
- The existing content grid as the main navigation model
- The standalone “Currently…” card grid
- Fixed-height or independently scrolling card faces, if present
- Any inactive-face tabindex manipulation made obsolete by removing the flip interaction

Do not leave dead CSS, dead event handlers, obsolete ARIA attributes, or unused selectors after the refactor.

</remove_or_replace>

<information_architecture>

Use one content stage below the hero:

```text
Hero landing
  ↓
Portfolio content stage
  ├── Section switcher: work / create / loves
  ├── Work section
  ├── Create section
  └── Loves section
Footer / contact
```

The content stage should read as one designed environment rather than three unrelated pages.

Recommended desktop behavior:

- A large centered glass editorial surface
- Maximum content width around 1120–1200px
- A sticky or semi-sticky section switcher near the top
- Natural document height; avoid a fixed-height inner scroll container
- Calm transition between sections
- Forest remains visible around and subtly behind the surface
- Strong reading contrast in the center

Recommended mobile behavior:

- Full-width surface with comfortable side gutters
- Sticky compact section switcher
- No horizontal overflow
- Native vertical page scrolling
- Touch-friendly controls
- Loves carousel supports native swiping
- All content remains available without hover

</information_architecture>

<section_navigation>

Create a three-item navigation control:

```text
work | create | loves
```

Requirements:

- Lowercase labels by default
- Use semantic buttons or links
- Reflect the active section visually without oversized pills
- Update the URL hash:
  - `#work`
  - `#create`
  - `#loves`
- Loading a hash should open the correct section
- Browser back and forward buttons should work
- Clicking the homepage top navigation while the hero is visible should:
  1. Scroll to the content stage
  2. Activate the requested section
- Preserve focus after switching
- Announce meaningful state changes to assistive technology where appropriate
- Support left/right arrow-key movement when implemented as an ARIA tablist
- Support Home and End keys when implemented as an ARIA tablist
- Do not require JavaScript for the user to access all core content if avoidable
- Respect `prefers-reduced-motion`

Use restrained active-state treatment, such as:

- Underline
- Small dot
- Weight change
- Subtle gradient line
- Slight opacity change

Avoid:

- Large dashboard-style tab pills
- Neon glow
- Bouncy spring animations
- A second 3D flip effect

</section_navigation>

<work_section>

## Purpose

Present a web-native version of Kaung's résumé using the reference site's concise, human structure rather than reproducing a one-page PDF.

## Recommended opening

Use a short personal statement, approximately 45–80 words, that communicates:

- Kaung works at the intersection of product, data, and AI.
- He likes turning ambiguous questions into useful products, analyses, or workflows.
- He is currently an Associate Data Product Analyst on Capital One's Data Products & Experiences team.
- His background spans product analytics, operations, startups, and AI systems.

Preserve Kaung's conversational voice. Avoid buzzword stacking.

Possible direction, to be edited rather than blindly copied:

> I work where product, data, and AI overlap—usually turning a messy question into a useful analysis, workflow, or small product. I’m currently an Associate Data Product Analyst at Capital One, and I’ve previously worked across startups, AI operations, fintech, and university systems.

## Work layout

Use a vertical editorial timeline or stacked role list. It should feel closer to a thoughtfully annotated career history than a résumé table.

Each role entry should support:

- Company
- Role
- Dates
- Location or work mode, when useful
- One concise scope sentence
- Two or three high-value outcomes
- Optional technology or practice labels
- Optional external link
- Optional `selected work` disclosure for supporting details

Recommended role order:

1. Capital One
2. Outbuild
3. Amazon Web Services / Keywords Studios
4. Wefunder
5. AskCyborg / CrossWork
6. University of San Francisco ITS

Optionally place older internships or university leadership under a collapsed `Earlier` section.

## Content guidance

Use the latest approved public résumé as the source of truth. Reconcile conflicting old versions instead of combining every bullet.

### Capital One

Public-safe themes may include:

- Adoption and usage analytics for the Card line of business
- QuickSuite reporting tied to a usage-growth objective
- Databricks/Python automation that removed more than 5 hours of weekly validation
- Reference discovery across Snowflake, OneLake, and APIs
- A data model handling approximately 1.2 TB of event data
- Lower script complexity and runtime
- API and GraphQL usage analysis

Do not expose proprietary code, internal screenshots, internal datasets, customer information, confidential architecture, or private company documentation.

### Outbuild

Themes may include:

- Revenue operations and HubSpot automation
- AI-assisted learning system for AEs and SDRs
- Notion, Claude, JavaScript, Google Forms, and n8n
- Onboarding shortened from approximately four weeks to one week

### AWS / Keywords Studios

Themes may include:

- LLM operations
- RLHF or agentic-model operations
- Hex dashboards for more than 50 annotators
- Workflow and quality pattern analysis
- Approximately 5% week-over-week pass-rate improvement, if still approved for public use

### Wefunder

Themes may include:

- Product operations and compliance
- VIP program launched from 0 to 547 users
- $161,365 in revenue
- A/B testing and market analysis
- Improved investor engagement and NPS
- Weekly transaction or disbursement operations, when approved for public use

### AskCyborg / CrossWork

Themes may include:

- AI-powered SEC EDGAR research product
- Shipped MVP
- Product roadmap and user feedback
- Python filing parser, embeddings, vector search, and report flow
- Faster retrieval after cloud-vector-database integration

### USF ITS

Themes may include:

- Salesforce administration for 10,000+ users
- Dashboards, reports, and object restructuring
- License savings
- Scrum facilitation
- OneCard or system integration work

## Metrics treatment

Kaung prefers relevant metrics to stand out.

In the website:

- Use semantic `<strong>` or a restrained `.metric` style.
- Bold only meaningful numbers and outcomes.
- Do not turn every metric into a bright KPI tile.
- Avoid a dashboard-like wall of numbers.

Examples:

- **5+ hours/week**
- **1.2 TB**
- **87%**
- **33%**
- **0 → 547**
- **$161,365**
- **4 weeks → ~1 week**

## Skills

Do not reproduce the current three-card skills grid.

Instead use a compact editorial skills line or grouped list near the end of Work:

```text
Product: PRDs, product analytics, A/B testing, stakeholder management
Data: SQL, Python, Snowflake, Databricks, QuickSuite, Tableau
Building: Astro, JavaScript/TypeScript, React, AI coding agents, n8n
```

Keep the list current and concise.

## Résumé download

Include:

- `Download résumé`
- Open in a new tab or download predictably
- Use the most current public PDF
- If the file is missing, add a clearly named TODO rather than silently linking to an outdated file
- Do not display Kaung's phone number on the page unless it is explicitly approved

</work_section>

<create_section>

## Purpose

Bring tools, projects, prototypes, analyses, and experiments into one coherent `Create` section.

This section should communicate that Kaung builds across product, analytics, AI automation, and small utilities—not that every item is a polished commercial product.

## Do not preserve the old split

Do not retain separate top-level buckets for:

- Tools for Friends
- Formal Projects

Instead, combine all work under Create and use lightweight type labels.

Suggested type vocabulary:

- Live tool
- Prototype
- Product case
- Analytics
- AI automation
- Experiment
- Case study

## Recommended desktop layout

Use an editorial master-detail pattern:

```text
Left column or upper rail:
  Project index
  - project title
  - type
  - year/status

Right column or lower detail:
  Active project
  - title
  - concise summary
  - image or diagram
  - problem
  - what Kaung did
  - result or learning
  - stack
  - links
```

Alternative acceptable layout:

- Large, vertically stacked project stories with a compact sticky index

Do not default to a uniform three-column card grid.

## Recommended mobile layout

Use one of:

- Stacked project stories
- Accessible accordions
- Compact project cards that expand inline

Do not force the desktop master-detail layout into a cramped horizontal mobile interface.

## Candidate project inventory

Create a central data structure for projects. Recommended starting inventory:

### 1. SheepHerder / Festival Thingamabob

Possible display title: `SheepHerder`

Type: Live tool  
Themes:

- Festival schedule ingestion
- Must-see artist selection
- Itinerary optimization
- Weighted interval scheduling
- Distance and time constraints
- Shared group planning
- React, TypeScript, Supabase
- 30+ organic users in the first day, if approved for public display

Preserve the current live-tool route if it is the deployed version.

### 2. Outbuild AI Learning System

Type: AI automation / sales enablement  
Themes:

- Construction-tech onboarding
- Knowledge base to generated assessments
- Claude, Notion, JavaScript, n8n, Google Forms
- Results returned to an executive dashboard
- Approximately four weeks to one week onboarding improvement

Reuse the existing diagram and PDF when available.

### 3. AskCyborg

Type: Product prototype / AI  
Themes:

- SEC EDGAR research assistant
- Filing ingestion
- Embeddings and vector retrieval
- Query-to-report flow
- Product discovery and user feedback
- Python, Pinecone or cloud vector database, ReportLab, Figma
- Retrieval speed improvement, if approved

### 4. EASE / DSC Case Study

Type: Product prototype / UX case study  
Themes:

- Financial-distress support flow
- Smart survey
- Signal capture
- Segmented support paths
- Payment plan, budgeting, and debt-settlement education
- React/Tailwind or standalone interactive prototype
- Link to the existing case-study route

Use public-safe wording and no customer data.

### 5. Attendance Tracker

Possible display title: `Attendance Tracker`

Type: Live tool  
Themes:

- Rolling 13-week attendance periods
- Prorated requirements
- Calendar marking
- JSON import/export
- Personal utility used by a small group

Avoid implying that it is an official Capital One product. Use a neutral label such as `Personal attendance tracker`.

### 6. Instacart Reddit Pulse

Type: Product analytics / experiment  
Themes:

- Reddit API
- Sentiment and narrative signals
- Lightweight memo artifact
- Trend visualization
- Product recommendations
- Clearly label the project as an independent analysis, not work for Instacart

### 7. AI Usage Tracker

Type: Experiment / internal-tool concept  
Themes:

- Team AI-usage tracking proof of concept
- Adoption signals
- Simple dashboard or tracker
- Be explicit if the project is incomplete

### 8. Early Wage Access Feature Proposal

Type: Product case  
Themes:

- Construction-tech use case
- Market and customer rationale
- Pilot recommendation
- Risks, success metrics, and go/no-go framing
- Link to the existing PDF

## Project data model

Create one source of truth, for example:

```ts
export interface Project {
  slug: string;
  title: string;
  shortTitle?: string;
  type: 'Live tool' | 'Prototype' | 'Product case' | 'Analytics' | 'AI automation' | 'Experiment' | 'Case study';
  year?: string;
  status?: 'Live' | 'Complete' | 'In progress' | 'Archived';
  featured?: boolean;
  summary: string;
  problem?: string;
  contribution?: string[];
  outcomes?: string[];
  stack?: string[];
  image?: string;
  imageAlt?: string;
  gallery?: Array<{
    src: string;
    alt: string;
    caption?: string;
  }>;
  links?: Array<{
    label: string;
    href: string;
    kind?: 'live' | 'case-study' | 'pdf' | 'github';
  }>;
  confidentialityNote?: string;
}
```

The exact filename is your choice, but prefer a maintainable location such as:

```text
src/data/projects.ts
```

or:

```text
src/content/projects/
```

Do not keep large project descriptions embedded inside inline JavaScript strings in `index.astro`.

## Project interaction requirements

- Every project must be reachable by keyboard.
- The active state must not rely only on color.
- Project details must remain in the DOM or be rendered accessibly.
- External links must be clearly identified.
- Preserve existing direct URLs.
- Project images must have meaningful alt text.
- Do not invent screenshots, user counts, outcomes, employer endorsements, or metrics.
- If content is missing, surface it as a TODO in the implementation summary.
- Do not make hover mandatory.
- If a lightbox remains, trap focus correctly and restore focus on close.
- Escape must close dialogs.
- Background scrolling must be managed without breaking page position.
- Prefer native `<dialog>` only if it is styled and tested consistently; otherwise implement robust dialog semantics.

</create_section>

<loves_section>

## Purpose

Replace the reference site's `think` concept with a personal `loves` section—a visual, manually controlled slideshow that communicates Kaung's taste, curiosity, and personality.

The section is not a generic list of hobbies. Each item should answer:

> Why does this matter to Kaung?

## Recommended visual concept

A large horizontal slideshow inside the glass editorial surface.

Each slide should include:

- Category label
- Item title
- One short personal caption
- One strong image or a restrained collage
- Optional external link
- Optional `currently loving` marker
- Slide number, such as `03 / 08`

Desktop:

- Main active slide occupies most of the content width
- A small portion of the next slide may peek in
- Previous/next controls sit outside the image when possible
- Text remains readable against all media
- Use asymmetry and editorial spacing, not a generic image-card carousel

Mobile:

- Native swipe
- CSS scroll snap
- Buttons remain available
- Text appears below the image when overlay contrast would be weak
- No tiny pagination dots as the only location indicator

## Recommended categories

Start with placeholder data for the following categories, but do not invent final items or captions:

1. Music
2. Books
3. Cooking and food
4. Games, worlds, and lore
5. Languages and learning
6. Places and experiences
7. Tools or objects with excellent design

Potential current-site items that may be migrated only after verification:

- Books currently being read
- Warhammer 40K lore
- Japanese language learning
- Cooking
- Music and Spotify listening
- Product-management case studies

## Data model

Create one source of truth, for example:

```ts
export interface LoveItem {
  id: string;
  category: string;
  title: string;
  caption: string;
  image: string;
  imageAlt: string;
  href?: string;
  currently?: boolean;
  credit?: string;
}
```

Recommended location:

```text
src/data/loves.ts
```

Images should live under a predictable path such as:

```text
public/assets/images/loves/
```

## Slideshow behavior

Use manual navigation only.

Required controls:

- Previous
- Next
- Current position
- Keyboard left/right
- Touch swipe or native horizontal scroll
- Optional clickable slide index

Preferred implementation:

- CSS scroll snap plus minimal JavaScript for control synchronization
- Or a small custom carousel with no third-party dependency

Do not add a heavy carousel library.

Do not autoplay.

Do not infinitely loop unless focus, screen-reader position, and URL behavior remain understandable.

Pause all nonessential motion under `prefers-reduced-motion`.

## Imagery rules

- Reuse images Kaung owns or has permission to display.
- For books, albums, films, or products, consider linking out and using properly attributed or user-provided imagery.
- Do not scrape and hotlink arbitrary full-resolution images.
- Store local optimized copies when usage rights permit.
- Include credits when needed.
- Do not use fake AI-generated product or travel photographs as substitutes for missing personal assets.
- If final images are unavailable, create a content checklist and tasteful neutral placeholders.

## “Currently” migration

Remove the old “Currently…” grid.

Optionally add a small line above the slideshow:

```text
currently loving
Japanese study · [book title] · [show or topic]
```

This should be driven by the same Loves data rather than duplicated hard-coded content.

</loves_section>

<visual_system>

## Overall visual direction

Retain the existing atmospheric system:

- Soft blues
- Translucent surfaces
- Weather-responsive gradients
- Semi-transparent forest
- Calm depth
- Slight playfulness
- Strong readability

The new content should feel like a translucent editorial object placed inside the existing world.

## Glass surface

Use one dominant content surface rather than many equally prominent glass cards.

Suggested direction:

```css
--surface-bg: rgba(245, 251, 255, 0.72);
--surface-border: rgba(255, 255, 255, 0.56);
--surface-shadow: 0 24px 80px rgba(31, 65, 85, 0.13);
--surface-blur: 22px;
--surface-radius: 28px;
```

These are starting points, not hard-coded mandates. Adapt per weather theme.

Requirements:

- Maintain WCAG-readable text contrast.
- Do not rely on backdrop blur alone.
- Provide a sensible fallback if `backdrop-filter` is unsupported.
- Increase surface opacity under visually busy weather states.
- Preserve forest visibility around the edges.
- Keep the center reading area calm.

## Gradients

Use gradients as atmosphere and edge treatment, not as decoration on every component.

Good uses:

- Surface edge glow
- Active navigation underline
- Large media wash
- Section transition background
- Weather-aware accents

Avoid:

- Gradient text on body copy
- Bright rainbow borders
- Multiple competing gradients
- High-saturation purple/blue SaaS styling

## Typography

Use the existing typography unless there is a strong reason to change it.

If adjusting typography:

- Do not add multiple webfont families.
- Prefer system or existing fonts.
- Use a clear display/body hierarchy.
- Keep body copy around 16–18px.
- Keep readable line lengths around 60–75 characters.
- Use large headings sparingly.
- Let lowercase section labels remain understated.

Suggested hierarchy:

```text
Hero name: existing
Section navigation: 14–16px
Section headline: clamp(2rem, 4vw, 4rem)
Section intro: 18–22px
Role/project title: 20–28px
Body: 16–18px
Metadata: 12–14px
```

## Spacing

Use a consistent spacing system based on approximately:

```text
4, 8, 12, 16, 24, 32, 48, 64, 96
```

Allow generous vertical space between major stories.

Avoid compressing every role and project into small cards.

## Borders and radii

- One dominant large radius for the main surface
- Smaller radii for images and controls
- Fine translucent borders
- Avoid nesting three rounded rectangles inside one another
- Do not make every text block a card

## Weather themes

The content surface must remain compatible with:

- Day/light
- Dawn
- Dusk
- Night/dark
- Sunny
- Clear
- Cloudy
- Rainy
- Stormy
- Snowy
- Foggy
- Windy
- Hot
- Cold

Audit every theme rather than styling only the default screenshot.

</visual_system>

<motion_and_transition>

Use motion to orient the user, not entertain them.

Recommended:

- Section fade and slight vertical translation
- 180–260ms duration
- Ease-out
- Navigation underline transition
- Subtle image reveal
- Carousel snapping

Avoid:

- 3D card flips
- Overshoot springs
- Continuous floating content
- Parallax that competes with the forest
- Autoplay
- Large scroll-jacking effects
- Delayed interactions

Under `prefers-reduced-motion: reduce`:

- Remove section translation
- Use instant or near-instant section changes
- Disable smooth carousel animation
- Preserve content and controls
- Keep forest behavior consistent with the site's current reduced-motion logic

</motion_and_transition>

<responsive_requirements>

Test at minimum:

- 360 × 800
- 390 × 844
- 768 × 1024
- 1024 × 768
- 1280 × 800
- 1440 × 900
- 1920 × 1080

## Desktop

- Content surface max width around 1120–1200px
- Work timeline has comfortable text width
- Create may use two-column master-detail
- Loves has a large visual slide
- Forest framing remains visible
- No fixed content height

## Tablet

- Create may collapse into stacked project stories
- Work timeline remains readable
- Loves controls remain outside tap-conflict zones
- Navigation does not wrap awkwardly

## Mobile

- No content wider than viewport
- Main surface can reduce or remove outer radius at very small widths
- Section switcher remains reachable
- Minimum touch target approximately 44px
- Loves supports native swiping
- Project details are not hidden behind hover
- Images use stable aspect ratios to prevent layout shift
- Text overlays move below images when contrast is uncertain
- Do not render a reduced miniature version of the desktop master-detail layout

</responsive_requirements>

<accessibility>

Meet or exceed the current site's accessibility level.

Required:

- Semantic landmarks
- One clear `<h1>`
- Logical heading hierarchy
- Keyboard-operable section switcher
- Keyboard-operable project selection
- Keyboard-operable carousel
- Visible focus states
- Skip link remains functional
- Meaningful image alt text
- Decorative forest remains `aria-hidden`
- Dialog focus trapping when dialogs are used
- Focus restoration after closing a dialog
- Escape closes dialogs
- Hash navigation does not place focus behind sticky headers
- Active states do not rely only on color
- Sufficient contrast in every weather theme
- Reduced-motion support
- Screen-reader-friendly carousel labels, such as:
  - `Slide 2 of 7`
  - `Next item`
  - `Previous item`
- No inaccessible custom scrollbars
- No content hidden solely through `display:none` when it should be indexed or progressively accessible without a fallback
- Do not remove focus outlines unless replaced with an equally visible focus style

Use ARIA only where native HTML is insufficient.

</accessibility>

<performance>

The redesigned content must not materially worsen first-load performance.

Requirements:

- Preserve the current lazy dynamic import of the forest bundle.
- Do not import Three.js into the main content bundle.
- Do not add React, Vue, Svelte, or a large client framework solely for the tabs or carousel.
- Prefer Astro, HTML, CSS, and small TypeScript/JavaScript modules.
- Do not add a third-party carousel library.
- Lazy-load below-the-fold project and Loves images.
- Use explicit image dimensions or aspect ratios.
- Use responsive images where practical.
- Prefer WebP or AVIF for photographic assets, with appropriate fallbacks if needed.
- Avoid huge uncompressed screenshots.
- Avoid layout shift.
- Do not duplicate project content in markup and JavaScript.
- Pause or reduce nonessential work when the document is hidden.
- Preserve the forest's idle-load strategy.
- Keep the static build deterministic.

Performance targets for the homepage on a production build:

- No console errors
- No failed internal asset requests
- No obvious input delay from section switching
- No visible layout jump when images load
- Lighthouse accessibility target: 95+
- Lighthouse best-practices target: 95+
- Lighthouse SEO target: 95+
- Keep performance close to the current baseline; document any unavoidable regression

</performance>

<seo_and_metadata>

Update homepage metadata only as necessary to reflect the new structure.

Suggested description direction:

> Kaung Thiha is a product- and data-minded builder working across analytics, AI, and product development. Explore selected work, projects, tools, and things he loves.

Requirements:

- Preserve canonical URL behavior.
- Preserve Open Graph and Twitter Card tags.
- Preserve sitemap integration.
- Keep all primary Work and Create content present in rendered HTML so it remains indexable.
- Use descriptive link text.
- Avoid multiple pages with duplicate project copy unless canonicalized appropriately.
- Preserve existing redirects.
- Do not expose private contact information in structured data.

</seo_and_metadata>

<content_voice>

Kaung's voice is:

- Conversational
- Curious
- Direct
- Lightly playful
- Comfortable using a small joke
- Specific about what was built and why
- Not overly polished into corporate language

Preserve that voice.

Avoid:

- “Results-driven professional”
- “Dynamic thought leader”
- “Leveraged synergies”
- Generic AI buzzwords
- Unverifiable claims
- Long stacks of technologies without context
- Making every project sound revolutionary
- Writing as if Kaung were a design agency

Use first person where natural.

Use concise captions and summaries.

Do not rewrite established metrics without verifying them against the approved résumé or existing public project content.

</content_voice>

<content_safety_and_confidentiality>

This is a public portfolio.

Do not publish:

- Customer data
- Internal employer data
- Proprietary source code
- Internal screenshots
- Internal URLs
- Internal ticket IDs
- Nonpublic architecture diagrams
- Confidential financial data
- Names of coworkers without permission
- Private relationship details
- Personal address
- Phone number unless explicitly approved
- Credentials or environment variables

For work associated with Capital One, AWS, Wefunder, Outbuild, or any other employer:

- Use public-safe descriptions.
- Distinguish personal prototypes from official company products.
- Do not imply endorsement.
- Do not reveal implementation details beyond the public résumé and existing public site.
- Add a quiet disclaimer only where genuinely needed; do not clutter every project.

</content_safety_and_confidentiality>

<recommended_component_architecture>

Inspect the repository first and adapt to its conventions. A reasonable target structure is:

```text
src/
  components/
    portfolio/
      PortfolioShell.astro
      SectionSwitcher.astro
      WorkSection.astro
      WorkTimeline.astro
      CreateSection.astro
      ProjectIndex.astro
      ProjectDetail.astro
      LovesSection.astro
      LovesCarousel.astro
      ContactFooter.astro
  data/
    work.ts
    projects.ts
    loves.ts
  pages/
    index.astro
  scripts/
    forest.ts or existing forest module
    portfolio-navigation.ts
    loves-carousel.ts

public/
  assets/
    css/
      editorial.css
    images/
      loves/
      projects/
```

This is guidance, not a requirement.

Prefer:

- Small focused Astro components
- Typed data modules
- One source of truth for each content type
- Minimal client-side state
- Progressive enhancement
- Clear separation between content, presentation, and interaction

Avoid:

- One enormous `index.astro`
- Hundreds of lines of project copy inside an inline `<script>`
- Duplicated project metadata
- A new global state library
- Unnecessary dependency additions
- CSS selectors tightly coupled to DOM depth
- Arbitrary z-index escalation

</recommended_component_architecture>

<implementation_sequence>

Follow this sequence.

## Phase 1 — Inspect and baseline

Before editing:

1. Read:
   - `package.json`
   - `astro.config.mjs`
   - `src/pages/index.astro`
   - `src/layouts/Base.astro`
   - `public/assets/css/editorial.css`
   - `public/assets/css/weather.css`
   - `public/assets/css/custom.css`
   - `src/scripts/forest*`
   - deployment workflow files
2. Identify:
   - Source-of-truth files
   - Generated or legacy duplicate files
   - Current homepage route logic
   - Current theme variables
   - Current responsive breakpoints
   - Current project assets
   - Current résumé PDF
3. Run:
   - dependency install using the repository's lockfile
   - development server
   - production build
4. Record:
   - current console errors, if any
   - current build warnings, if any
   - baseline screenshots for desktop and mobile
   - baseline Lighthouse or equivalent metrics if available
5. Do not begin by deleting the current homepage. Understand it first.

## Phase 2 — Extract content

1. Move work history into typed data.
2. Move project metadata and descriptions into typed data.
3. Create Loves data with explicit placeholders or TODO markers.
4. Reconcile duplicate or conflicting résumé facts.
5. Preserve existing links and assets.
6. Do not invent missing project details.

## Phase 3 — Build new content shell

1. Preserve the hero markup and forest host.
2. Replace the old flippable shell with `PortfolioShell`.
3. Add `work / create / loves` switching.
4. Add hash routing.
5. Ensure no-JavaScript or progressive-access fallback.
6. Use natural page height.
7. Keep the forest readable around the main surface.

## Phase 4 — Implement Work

1. Add short intro.
2. Add editorial timeline.
3. Add meaningful metrics.
4. Add compact skills line.
5. Add résumé link.
6. Add contact link.
7. Verify mobile flow.

## Phase 5 — Implement Create

1. Add project index.
2. Add active project detail.
3. Add links and media.
4. Preserve live tools and case-study routes.
5. Make mobile layout stacked and accessible.
6. Keep project content data-driven.
7. Remove obsolete modal data from inline scripts.
8. Keep a lightbox only if it adds value and is fully accessible.

## Phase 6 — Implement Loves

1. Add typed Loves data.
2. Add manual slideshow.
3. Add touch, mouse, and keyboard controls.
4. Add position indicator.
5. Add optional `currently loving` summary.
6. Add image optimization and attribution support.
7. Ensure reduced-motion behavior.
8. Ensure mobile text readability.

## Phase 7 — Remove obsolete implementation

Remove:

- Old flip-state JavaScript
- Old face-routing map
- Old sidebar flip controls
- Old Work/Context segmented control
- Old inactive-face tabindex code
- Old card-face CSS
- Unused project modal data
- Unused tool-grid CSS
- Unused current-grid CSS
- Any dead icon markup
- Any duplicate project content

Preserve shared selectors only when still used by other pages.

## Phase 8 — Polish and test

1. Test all weather themes.
2. Test keyboard-only use.
3. Test reduced motion.
4. Test at all required viewport sizes.
5. Test direct hash loads.
6. Test browser back/forward.
7. Test all external and internal links.
8. Test project PDFs and live tools.
9. Test image loading.
10. Test with WebGL unavailable.
11. Run production build.
12. Review console and network errors.
13. Run accessibility checks.
14. Compare performance to baseline.

</implementation_sequence>

<design_details_by_section>

## Content-stage entrance

When the user scrolls past the hero:

- Let the glass surface appear naturally.
- Preserve the current forest fade-in behavior if it works.
- Avoid a sudden hard background change.
- The content stage can slightly overlap the final portion of the hero, but do not cover the portrait or weather text.
- The scroll target must account for sticky navigation.

## Work visual rhythm

Suggested structure:

```text
WORK
Short personal summary                         Download résumé

2025—NOW
Capital One
Associate Data Product Analyst
Scope sentence
Selected outcomes...

2025
Outbuild
Revenue Operations Analyst
Scope sentence
Selected outcomes...

Earlier...
```

Use dates as quiet anchors.

Do not use a complex zig-zag timeline with alternating sides.

## Create visual rhythm

Suggested structure:

```text
CREATE
Things I’ve built, tested, or learned from.

Project index             Active project story
01 SheepHerder            Large image
02 Outbuild AI Learning   Summary
03 AskCyborg              Problem
...                       What I did
                          Result
                          Stack
                          Links
```

The project index should be readable even before interaction.

## Loves visual rhythm

Suggested structure:

```text
LOVES
A rotating shelf of things that make life better.

currently loving: ...

[ large visual slide ]
MUSIC
Item title
Personal caption

←  03 / 08  →
```

Do not use generic stock lifestyle imagery.

</design_details_by_section>

<copy_placeholders>

Use these only as direction. Kaung should review final copy.

## Work headline options

Preferred:

> I work where product, data, and AI overlap.

Alternative:

> I like turning messy questions into useful things.

## Create headline options

Preferred:

> Things I’ve built, tested, and learned from.

Alternative:

> Small tools, product ideas, and a few serious rabbit holes.

## Loves headline options

Preferred:

> A rotating shelf of things I love.

Alternative:

> Things that make life more interesting.

Do not ship multiple options. Choose one coherent set and note the choice in the final summary.

</copy_placeholders>

<testing_checklist>

## Build and deployment

- [ ] `npm run build` succeeds
- [ ] Static output is generated
- [ ] No Astro `base` path was added
- [ ] Root-relative assets work
- [ ] GitHub Pages deployment remains compatible
- [ ] Existing redirects remain
- [ ] Sitemap builds
- [ ] GoatCounter remains
- [ ] No secrets are committed

## Hero and atmosphere

- [ ] Hero portrait remains
- [ ] Burmese name remains
- [ ] Arlington weather status remains
- [ ] LinkedIn remains
- [ ] Spotify remains
- [ ] Forest loads lazily
- [ ] Weather themes still update
- [ ] Forest remains behind content
- [ ] WebGL fallback works
- [ ] Ripple effect does not block controls
- [ ] Scroll cue reaches content correctly

## Navigation

- [ ] `work / create / loves` visible
- [ ] Active state is clear
- [ ] `#work` loads Work
- [ ] `#create` loads Create
- [ ] `#loves` loads Loves
- [ ] Browser back/forward works
- [ ] Hero nav scrolls and switches correctly
- [ ] Keyboard controls work
- [ ] Focus is visible
- [ ] Sticky header does not cover headings

## Work

- [ ] Current roles and dates are reconciled
- [ ] Approved metrics are accurate
- [ ] Relevant metrics are emphasized
- [ ] No confidential details
- [ ] Résumé link works
- [ ] Phone number is not exposed by default
- [ ] Skills are concise
- [ ] Mobile timeline is readable

## Create

- [ ] Existing live tool routes work
- [ ] Existing PDFs work
- [ ] Existing case-study routes work
- [ ] Project content comes from one data source
- [ ] All project controls work by keyboard
- [ ] Active project state is not color-only
- [ ] Images have alt text
- [ ] Missing content is marked as TODO, not invented
- [ ] Mobile details are accessible without hover
- [ ] No dead modal code remains

## Loves

- [ ] Manual previous/next controls work
- [ ] Keyboard navigation works
- [ ] Touch swiping works
- [ ] Position indicator updates
- [ ] No autoplay
- [ ] Reduced motion works
- [ ] Images have alt text
- [ ] Credits can be displayed
- [ ] Text remains readable on mobile
- [ ] `Currently loving` comes from the same data source

## Accessibility

- [ ] One `<h1>`
- [ ] Logical headings
- [ ] Skip link works
- [ ] Section switcher semantics are correct
- [ ] Focus order is logical
- [ ] Dialog focus is trapped if dialogs remain
- [ ] Focus returns on dialog close
- [ ] Escape closes dialogs
- [ ] Contrast passes across themes
- [ ] Reduced motion is respected
- [ ] Screen-reader carousel labels are meaningful

## Responsive

- [ ] 360 × 800
- [ ] 390 × 844
- [ ] 768 × 1024
- [ ] 1024 × 768
- [ ] 1280 × 800
- [ ] 1440 × 900
- [ ] 1920 × 1080
- [ ] No horizontal page overflow
- [ ] No fixed-height content clipping
- [ ] No controls overlap
- [ ] Images do not cause layout shift

## Quality

- [ ] No console errors
- [ ] No failed internal requests
- [ ] No unused imports
- [ ] No dead CSS from old flip layout
- [ ] No unnecessary new dependencies
- [ ] No duplicated project data
- [ ] No invalid HTML
- [ ] Content remains readable under every weather state

</testing_checklist>

<acceptance_criteria>

The redesign is complete only when all of the following are true:

1. The initial landing remains recognizably the same experience.
2. The forest, weather text, weather themes, portrait, and social links continue working.
3. The old Work/Context flip interface is gone.
4. The content area is organized around `work / create / loves`.
5. Section links support direct URL hashes and browser history.
6. Work presents a concise, accurate, web-native résumé.
7. Relevant metrics are emphasized without looking like a dashboard.
8. Create combines tools and projects into one coherent data-driven system.
9. Existing tool, PDF, and case-study URLs still work.
10. Project details are readable without relying on a modal or hover.
11. Loves is a manually controlled, accessible visual slideshow.
12. The old Currently cards are removed or migrated into Loves.
13. The new content retains the existing glass, gradients, and atmospheric visual language.
14. The page uses one dominant glass surface rather than a wall of cards.
15. The page works on desktop, tablet, and mobile.
16. The page supports keyboard navigation and reduced motion.
17. The site remains a static Astro build deployable to GitHub Pages.
18. No confidential or invented content is published.
19. No unnecessary heavy dependency is added.
20. Production build succeeds without console errors or broken internal links.

</acceptance_criteria>

<agent_output_requirements>

After implementation, provide:

1. **Summary**
   - What was changed
   - Main UX decisions
   - What was deliberately preserved

2. **Files changed**
   - One line per file
   - Identify new, modified, and removed files

3. **Content decisions**
   - Resume version used
   - Projects included
   - Loves placeholders still needing Kaung's content
   - Any facts that need confirmation

4. **Testing performed**
   - Build command and result
   - Viewports tested
   - Keyboard testing
   - Reduced-motion testing
   - Theme testing
   - Link testing
   - Accessibility checks
   - Performance comparison

5. **Tuning variables**
   - Surface opacity
   - Blur
   - Max width
   - Transition duration
   - Carousel gap
   - Image aspect ratio
   - Theme-specific contrast variables

6. **Remaining TODOs**
   - Missing images
   - Missing captions
   - Missing project links
   - Resume file update
   - Any content or privacy decisions requiring Kaung

Do not claim a test passed if it was not actually run.

Do not commit, push, or open a pull request unless explicitly authorized.

</agent_output_requirements>

<final_instruction>

Begin by inspecting the repository and running the current site. Then implement the redesign as a focused refactor of the homepage content area.

Preserve the hero and atmospheric system. Replace the flippable content shell with a calm, editorial, accessible `work / create / loves` experience.

Do not stop merely because Loves content or some project imagery is incomplete. Implement the complete data model, layout, interactions, placeholders, and TODO checklist so Kaung can add final assets without another structural rewrite.

</final_instruction>

---

# 5. Suggested Content Asset Checklist

The redesign can be built before all assets are available, but the final version will benefit from the following.

## Work

- Latest approved public résumé PDF
- Confirmed public role titles and dates
- Confirmed list of metrics safe to display
- GitHub profile URL
- Preferred public email
- Optional company logos, only if desired and legally appropriate

## Create

For each project:

- One primary screenshot or diagram
- One-sentence summary
- Problem
- Kaung's contribution
- Result or learning
- Stack
- Year
- Status
- Live link
- Case-study link
- PDF link
- GitHub link
- Public-safety or confidentiality note

## Loves

For each slide:

- Category
- Item title
- Personal caption
- Image
- Alt text
- Link
- Image credit
- `Currently loving` status

Suggested initial slide count: **6–10**. Fewer strong slides are better than a long generic gallery.

---

# 6. Recommended First-Pass Defaults

These defaults allow the coding agent to produce a complete first pass before Kaung answers every content question.

```yaml
navigation:
  labels: [work, create, loves]
  lowercase: true
  hash_routing: true
  hero_scroll_label: explore

hero:
  preserve_structure: true
  preserve_visuals: true
  preserve_weather: true
  preserve_forest: true

work:
  density: balanced
  include_roles:
    - Capital One
    - Outbuild
    - AWS / Keywords Studios
    - Wefunder
    - AskCyborg / CrossWork
    - USF ITS
  show_resume_download: true
  show_email: true
  show_phone: false
  emphasize_metrics: true

create:
  combine_tools_and_projects: true
  desktop_layout: master-detail
  mobile_layout: stacked
  projects:
    - SheepHerder / Festival Thingamabob
    - Outbuild AI Learning System
    - AskCyborg
    - EASE / DSC Case Study
    - Attendance Tracker
    - Instacart Reddit Pulse
    - AI Usage Tracker
    - Early Wage Access Feature Proposal

loves:
  autoplay: false
  native_swipe: true
  keyboard_navigation: true
  initial_categories:
    - Music
    - Books
    - Cooking and food
    - Games, worlds, and lore
    - Languages and learning
    - Places and experiences
  migrate_currently: true

visual:
  retain_glass: true
  retain_gradients: true
  retain_light_blue_palette: true
  dominant_surface_count: 1
  avoid_card_wall: true
  avoid_3d_flip: true

engineering:
  static_astro: true
  new_framework: false
  heavy_carousel_library: false
  preserve_goatcounter: true
  preserve_existing_routes: true
  preserve_reduced_motion: true
```

---

# 7. Final Product Principle

The redesign should make the site feel less like a collection of portfolio cards and more like walking from Kaung's atmospheric landing page into a clear personal index:

- **Work** explains what he has done.
- **Create** shows what he makes.
- **Loves** reveals what shapes his taste.

The forest and weather provide the world. The new content system should provide the clarity.
