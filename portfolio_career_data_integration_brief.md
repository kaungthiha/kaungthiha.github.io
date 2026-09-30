# Portfolio Career Data Integration Brief

**Purpose:** Refactor the completed portfolio so that professional history, education, projects, metrics, and skills come from one canonical career dataset rather than being hard-coded across Astro components.

**Context:** The visual redesign is already complete. This task is **not** another redesign. Preserve the current UX and visual system unless a small implementation adjustment is required to support the data architecture cleanly.

---

# 1. Core Principle

The website should separate:

```text
what is true
from
what is shown
```

Use the following model:

```text
career-history.json
        ↓
career helper / selector layer
        ↓
portfolio presentation config
        ↓
Astro components
```

The canonical dataset answers:

> What is Kaung's documented professional history?

The portfolio config answers:

> Which parts of that history should appear on this website, and in what order?

The components answer:

> How should the selected information be presented visually?

Do not collapse those responsibilities back together.

---

# 2. Files Being Added

Place the supplied files in:

```text
src/data/career/
  career-history.json
  career-history.schema.json
```

Recommended filenames:

```text
src/data/career/career-history.json
src/data/career/career-history.schema.json
```

The supplied files are:

```text
kaung_thiha_career_history.json
kaung_thiha_career_history.schema.json
```

Rename them to the cleaner repo paths above if useful.

---

# 3. Source-of-Truth Rule

`career-history.json` is the authoritative source of truth for:

- employers
- job titles
- team / functional scope
- employment dates
- role transitions
- locations
- education
- documented achievements
- metrics
- skills
- certifications
- projects
- leadership experience
- public-safe professional facts

Do not hard-code any of those facts again inside:

- `.astro` components
- page markup
- TypeScript constants
- CSS generated content
- project configuration files
- resume-specific components

If a fact exists in the career dataset, use the dataset.

---

# 4. Important Authority Rule

The most recent APM résumé is authoritative for current job titles and chronology.

In particular, Capital One must be modeled as two separate roles under one employer:

```text
Capital One

Associate Data Analyst
Emerging Payments & Strategy
Sep 2026 — Present

Associate Data Product Manager
Data Products & Experiences
Jul 2025 — Sep 2026
```

Do not revert to older portfolio labels such as:

```text
Associate Data Product Analyst
```

when the canonical data contains a newer title.

Older résumé variants remain useful as provenance and historical evidence, but they do not override fields explicitly marked canonical in the JSON.

---

# 5. Canonical Data vs Presentation

The JSON is intentionally more comprehensive than the website.

Do not render everything simply because it exists.

Example:

```text
career-history.json
contains
9 experience records
10 projects
4 leadership records
full metrics
historical variants
source metadata
```

The homepage may intentionally show only:

```text
5 career chapters
4 featured projects
4 small experiments
a compact skill summary
```

That is correct.

The website should remain curated and minimal.

---

# 6. Do Not Render Maintenance Metadata

The JSON contains fields that exist for data quality and provenance.

These should never appear publicly unless explicitly requested.

Examples:

```text
source_ids
confidence
conflicts
historical_variants
title_aliases
notes
authority
sha256
data_quality_notes
```

These are maintenance metadata.

They help Claude and future maintainers understand:

- where a fact came from
- whether sources disagree
- whether an older résumé used another title
- whether something is unresolved

They are not website content.

---

# 7. Conflict Handling

Never guess when the data records a conflict.

Example:

If one historical source says:

```text
60+ organic users
```

and another says:

```text
70+ organic users
```

and the canonical dataset marks that value unresolved:

Do not choose one.

Instead:

- omit the disputed metric
- use a non-numeric version if useful
- or preserve the fact only in internal metadata

Example safe public copy:

```text
Gained organic users immediately after launch.
```

Do not silently invent precision.

---

# 8. Recommended Repo Architecture

Use a structure similar to:

```text
src/
  data/
    career/
      career-history.json
      career-history.schema.json

    portfolio/
      portfolio-config.ts

  lib/
    career.ts

  components/
    portfolio/
      WorkSection.astro
      WorkRole.astro
      CreateSection.astro
      ProjectStory.astro
      ExperimentsList.astro
      LovesSection.astro
```

Adapt names to the current repo if a comparable structure already exists.

Do not reorganize unrelated files just to match this example.

---

# 9. `career.ts` Helper Layer

Do not make every Astro component manually search the raw JSON.

Create a small helper layer:

```text
src/lib/career.ts
```

Its purpose is:

- load the canonical dataset
- normalize common access patterns
- centralize public filtering
- centralize ordering helpers
- prevent components from duplicating traversal logic

Possible helpers:

```ts
getCurrentRole()
getExperience(id)
getExperienceByOrganization(name)
getWebsiteExperience(ids)
getProject(id)
getProjects(ids)
getEducation()
getPublicSkills()
getPublicAchievements(role)
getCanonicalRoleTitle(role)
```

Keep the helper layer small.

This is not a new application framework.

---

# 10. Example Helper Pattern

Directionally:

```ts
import career from '../data/career/career-history.json';

export function getExperience(id: string) {
  return career.experience.find(
    (item) => item.id === id
  );
}

export function getCurrentRole() {
  for (const employer of career.experience) {
    const role = employer.roles?.find(
      (role) => role.current
    );

    if (role) {
      return {
        employer,
        role
      };
    }
  }

  return null;
}
```

Use actual dataset field names.

Do not force the JSON to match this sample if the supplied schema differs.

---

# 11. Presentation Config

Create a second lightweight layer for website-specific curation.

Recommended:

```text
src/data/portfolio/portfolio-config.ts
```

This file should contain **IDs and presentation decisions**, not résumé facts.

Example:

```ts
export const portfolioConfig = {
  work: {
    experienceIds: [
      'capital-one',
      'outbuild',
      'aws-keywords',
      'wefunder',
      'askcyborg-crosswork'
    ],

    showEarlierWork: true
  },

  create: {
    featuredProjectIds: [
      'festival-thingamabob',
      'outbuild-learning-system',
      'askcyborg',
      'ease'
    ],

    experimentProjectIds: [
      'attendance-tracker',
      'instacart-reddit-pulse',
      'ai-usage-tracker',
      'early-wage-access'
    ]
  }
};
```

Use the actual IDs from the supplied career JSON.

The config may control:

- ordering
- visibility
- homepage selection
- featured status
- grouping
- whether earlier work is collapsed
- which project has an image
- which CTA style to use

It must not duplicate:

- job title
- date
- metric
- employer name
- degree
- achievement text

unless there is a strong presentation-only reason.

---

# 12. Why the Config Layer Matters

Do not add fields like:

```json
"homepage_position": 1
```

to canonical career history unless they are truly intrinsic to the record.

Portfolio prominence is not a career fact.

Example:

```text
career-history.json
knows:
AskCyborg happened.

portfolio-config.ts
knows:
AskCyborg is featured third on the homepage.
```

This separation allows the website to evolve without corrupting the career history.

---

# 13. Work Section Integration

The completed redesign should remain minimal.

Do not turn Work into a full résumé dump.

Recommended visible career chapters:

1. Capital One
2. Outbuild
3. Amazon Web Services / Keywords Studios
4. Wefunder
5. AskCyborg / CrossWork

Optional:

```text
Earlier work →
```

for:

- USF ITS
- internships
- university leadership
- older experiences

Use the canonical JSON to populate:

- company
- title
- team/scope
- dates
- location if displayed
- short role summary
- selected metric

---

# 14. Capital One Rendering

Capital One is the clearest reason to use canonical data.

Render both role transitions under the same employer.

Suggested visual hierarchy:

```text
2026—NOW
Capital One
Associate Data Analyst · Emerging Payments & Strategy

Short public-safe summary.


2025—2026
Capital One
Associate Data Product Manager · Data Products & Experiences

Short public-safe summary.
```

Alternative if the current visual design groups employer history:

```text
Capital One

2026—NOW
Associate Data Analyst
Emerging Payments & Strategy

2025—2026
Associate Data Product Manager
Data Products & Experiences
```

Either is acceptable.

Do not flatten the two roles into a single title.

---

# 15. Work Copy Rules

The canonical data can contain more detail than the homepage should show.

For the homepage:

- use one short summary per role
- optionally show one standout outcome
- avoid bullet walls
- avoid listing every technology
- avoid recreating a one-page résumé inside the site

The design goal remains:

> fast understanding

not:

> maximum information density

---

# 16. Canonical Facts vs Website Summary

Not every sentence needs to be mechanically assembled from atomic metrics.

It is acceptable to use a field such as:

```json
"website_summary": "Building analytics for emerging payment experiences across Capital One Card."
```

if the dataset already supports or is extended to support this cleanly.

Rules:

A website summary may:

- compress facts
- simplify technical wording
- combine closely related responsibilities
- sound more conversational

It may not:

- change a title
- change a date
- change an employer
- change a metric
- exaggerate scope
- introduce a new achievement
- contradict canonical data

If a website-specific summary lives outside canonical data, keep it clearly presentation-only and keyed by canonical ID.

---

# 17. Metric Handling

Metrics should come from canonical data whenever possible.

Example underlying achievement:

```json
{
  "text": "Automated Jira ticket processing with Python in Databricks",
  "metrics": [
    {
      "name": "weekly_manual_validation_saved",
      "value": 5,
      "unit": "hours",
      "qualifier": "+"
    }
  ]
}
```

The website may render:

```text
Automated validation workflows, eliminating 5+ hours/week of manual work.
```

A résumé may render:

```text
Automated Jira ticket processing with Python in Databricks, eliminating 5+ hours of weekly manual validation.
```

Same fact.

Different presentation.

Do not store a separate hard-coded `5+ hours/week` inside the component.

---

# 18. Create Section Integration

Use canonical project records to populate Create.

The current redesign should remain curated.

Recommended featured projects:

1. Festival Thingamabob / SheepHerder
2. Outbuild AI Learning System
3. AskCyborg
4. EASE

Recommended smaller experiments:

- Attendance Tracker
- Instacart Reddit Pulse
- AI Usage Tracker
- Early Wage Access proposal

Use actual canonical project IDs from the JSON.

---

# 19. Featured Project Rules

For featured projects, the homepage may show:

- project title
- short summary
- one image
- one standout result
- compact stack
- primary CTA

Do not show every project field.

Dedicated pages, PDFs, or live tools can carry the deeper detail.

Example:

```text
AskCyborg

An AI research assistant for SEC filings that I co-founded
while in college.

Python · embeddings · vector retrieval

View project →
```

All factual details should trace back to the career dataset.

---

# 20. Small Experiments Rules

Secondary projects should remain visually lightweight.

Example:

```text
SMALL EXPERIMENTS

Attendance Tracker
Reddit Pulse
AI Usage Tracker
Early Wage Access Proposal
```

These can be derived from canonical project records.

The presentation config decides which project is:

- featured
- experimental
- hidden

The canonical data does not.

---

# 21. Loves Is Separate

Do not move Loves into the career-history dataset.

Loves is:

- personal
- subjective
- temporary
- editorial

Career history is:

- factual
- historical
- professional
- provenance-sensitive

Keep Loves in its existing data source.

Example:

```text
src/data/loves.ts
```

or the current equivalent.

---

# 22. Education Integration

If education appears anywhere on the website, derive it from canonical career data.

Do not hard-code:

- university
- degree
- dates
- graduate study
- certifications

in page components.

If the website does not currently show education prominently, do not add a large Education section solely because the JSON contains it.

The redesign should remain minimal.

---

# 23. Skills Integration

Skills should also come from canonical data.

However, do not display the entire historical skills inventory.

Create a helper such as:

```ts
getPublicSkills()
```

or use a presentation config to select a concise current subset.

Example website presentation:

```text
Product
product analytics · experimentation · strategy

Data
SQL · Python · Snowflake · Databricks

Building
TypeScript · Astro · AI coding agents · n8n
```

The JSON can contain the broader documented history.

The site should show only what is useful.

---

# 24. Public-Safety Rules

Respect fields such as:

```text
public_safe
website_default
confidentiality notes
```

Do not expose:

- private employer details
- internal URLs
- proprietary system names not already approved
- internal screenshots
- nonpublic datasets
- coworker names
- source-document provenance
- private phone number
- internal source IDs

If a canonical record is not marked appropriate for public display, omit it.

---

# 25. No Phone Number

The canonical dataset intentionally excludes the phone number from normal public usage.

Do not add it to the website.

Public contact can use:

- email
- LinkedIn
- GitHub
- portfolio URL

unless instructed otherwise later.

---

# 26. Schema Usage

`career-history.schema.json` is a development artifact.

Its purpose is to validate future changes to the career dataset.

It should not normally be loaded into the browser.

Use it for:

- validation
- editor tooling
- CI checks if useful
- Claude Code data safety

Do not ship unnecessary schema data to the client.

---

# 27. Optional Validation Script

If low-overhead, add a validation command.

Possible direction:

```text
npm run validate:career
```

It may check:

- JSON parses
- required fields exist
- source IDs resolve
- IDs are unique
- current role is unambiguous
- configured portfolio IDs exist
- no unresolved conflict is selected for public rendering

Do not add a large validation dependency if a small script is sufficient.

This is optional.

---

# 28. Static Build Requirement

Career data should be consumed at Astro build time.

Prefer:

```text
JSON
↓
Astro / TypeScript
↓
static rendered HTML
```

Do not fetch the JSON from the browser at runtime.

The website is static.

There is no need for:

- API requests
- client database
- server route
- state management
- runtime JSON fetch
- loading spinner

---

# 29. SEO Requirement

Primary Work and Create content should render into static HTML.

Do not rely on client JavaScript to inject career history after load.

This ensures:

- indexability
- accessibility
- no-JS readability
- stable layout
- faster rendering

---

# 30. TypeScript Typing

If useful, create TypeScript interfaces matching the canonical data.

However:

- do not manually duplicate the entire JSON Schema into hundreds of lines of TypeScript unless necessary
- keep types focused on fields the website consumes
- preserve unknown maintenance metadata rather than destructively transforming the dataset

Potential types:

```ts
CareerHistory
ExperienceRecord
CareerRole
Achievement
CareerProject
EducationRecord
```

---

# 31. Migration Strategy

Do not rewrite every component at once without checking behavior.

Recommended sequence:

## Phase 1 — install canonical files

Add:

```text
src/data/career/career-history.json
src/data/career/career-history.schema.json
```

Confirm build still works.

## Phase 2 — create helper layer

Add:

```text
src/lib/career.ts
```

Implement ID-based retrieval and public filtering.

## Phase 3 — create portfolio config

Add:

```text
src/data/portfolio/portfolio-config.ts
```

Use canonical record IDs.

## Phase 4 — migrate Work

Replace hard-coded:

- titles
- dates
- companies
- summaries where appropriate
- metrics

with canonical data.

Verify Capital One first.

## Phase 5 — migrate Create

Replace hard-coded project facts with canonical project records.

Preserve existing project links and images if those are portfolio-specific.

## Phase 6 — migrate skills / education if currently displayed

Do not add new visible sections solely to exercise the dataset.

## Phase 7 — remove duplicated old data

Delete or shrink obsolete:

```text
src/data/work.ts
src/data/projects.ts
```

depending on how much presentation-only data still belongs there.

Do not leave two competing sources of truth.

---

# 32. Handling Existing `work.ts`

The current repo previously used `src/data/work.ts`.

After migration:

Do not leave it containing duplicate canonical history.

Either:

## Preferred

Remove it and derive Work from:

```text
career-history.json
+
portfolio-config.ts
```

or:

## Acceptable

Reduce `work.ts` to presentation-only metadata.

Example acceptable content:

```ts
export const workPresentation = {
  intro: "I work where product, data, and AI overlap.",
  visibleExperienceIds: [...]
};
```

Not acceptable:

```ts
{
  company: "Capital One",
  role: "Associate Data Product Analyst",
  dates: "2025 — Now"
}
```

when those facts already exist in canonical career data.

---

# 33. Handling Existing `projects.ts`

The same rule applies.

After migration, `projects.ts` should not maintain a second independent copy of:

- project title
- year
- metrics
- project description
- technologies
- results

Prefer:

```text
career-history.json
+
portfolio-config.ts
```

If portfolio-only fields are needed, key them by canonical project ID.

Example:

```ts
export const projectPresentation = {
  askcyborg: {
    heroImage: '/assets/images/askcyborg.webp',
    layout: 'wide'
  }
};
```

Images and visual layout are presentation concerns.

Historical results are canonical-data concerns.

---

# 34. Images and Links

Some fields are naturally portfolio-specific.

These may remain outside career history when appropriate:

- hero image path
- gallery image path
- image focal position
- visual theme
- display variant
- CTA style

For URLs:

If the canonical dataset contains the authoritative project URL, use it.

If an existing portfolio route is purely website presentation, it may remain in portfolio config.

Avoid duplicated URLs when possible.

---

# 35. ID Stability

Treat canonical IDs as stable API-like identifiers.

Once the website depends on:

```text
capital-one
askcyborg
festival-thingamabob
```

do not casually rename them.

If an ID must change:

- update all config references
- verify build
- verify no links depend on the old ID

Display names may change freely.

IDs should not.

---

# 36. Future Updates

Going forward, update professional history in this order:

```text
1. career-history.json
2. validate
3. adjust portfolio-config.ts only if visibility/order should change
4. build
```

Do not first edit the website component.

Example future promotion:

```text
Do:
career-history.json
  add new role

Then:
portfolio automatically reads it

Possibly:
portfolio-config.ts
  choose whether/how prominently it displays
```

---

# 37. Future Résumé Workflow

Long-term, treat resumes as outputs rather than truth sources.

Desired model:

```text
career-history.json
        ↓
        ├── portfolio
        ├── APM résumé
        ├── data résumé
        ├── product résumé
        ├── LinkedIn
        └── application answers
```

This task only integrates the website.

Do not build resume-generation tooling unless separately requested.

---

# 38. Current Data Authority Summary

The career dataset was assembled with these principles:

- newest APM résumé wins on current titles and chronology
- master / historical files recover omitted achievements and projects
- older alternate titles are retained as aliases / provenance
- conflicting metrics are not silently reconciled
- stale historical `Present` dates are not treated as currently active
- private maintenance metadata stays internal
- phone number is excluded from normal public use

Do not undo these assumptions.

---

# 39. Do Not Redesign the Finished Site

Claude has already completed the previous design build.

For this task:

Do not:

- redesign the hero
- change nature styling
- alter visual hierarchy
- revisit typography
- change section spacing
- add cards
- add new visual effects
- change project layout without need
- reintroduce tabs
- expand the content footprint

Only make visual changes where required to cleanly consume the canonical data.

This is primarily a **data architecture and content-source refactor**.

---

# 40. Preserve the Minimal Nature-First Direction

The previous redesign principle remains:

> Nature is the environment. Content is quiet.

This refactor should strengthen that direction by making the underlying content more accurate without making the visible site denser.

The site should not become more résumé-like simply because more career information is now available.

---

# 41. Implementation Decision Rule

Whenever deciding whether to render a canonical fact, ask:

> Does showing this fact help a visitor understand Kaung faster?

If yes, consider it.

If no, keep it in the canonical history but do not render it.

The JSON is comprehensive.

The portfolio is selective.

---

# 42. Acceptance Criteria

The integration is complete when:

- [ ] `career-history.json` exists under `src/data/career/`
- [ ] `career-history.schema.json` exists under `src/data/career/`
- [ ] the website builds successfully
- [ ] Work facts come from canonical data
- [ ] Create facts come from canonical data
- [ ] skills use canonical data where displayed
- [ ] education uses canonical data where displayed
- [ ] Capital One displays the correct two-role progression
- [ ] no component hard-codes an obsolete Capital One title
- [ ] portfolio ordering is controlled separately from canonical data
- [ ] maintenance metadata is not rendered
- [ ] unresolved conflicts are not guessed into public copy
- [ ] no phone number is exposed
- [ ] existing visual redesign remains intact
- [ ] existing project routes still work
- [ ] existing live tools still work
- [ ] primary content is statically rendered
- [ ] no runtime JSON fetch is introduced
- [ ] obsolete duplicate career data is removed
- [ ] no second source of truth remains
- [ ] no unnecessary dependency is added
- [ ] no console errors are introduced

---

# 43. Final Architecture

Target:

```text
                        ┌─────────────────────┐
                        │ career-history.json │
                        │  canonical truth    │
                        └──────────┬──────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
             src/lib/career.ts          portfolio-config.ts
             normalize/select           select/order/group
                    │                             │
                    └──────────────┬──────────────┘
                                   │
                                   ↓
                     ┌─────────────────────────┐
                     │       PORTFOLIO         │
                     │                         │
                     │  Work                   │
                     │  selected experience    │
                     │                         │
                     │  Create                 │
                     │  featured + experiments │
                     │                         │
                     │  Loves                  │
                     │  separate personal data │
                     └─────────────────────────┘
```

And separately:

```text
career-history.schema.json
            ↓
validation / maintenance
not browser UI
```

---

# 44. Final Instruction to Claude

Treat this as a focused post-redesign refactor.

Do not redesign the finished portfolio.

Integrate the supplied canonical career-history JSON so that the website no longer maintains competing copies of Kaung's professional history.

The finished implementation should make future career updates straightforward:

```text
update canonical JSON
→ rebuild
→ website stays accurate
```

while preserving the current minimal, nature-first presentation.

The underlying history may be comprehensive.

The visible portfolio should remain restrained.


---

# 45. New Information Architecture: Summary on Home, Full Career Timeline on `/career/`

The canonical career dataset should now power **two different levels of career presentation**:

```text
career-history.json
        ↓
        ├── Homepage Work summary
        │     very concise
        │     fast to scan
        │
        └── /career/
              full chronological view
              more detailed
              linkable
              public-safe
```

This is intentional progressive disclosure.

The homepage should answer:

> Who is Kaung professionally?

The dedicated Career page should answer:

> What exactly has he done, and how did his career develop over time?

Do not make the homepage carry the full career history.

Do not make the Career page feel like a duplicated PDF résumé.

---

# 46. Homepage Work Section Should Become a Career Summary

The homepage Work section should remain extremely concise.

Recommended structure:

```text
WORK

I work across product, data, and AI—currently focused on emerging
payments at Capital One. Before that, I worked on data products,
construction-tech RevOps, AI model operations, fintech product ops,
and an AI research startup.

2026—NOW    Capital One
            Emerging Payments & Strategy

2025—2026   Capital One
            Data Products & Experiences

2025        Outbuild · AWS

2024        Wefunder

2023        AskCyborg

View full career timeline →
```

This exact wording is not mandatory.

The important behavior is:

- visitors can understand the career arc in roughly 10 seconds
- the homepage does not become a detailed résumé
- the current and previous Capital One roles remain distinct
- previous employers appear as milestones rather than full entries
- one obvious CTA leads to the deeper view

Recommended CTA:

```text
View full career timeline →
```

Route:

```text
/career/
```

---

# 47. Dedicated `/career/` Page

Create a dedicated static Astro route:

```text
src/pages/career.astro
```

or the closest equivalent that matches the existing route architecture.

Public URL:

```text
/career/
```

This page should be linkable directly from:

- homepage Work
- applications
- résumé
- LinkedIn, if useful later

Do not implement the full career history as:

- a modal
- a drawer
- an accordion hidden inside the homepage
- a giant JavaScript overlay

It deserves a real URL and normal browser navigation.

---

# 48. Career Page Purpose

The Career page should feel like:

> a readable professional history with narrative continuity

not:

> a long résumé copied into HTML

The page should allow more context than the homepage while remaining curated.

Each career entry may include:

- year / date range
- employer
- role
- team / scope
- short context paragraph
- 1–3 selected outcomes
- one or two meaningful metrics
- relevant project links
- compact technologies only where useful

Do not display every achievement from `career-history.json`.

The JSON remains more complete than the public page.

---

# 49. Career Timeline Visual Direction

Use a restrained vertical timeline.

Recommended visual language:

- one thin vertical line
- quiet year labels
- employer names
- role names
- short descriptive copy
- generous white space
- no surrounding card for every job

Conceptually:

```text
2026
 │
 ●  Capital One
 │  Associate Data Analyst
 │  Emerging Payments & Strategy
 │
 │  Own consumer analytics across emerging payment experiences...
 │
 │  Selected work
 │  • ...
 │  • ...
 │
2025
 │
 ●  Capital One
 │  Associate Data Product Manager
 │  Data Products & Experiences
 │
 │  ...
```

The actual design should be cleaner than the ASCII representation.

Do not build:

- a zig-zag timeline
- alternating left/right cards
- a dense infographic
- oversized dots
- a Git-style visualization by default

The timeline is primarily a reading aid.

---

# 50. Role Transitions Under One Employer

When an employer contains multiple canonical roles, preserve the progression.

Capital One is the primary example.

Preferred:

```text
Capital One

2026—NOW
Associate Data Analyst
Emerging Payments & Strategy

2025—2026
Associate Data Product Manager
Data Products & Experiences
```

The page should communicate:

> same company, new role / scope

rather than making the positions look like unrelated employers.

Use the canonical role records from `career-history.json`.

Never infer the transition from old hard-coded copy.

---

# 51. Overlapping Experience Is Part of the Story

Kaung's work history includes meaningful overlaps.

Do not force the history into a fake single-thread sequence if multiple roles were happening simultaneously.

Examples may include periods where:

- Capital One and Outbuild overlap
- AWS precedes / overlaps other 2025 work
- USF ITS overlaps with university-era work
- venture / startup experiences overlap during college

The detailed Career page may subtly represent these overlaps.

Possible treatments:

## Option A — shared year grouping

```text
2025

Capital One
...

Outbuild
...

AWS
...
```

## Option B — subtle branch

A primary vertical career line with a secondary short branch for overlapping work.

If using a branch:

- keep it visually restrained
- do not make it look like a Git graph
- do not let diagram complexity overwhelm the text
- ensure mobile collapses cleanly into chronological stacking

Simple grouping is preferred unless the branch treatment genuinely improves clarity.

---

# 52. Narrative Eras

The Career page may group the timeline into broad narrative eras where helpful.

Suggested conceptual eras:

```text
NOW
Product, data, and payments

2025
AI systems + operating experience

2024
Fintech product operations

2023
Building + investing

EARLIER
College foundations
```

Possible content mapping:

```text
Product, data, and payments
  Capital One — Emerging Payments
  Capital One — Data Products

AI systems + operating experience
  Outbuild
  AWS

Fintech product operations
  Wefunder

Building + investing
  AskCyborg / CrossWork
  Energy Innovation Capital
  igniteXL

College foundations
  USF ITS
  selected leadership
```

These labels are optional.

If they feel forced or repetitive, use simple chronology instead.

Do not invent a narrative that contradicts the data.

---

# 53. Relationship Between Career and Projects

Where a project clearly belongs to a role or career chapter, the Career page may link to it.

Examples:

```text
Outbuild
Revenue Operations Analyst

Related work
→ AI Learning System
```

```text
AskCyborg / CrossWork
Co-Founder, Product Manager

Related project
→ AskCyborg
```

For Capital One:

- only link public-safe material
- do not expose internal systems or private artifacts
- EASE may be referenced only if its existing public-safe presentation remains appropriate

The goal is to make the site feel interconnected:

```text
career chapter
      ↓
related project
      ↓
deeper project story
```

Do not duplicate the entire project write-up inside the career timeline.

---

# 54. Optional Relationship Data

If meaningful and supported by the canonical records, relationships may be represented with IDs.

Possible pattern:

```json
{
  "experience_id": "outbuild",
  "related_project_ids": [
    "outbuild-learning-system"
  ]
}
```

This relationship can live:

- in canonical data if it is an intrinsic historical relationship
- or in portfolio config if it is purely a presentation decision

Use judgment.

The key rule is:

> do not duplicate project facts to express the relationship

Reference stable IDs.

---

# 55. Education on the Career Page

Education belongs naturally near the end of the full Career page.

Do not add a large new Education block to the homepage.

Recommended Career page ending:

```text
EDUCATION

Harvard University
Master of Liberal Arts (ALM) in Extension Studies, Data Science
Expected 2027

University of San Francisco
Bachelor of Science in Business Analytics
2021—2024
```

Use the exact canonical values in `career-history.json`.

If degree naming or dates change later, update the JSON rather than the page.

---

# 56. Leadership and Earlier Experience

The comprehensive dataset includes more earlier work and leadership than should appear prominently.

On `/career/`, these may be handled with a final section such as:

```text
Earlier
```

or:

```text
Leadership + foundations
```

Only include items that meaningfully contribute to the professional story.

Potentially relevant:

- USF ITS
- Alpha Phi Omega finance leadership
- Fiscal Affairs Council
- selected research / venture experiences

Do not turn the page into an exhaustive archive of every activity.

The canonical JSON remains the exhaustive record.

---

# 57. Skills on the Career Page

A compact skills summary may appear after the timeline.

Keep it short.

Possible:

```text
PRODUCT
product analytics · experimentation · strategy · PRDs

DATA
SQL · Python · Snowflake · Databricks · Tableau

BUILDING
TypeScript · Astro · AI coding agents · n8n
```

This must derive from canonical skill data or a presentation selection of canonical skills.

Do not add:

- skill bars
- proficiency percentages
- logo grids
- giant technology clouds

---

# 58. Homepage and Career Page Must Use the Same Data

Do not create:

```text
homepage-work.ts
career-page-work.ts
```

with separate factual copies.

Instead:

```text
career-history.json
        ↓
career.ts
        ↓
        ├── getCareerSummary()
        └── getCareerTimeline()
```

The exact helper names are flexible.

The architecture is not.

Both presentations should derive from the same canonical records.

---

# 59. Suggested Helper Additions

Extend `src/lib/career.ts` with helpers such as:

```ts
getCareerSummary()
getCareerTimeline()
getRolesForExperience(id)
getRelatedProjects(experienceId)
getCareerEducation()
```

Possible conceptual behavior:

```ts
getCareerSummary()
```

returns only the entries needed for the homepage.

```ts
getCareerTimeline()
```

returns all public career records in chronological order, including multiple roles under an employer.

Do not hard-code titles or dates inside these functions.

They should select canonical data, not recreate it.

---

# 60. Homepage Presentation Config

The portfolio config may explicitly select summary milestones.

Example:

```ts
export const portfolioConfig = {
  work: {
    summaryExperienceIds: [
      'capital-one',
      'outbuild',
      'aws-keywords',
      'wefunder',
      'askcyborg-crosswork'
    ],

    careerPageHref: '/career/'
  }
};
```

If Capital One has two canonical roles, the homepage summary may show both.

The config decides visibility and order.

The JSON decides what the roles are.

---

# 61. Career Page Presentation Config

If useful, add a Career-page-specific presentation block:

```ts
career: {
  experienceIds: [
    ...
  ],

  showEducation: true,
  showLeadership: true
}
```

Again:

- IDs / grouping belong here
- facts do not

Do not introduce duplicate descriptions unless they are explicitly website-only summaries keyed to canonical IDs.

---

# 62. Three Levels of Information Density

The intended portfolio architecture now has three levels:

```text
HOME
"Who is this person?"
10-second understanding

/CAREER/
"What exactly has he done?"
chronological professional history

/PROJECTS/... or existing project routes
"How did he approach this?"
deep project story
```

This should guide content density.

Do not let:

- homepage become Career page
- Career page become project case study
- project page become résumé

Each layer has a distinct job.

---

# 63. Nature on the Career Page

The Career page should remain part of the nature-first visual world, but nature must stay subtle during reading.

Good:

- same atmospheric background system
- quieter trees at the edges
- soft mist / reading wash
- restrained weather continuity
- same day/dawn/dusk/night palette

Avoid:

- literal tree branches representing jobs
- leaves representing promotions
- animated roots
- dramatic nature metaphors
- decorative branch diagrams around text

One optional long-term concept:

> the timeline line may feel slightly trail-like rather than mathematically perfect

If explored, keep it extremely subtle.

Content remains primary.

---

# 64. Career Page Motion

Use very little UI motion.

Allowed:

- small fade as timeline entries enter
- subtle active-year indication
- smooth anchor behavior

Avoid:

- timeline drawing itself dramatically
- nodes exploding into view
- parallax career cards
- animated counters
- expanding trees
- branching animations

Nature can move.

Career content should mostly stay still.

---

# 65. Career Page Mobile Behavior

On mobile:

- use one vertical column
- timeline sits on the left edge or disappears entirely
- roles stack chronologically
- overlapping experiences become simple chronological groups
- no branching diagram is required
- no horizontal scrolling
- project relationships become ordinary text links

Do not preserve a desktop visualization at the expense of readability.

---

# 66. Career Page SEO and Static Rendering

`/career/` must be statically rendered by Astro.

All career text should exist in generated HTML.

Do not:

- load career data via client fetch
- require JavaScript to reveal the timeline
- hide every entry behind accordions
- inject career content after page load

This page should work as a plain HTML document if scripts fail.

---

# 67. Career Page Metadata

Add appropriate page metadata.

Suggested title:

```text
Career | Kaung Thiha
```

Suggested description direction:

```text
Kaung Thiha's career across product, data, AI, fintech, and analytics,
including Capital One, AWS, Outbuild, Wefunder, and AskCyborg.
```

Keep the wording factual and concise.

Reuse existing site metadata patterns.

---

# 68. Navigation to and From Career

Homepage:

```text
View full career timeline →
```

Career page should provide an obvious way back:

```text
← Back
```

or use the site's existing inner-page navigation pattern.

Do not create a large breadcrumb system.

Optional:

```text
Work / Career
```

only if it matches the existing design.

---

# 69. Career Page URL Stability

Treat:

```text
/career/
```

as a permanent public route.

Do not use:

```text
/career.html
/resume-history/
/about/work/
```

unless the repo's routing conventions require otherwise.

If route structure changes later, add redirects.

---

# 70. Updated Acceptance Criteria

In addition to the earlier acceptance criteria:

- [ ] Homepage Work remains highly concise
- [ ] Homepage includes a clear `View full career timeline →` CTA
- [ ] `/career/` exists as a dedicated static route
- [ ] `/career/` derives facts from `career-history.json`
- [ ] Homepage Work and `/career/` do not maintain separate factual copies
- [ ] Capital One's two-role progression is visible and accurate
- [ ] overlapping career experiences are represented honestly
- [ ] Career page does not become a raw résumé dump
- [ ] Career page selectively shows outcomes and metrics
- [ ] related projects may be linked by stable canonical IDs
- [ ] education is derived from canonical data
- [ ] earlier experience is curated rather than exhaustively dumped
- [ ] Career page remains readable without JavaScript
- [ ] Career page remains visually consistent with the minimal nature-first design
- [ ] mobile Career view is a simple vertical chronology
- [ ] `/career/` has appropriate metadata
- [ ] route works in the production static build

---

# 71. Revised Final Architecture

```text
                         career-history.json
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
              src/lib/career.ts        portfolio-config.ts
                    │                           │
          ┌─────────┴─────────┐                 │
          │                   │                 │
 getCareerSummary()    getCareerTimeline()      │
          │                   │                 │
          ↓                   ↓                 │
      HOMEPAGE            /career/              │
          │                   │                 │
  concise milestones      full timeline         │
  10-second scan          selected detail       │
          │                   │                 │
          └──────────┬────────┘                 │
                     │                          │
                     └──── canonical IDs ───────┘
                              │
                              ↓
                         Project pages
```

Loves remains separate.

Schema remains development-only.

---

# 72. Revised Final Instruction to Claude

The visual redesign is complete.

This task has two goals:

1. integrate `career-history.json` as the canonical source of truth
2. add progressive disclosure for career history

Preserve the current homepage design.

Refactor the homepage Work section into a concise career summary powered by canonical data.

Add a dedicated static `/career/` route containing a deeper, chronological, public-safe career timeline using the same canonical records.

Do not create a second source of truth for the Career page.

Do not turn the homepage into a résumé.

Do not turn `/career/` into a raw résumé dump.

The final information architecture should be:

```text
Homepage
  → fast understanding

Career
  → deeper professional history

Projects
  → deeper work stories
```

The canonical JSON should remain comprehensive.

The visible experience should remain intentional and restrained.
