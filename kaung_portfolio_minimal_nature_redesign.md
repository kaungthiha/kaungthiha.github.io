# Kaung Thiha Portfolio — Minimal Nature-First Redesign Brief

**Repository:** `kaungthiha/kaungthiha.github.io`  
**Production:** `https://kaungthiha.github.io/`  
**Primary goal:** Simplify the portfolio dramatically while making the nature system feel more intentional, immersive, and central to the site's identity.

---

# 1. Product Direction

The current portfolio has a strong core idea:

> A personal portfolio living inside a changing natural landscape.

That idea should become the dominant design system.

The current implementation adds too many secondary visual systems on top of it:

- glass surfaces
- large frosted content panels
- serif display typography
- multiple font families
- oversized tab navigation
- nested detail panels
- project index interactions
- animated background blooms
- ripple effects
- weather effects
- forest animation
- ambient particles
- birds
- clouds
- fireflies
- butterflies
- falling leaves
- fog wisps
- stars
- shooting stars
- camera drift
- hover typography changes

Individually, many of these are attractive.

Together, they compete.

The redesign principle is:

> **Nature is the environment. Content is quiet.**

Do not make the nature system smaller or more generic in order to simplify the site.

Instead:

- let the landscape become the memorable visual identity
- remove most UI decoration
- reduce interaction complexity
- reduce typography complexity
- reduce the number of featured projects
- make content immediately readable
- use atmospheric natural effects instead of obvious interface containers

The site should feel like:

> walking from an atmospheric landscape into a quiet clearing where the content is easy to read.

---

# 2. Desired Feeling

The redesign should feel:

- minimal
- calm
- personal
- thoughtful
- highly readable
- nature-first
- editorial
- understated
- technically polished
- distinctive without feeling over-designed

It should not feel like:

- a dashboard
- a SaaS landing page
- a glassmorphism demo
- a component showcase
- an interactive résumé app
- an experimental Three.js showcase
- a card wall
- a design portfolio trying to demonstrate every interaction pattern at once

---

# 3. What to Preserve

Preserve the following unless a change is explicitly required by this brief.

## Identity

Keep:

- Kaung Thiha branding
- hero portrait
- `I'm Kaung`
- Burmese name `(ကောင်းသီဟ)`
- Arlington weather text
- LinkedIn
- Spotify
- conversational personal voice

## Nature system

Keep the overall concept of:

- Three.js forest
- trees
- mountains / horizon
- weather-responsive atmosphere
- day / dawn / dusk / night behavior
- weather-aware sky
- weather-aware lighting
- weather-aware fog
- weather-aware movement
- WebGL fallback
- reduced-motion behavior

The forest is a signature feature.

Do not replace it with:

- a static gradient
- stock nature photography
- a generic hero illustration
- a plain background image

## Technical foundation

Keep:

- Astro
- static output
- GitHub Pages deployment
- GoatCounter
- root-relative route behavior
- current inner-page compatibility
- current weather data system
- current progressive performance work around Three.js
- lazy forest loading
- current accessibility work where still applicable

Do not add a client framework unless absolutely necessary.

---

# 4. Major UX Change: Remove the Tabbed Portfolio App

The current homepage uses:

- `PortfolioShell`
- `work / stuff / loves`
- hidden panels
- master/detail behavior
- sticky tabs
- project selection state
- work highlight state
- hash-controlled application-style section switching

Replace this with one natural scrolling document.

New homepage flow:

```text
Hero
↓
Work
↓
Create
↓
Loves
↓
Contact / Footer
```

Use a tiny sticky anchor navigation after the hero:

```text
work    create    loves
```

Behavior:

- clicking `work` scrolls to Work
- clicking `create` scrolls to Create
- clicking `loves` scrolls to Loves
- active section may update subtly using IntersectionObserver
- deep links may still use:
  - `#work`
  - `#create`
  - `#loves`

Do not hide major homepage sections.

All primary content should exist in normal document flow.

This improves:

- scanning
- recruiter behavior
- SEO
- no-JS access
- accessibility
- browser navigation
- simplicity
- perceived performance

---

# 5. Hero Redesign

The current forest behavior is backwards from the desired emphasis.

At present:

- the forest starts nearly invisible on the hero
- it becomes highly visible once the user enters the content

Reverse this hierarchy.

## Hero

The hero should be the most visually immersive part of the site.

Target forest presence:

```text
Hero:       ~0.80–1.00
Transition: ~0.45–0.60
Content:    ~0.15–0.30
```

These values are directional, not mandatory.

The user should immediately understand:

> this portfolio lives in a natural environment.

## Hero content

Keep:

- portrait
- name
- Burmese name
- live weather text
- social links
- scroll cue

Consider reducing the portrait slightly so the landscape has more room.

The hero should not have a large persistent glass header.

---

# 6. Remove the Homepage Glass Header

The current homepage has a large fixed glass pill containing essentially the brand.

Remove it.

The hero already says:

> I'm Kaung

Repeating the brand inside a prominent fixed UI element adds noise.

Preferred options:

## Option A — no hero header

Nothing persistent at the top while the hero is visible.

When the user scrolls into the content area, fade in a minimal text nav:

```text
Kaung Thiha                         work   create   loves
```

## Option B — tiny brand only

A plain:

```text
Kaung Thiha
```

or:

```text
KT
```

at the top-left with no background container.

Do not use:

- a pill
- gradient circle
- glass backdrop
- heavy border
- shadow
- large navbar height

---

# 7. Replace Glass With Atmospheric Readability

The current portfolio content is contained inside a large rounded frosted panel.

Remove the obvious card/panel appearance.

Instead create a reading zone using atmospheric effects.

Think:

> fog clearing around the text

Use a subtle central wash such as:

- soft white / pale-blue radial gradient
- backdrop brightness
- low-strength blur
- subtle mist
- a gradient that is strongest behind text and fades naturally into the forest

The reading zone should not have visually obvious rectangular boundaries.

Suggested concept:

```css
.content-reading-zone::before {
  content: '';
  position: absolute;
  inset: -10vh -8vw;
  background:
    radial-gradient(
      ellipse at center,
      rgba(248, 251, 253, 0.94) 0%,
      rgba(248, 251, 253, 0.82) 38%,
      rgba(248, 251, 253, 0.45) 62%,
      transparent 82%
    );
  pointer-events: none;
  z-index: -1;
}
```

Adapt for dark / dawn / dusk.

This should feel atmospheric, not like a visible translucent rectangle.

Use glass only where it genuinely improves a small interactive element.

---

# 8. Simplify Background Effects

Remove nonessential decorative systems that do not strengthen:

1. nature
2. information
3. identity

## Remove

Remove or disable on the homepage:

- blue bloom blobs from `body::before`
- blue bloom blobs from `body::after`
- ripple canvas
- decorative gradient glow that is unrelated to weather
- UI glow effects
- unnecessary hover lift

These are visual decoration layered on top of an already rich visual system.

The forest already supplies depth.

The weather already supplies color.

Do not add another decorative atmosphere system.

---

# 9. Simplify Forest Motion

The current forest system is technically impressive but supports too many simultaneous ambient elements.

Current system includes some combination of:

- tree sway
- clouds
- birds
- motes
- fireflies
- falling leaves
- fog wisps
- butterflies
- stars
- god rays
- shooting stars
- camera drift
- weather precipitation

Use the following rule:

> **One baseline motion + one contextual ambient effect.**

## Baseline

Keep:

- gentle tree movement

## Contextual effect

Allow one main secondary effect based on weather / time.

Example mapping:

| Context | Secondary effect |
|---|---|
| Clear day | distant birds |
| Wind | stronger tree sway |
| Rain | rain |
| Storm | rain + darker lighting, but no extra decorative effect |
| Snow | snowfall |
| Fog | fog wisps |
| Dusk | fireflies |
| Night | stars |
| Cold clear night | stars |
| Hot clear day | subtle haze |

Do not simultaneously run:

- birds
- butterflies
- motes
- falling leaves
- god rays
- camera drift
- clouds

unless there is a strong visual reason.

Rare effects become more memorable when they are actually rare.

---

# 10. Reduce Continuous Animation During Reading

Once the hero is substantially off-screen:

- reduce forest opacity
- stop camera drift
- reduce tree animation intensity
- disable unnecessary ambient animation
- consider pausing the requestAnimationFrame loop and rendering a mostly static frame

Potential behavior:

```text
Hero visible:
full atmospheric animation

Hero partially visible:
reduced animation

Hero gone:
mostly static forest frame
```

Resume animation when the user scrolls back toward the hero.

This improves:

- calmness
- battery usage
- GPU usage
- focus on reading
- mobile performance

The existing forest code already contains:

- pause handling
- reduced-motion handling
- render-once support

Build on those systems rather than rewriting them.

---

# 11. Typography Simplification

The current site imports four font families:

- Cormorant Garamond
- Plus Jakarta Sans
- Inter
- Source Serif 4

Reduce to two.

Recommended:

## Sans

`Plus Jakarta Sans`

Use for:

- navigation
- labels
- body copy
- metadata
- buttons
- project descriptions
- work entries

## Serif

`Source Serif 4`

Use for:

- section headings
- occasional editorial emphasis
- project titles if desired

Remove:

- Cormorant Garamond
- Inter

unless one is still required elsewhere on the site.

Do not switch fonts on hover.

Do not use typography change itself as an interaction effect.

---

# 12. Reduce Type Scale

Some current text is too large for the amount of information on screen.

Examples in the current CSS:

- Work prose around 25px+
- detail body copy around 22px+
- section tabs around 21px+
- multiple metadata styles above 19px

Target approximately:

```text
Body:               17–18px
Project description:17–18px
Work description:   17–18px
Navigation:         14–15px
Metadata:           12–14px
Project title:      22–28px
Section heading:    42–56px
Hero:               keep expressive
```

Do not make all portfolio content feel like display typography.

The content should feel confident enough to be quiet.

---

# 13. Work Section Redesign

The current Work section uses clickable company names inside prose.

Clicking fills a right-hand detail panel.

Remove this interaction.

The user should not have to click to understand the résumé.

Use a simple vertical editorial chronology.

Example:

```text
WORK

I work where product, data, and AI overlap.

2025—NOW
Capital One
Associate Data Product Analyst
Building data products and adoption systems across Card.
Selected work spans usage analytics, automation, and data-product discovery.

2025
Outbuild
Revenue Operations Analyst
Built RevOps systems and an AI-assisted learning workflow that cut
sales onboarding from ~4 weeks to ~1.

2025
Amazon Web Services
Research Associate 3
Worked on LLM / agentic-model evaluation and human-in-the-loop operations.

2024
Wefunder
Product Operations
Built and operated product systems across investor experience and compliance.

2023
AskCyborg
Co-Founder / Product
Shipped an AI SEC-research MVP and owned the product roadmap.
```

Use:

- dates as quiet anchors
- company
- role
- one concise description
- at most one or two standout metrics where appropriate

Do not display every résumé bullet.

The résumé PDF exists for detail.

## Suggested visible roles

Show:

1. Capital One
2. Outbuild
3. AWS
4. Wefunder
5. AskCyborg

Then:

```text
Earlier work →
```

which can reveal or link to:

- USF ITS
- internships
- university leadership

---

# 14. Fix the Résumé Link

Current source:

```ts
export const resumeHref = '/assets/Kaung_Thiha_Resume.pdf';
```

The corresponding file does not currently exist in the repository.

Fix this.

Either:

1. add the current public résumé PDF at that exact route

or:

2. update the path to the actual current résumé file

Do not leave the CTA pointing to a 404.

Also verify the link in the production build.

---

# 15. Create Section Redesign

The current Create section gives eight projects equivalent interaction weight.

Reduce the hierarchy.

Feature approximately four projects.

Recommended featured projects:

1. Festival Thingamabob / SheepHerder
2. Outbuild AI Learning System
3. AskCyborg
4. EASE

These provide strong variety across:

- personal product
- AI automation
- startup/product history
- product design / case study

## Homepage representation

Do not use a master-detail app.

Use large, simple project stories.

Example:

```text
CREATE

Things I've built, tested, and learned from.


Festival Thingamabob
Festival planning without the spreadsheet headache.

React · TypeScript · Supabase
Live tool →

[one image]


Outbuild AI Learning System
An automated learning system that helped cut onboarding from
~4 weeks to ~1.

Claude · Notion · n8n
Case study →

[one image]
```

Each project should contain:

- title
- one or two sentence summary
- optional standout result
- compact stack
- one primary CTA
- one strong image where available

Do not put every detail on the homepage.

Move complexity into project pages / PDFs.

---

# 16. Small Experiments

Do not delete the other projects.

Demote them into a simple text area.

Example:

```text
SMALL EXPERIMENTS

Attendance Tracker
Reddit Pulse
AI Usage Tracker
Early Wage Access Proposal
```

Optionally add one sentence per item.

No large card.

No large screenshot.

No equal visual weight with featured work.

This communicates:

> I build a lot of things.

without communicating:

> every prototype is equally important.

---

# 17. Loves Section

Keep Loves very simple.

Do not turn it into a carousel.

A carousel adds:

- controls
- state
- animation
- hidden content
- responsive complexity

The current text-based list is conceptually closer to the desired minimal direction.

Refine it into a personal field-notes section.

Potential categories:

- outside
- cooking
- books
- worlds
- language
- music

Example:

```text
LOVES

outside
Forests, mountains, long hikes, weather, and being somewhere with no signal.

cooking
The Soul of a Chef, tasting menus, Thai food, and recipes that become
three-hour side quests.

worlds
Warhammer 40K and any fictional universe with irresponsible amounts of lore.

language
Relearning Japanese after letting it slip.

music
Basic raver taste. Spotify is public.

reading
Whatever rabbit hole has me locked in this month.
```

The voice should feel personal, not curated for recruiters.

---

# 18. Incorporate Real Nature Into Loves

Nature should not exist only as a visual background.

If Kaung has personal nature photography, use it here.

Examples:

- hiking photo
- mountain photo
- trail
- cabin
- forest
- landscape from a trip
- phone photo with emotional meaning

Prefer:

> a real imperfect personal photograph

over:

> polished stock nature imagery

Use one or two images maximum.

Do not turn Loves into a photo gallery.

---

# 19. Navigation

After the hero, use minimal anchor navigation.

Desktop concept:

```text
Kaung Thiha                               work   create   loves
```

Mobile:

```text
Kaung Thiha
work   create   loves
```

or only:

```text
work   create   loves
```

Behavior:

- transparent
- no pill
- no large border
- no heavy backdrop
- optional tiny blur only if needed for contrast
- underline or opacity shift for active section

Avoid:

- uppercase display-sized tabs
- separators like `|`
- large sticky tab containers
- heavy section transitions

---

# 20. Section Layout

Do not wrap the entire portfolio in a visible card.

Use:

```text
max-width: 760–880px
```

for primary reading content.

For project images, allow breakout widths:

```text
max-width: 1000–1100px
```

Section spacing should be generous:

```text
Hero → Work:      15–25vh
Work → Create:    160–220px
Create → Loves:   160–220px
Loves → Contact:  140–200px
```

The page should breathe.

---

# 21. Interaction Rules

Before adding an interaction, ask:

> Does this interaction help someone understand Kaung faster?

If no, remove it.

Prefer:

- scroll
- hover underline
- image zoom only where needed
- direct links
- anchor navigation

Avoid:

- content hidden behind click
- master/detail UI
- typography-switch hover effects
- lift animations
- cards growing on hover
- automatic carousels
- animated section tabs
- flip interactions
- custom scrolling
- decorative scroll-jacking

---

# 22. Motion Rules

Motion should be concentrated in nature.

UI motion should be minimal.

Allowed:

- subtle opacity change
- subtle underline
- small section reveal
- smooth anchor scroll
- image fade-in

Avoid:

- translating entire sections
- large rise animations
- spring motion
- hover lift
- animated card geometry
- animated font changes

Nature can move.

The interface should mostly stay still.

---

# 23. Weather Integration

Keep weather integration, but move its effect away from interface chrome.

Weather should primarily affect:

- sky
- forest lighting
- fog
- precipitation
- wind
- scene color
- hero atmosphere

It should minimally affect:

- text
- cards
- navigation

The UI should remain stable while the natural environment changes.

That creates a stronger illusion that:

> the content exists inside the weather

rather than:

> the website has weather-themed components.

---

# 24. Mobile Strategy

Mobile should become simpler than desktop.

Do not preserve desktop interactions by shrinking them.

On mobile:

- natural vertical scroll
- smaller hero portrait
- forest reduced slightly for readability
- no sticky two-column behavior
- no master/detail
- no project selector UI
- one-column project stories
- restrained section headings
- minimal nav
- no expensive secondary ambient effects

If needed, use a lower forest quality tier automatically.

Keep:

- weather
- trees
- atmospheric identity

Remove:

- secondary visual complexity

---

# 25. Accessibility

Maintain:

- one clear `<h1>`
- logical headings
- visible focus
- skip link
- alt text
- reduced-motion support
- keyboard-accessible nav
- sufficient contrast
- semantic links
- direct access to every project
- direct access to every section

Because the new homepage is linear, no primary content should require JavaScript to become readable.

The page should still make sense if:

- JavaScript fails
- Three.js fails
- CSS backdrop blur fails
- reduced motion is enabled

---

# 26. Fix the No-JS Contradiction

The current source comments state that all section content remains readable without JS.

However:

- `.pf-section` defaults to `display: none`
- only the active panel is displayed
- `data-active="work"` exists in initial markup

This means the current implementation does not truly expose all homepage content in a no-JS scenario.

The linear-document redesign should remove this issue entirely.

Do not replace it with another hidden-panel system.

---

# 27. Performance

Preserve current good performance decisions:

- lazy forest bundle
- DPR cap
- visibility pause
- reduced-motion static mode
- static Astro build
- lazy project images

Improve further by:

- pausing forest motion when well below hero
- reducing simultaneous ambient layers
- removing ripple canvas
- removing animated bloom blobs
- reducing font downloads from four families to two
- avoiding unnecessary client state
- removing hidden section content logic
- avoiding new dependencies

Do not use:

- React
- Framer Motion
- GSAP
- carousel libraries
- UI libraries

for this redesign.

---

# 28. Content Voice

Keep the site sounding like Kaung.

Good:

- conversational
- playful
- specific
- occasional joke
- first person
- short sentences
- direct explanations
- admitting when a project was an experiment

Examples of acceptable voice:

> Mostly data and product, some building.

> Plus, I like to min/max.

> I made this for some APM app oomph.

> Sometimes you just want to read about a doomed galaxy before bed.

Do not aggressively corporate-polish these.

Avoid:

- thought leadership language
- excessive product jargon
- generic portfolio copy
- overly polished AI-written prose

Fix obvious typos while preserving personality.

---

# 29. Copy Cleanup

There are several existing copy issues worth cleaning while refactoring.

Examples include:

- `inthe day` typo in Loves
- spacing around `GPT- 3.5`
- awkward punctuation / double spaces
- `auto generates` → `auto-generates`
- inconsistent capitalization
- `personalised` vs US English elsewhere
- casual sentences that could be tightened without losing voice

Do not rewrite the entire site into bland prose.

Light edit only.

---

# 30. Proposed Component Architecture

The implementation can become substantially simpler.

Possible structure:

```text
src/
  components/
    portfolio/
      MinimalNav.astro
      WorkSection.astro
      CreateSection.astro
      ProjectStory.astro
      ExperimentsList.astro
      LovesSection.astro
      ContactFooter.astro

  data/
    work.ts
    projects.ts
    loves.ts

  pages/
    index.astro

  scripts/
    forest.ts
    homepage-observer.ts
```

Retire if no longer needed:

```text
PortfolioShell.astro
SectionSwitcher.astro
portfolio-navigation.ts
```

unless a simplified version remains useful.

The final architecture should reflect a document, not an application.

---

# 31. CSS Simplification

Audit `public/assets/css/editorial.css`.

Remove obsolete selectors related to:

- `.pf-surface`
- `.pf-switcher`
- `.pf-tab`
- `.pf-panels`
- `.pf-detail-panel`
- `.pf-highlight`
- `.pf-project-index`
- `.pf-project-item`
- `.pf-project-detail`
- old tab animation
- work detail interaction
- master/detail layout
- bloom animation
- ripple canvas
- unnecessary glass variables

Retain or simplify tokens for:

- text
- weather-aware background
- nature
- section width
- typography
- spacing
- minimal nav
- images
- focus
- dark mode

The CSS file should become noticeably smaller after this redesign.

---

# 32. Suggested Design Tokens

Keep the token system restrained.

Possible foundation:

```css
:root {
  --content-max: 820px;
  --project-max: 1080px;

  --text: #172027;
  --text-soft: #52606a;
  --text-muted: #7c878f;

  --reading-bg: rgba(248, 251, 253, 0.88);

  --sans: 'Plus Jakarta Sans', system-ui, sans-serif;
  --serif: 'Source Serif 4', Georgia, serif;

  --body-size: 1.0625rem;
  --small-size: 0.875rem;

  --section-space: clamp(9rem, 15vw, 14rem);
}
```

Avoid creating dozens of UI-specific tokens for card states that no longer exist.

---

# 33. Suggested Homepage Structure

Target HTML concept:

```html
<header class="hero">
  <!-- existing forest -->
  <!-- portrait -->
  <!-- name -->
  <!-- weather -->
  <!-- social -->
  <!-- explore -->
</header>

<nav class="minimal-nav">
  <a href="#work">work</a>
  <a href="#create">create</a>
  <a href="#loves">loves</a>
</nav>

<main>
  <section id="work">
    ...
  </section>

  <section id="create">
    ...
  </section>

  <section id="loves">
    ...
  </section>
</main>

<footer>
  ...
</footer>
```

Keep semantic structure obvious.

---

# 34. Contact / Ending

The page currently focuses heavily on sections but needs a deliberate ending.

Use a very simple footer.

Example:

```text
Say hi.

LinkedIn
GitHub
Email
```

Optional final line:

```text
Made in Arlington, under whatever weather is happening outside.
```

Keep it understated.

Do not create another giant CTA card.

---

# 35. Nature as a System, Not Decoration

The strongest long-term direction is to treat nature as the site's real design system.

Examples:

## Weather

Real Arlington weather affects the landscape.

## Time

Real local daylight affects:

- color
- stars
- sky
- lighting

## Season

Future optional enhancement:

- spring foliage
- summer fullness
- fall leaf color
- winter sparsity

Do not implement seasonal behavior unless it is simple and robust.

## Reading

The landscape quiets while the user is reading.

## Return to hero

The landscape wakes back up.

This is a much more cohesive concept than stacking visual effects.

---

# 36. Things Not to Add

Do not add:

- more glass
- more cards
- more gradients
- more font families
- more interactive tabs
- scroll-snap sections
- a custom cursor
- background music
- parallax text
- another particle system
- floating technology icons
- animated résumé stats
- skill progress bars
- skill cards
- project carousels
- testimonial blocks
- GitHub contribution widgets
- Spotify widgets
- AI chat assistant
- chatbot
- elaborate footer animation

The design needs subtraction.

---

# 37. Implementation Sequence

## Phase 1 — baseline

Before modifying:

1. inspect current homepage
2. run production build
3. capture desktop screenshot
4. capture mobile screenshot
5. confirm current forest behavior
6. confirm weather behavior
7. identify active deployment workflow
8. confirm résumé 404
9. document console warnings

## Phase 2 — simplify structure

1. remove hidden panel architecture
2. render Work / Create / Loves in normal flow
3. replace section tabs with anchors
4. remove work detail interaction
5. remove Create master/detail interaction
6. simplify JS

## Phase 3 — simplify visual system

1. remove homepage glass header
2. remove large frosted content panel
3. add atmospheric reading wash
4. remove blooms
5. remove ripple
6. reduce font families
7. normalize type scale
8. simplify active navigation state

## Phase 4 — simplify content

1. shorten Work
2. feature four projects
3. move remaining projects to Small Experiments
4. refine Loves
5. light copyedit
6. fix résumé link
7. add simple ending/footer

## Phase 5 — nature pass

1. increase hero forest visibility
2. reduce forest visibility during reading
3. simplify ambient layers
4. pause or reduce animation below hero
5. verify weather modes
6. verify night mode
7. verify reduced motion

## Phase 6 — responsive + accessibility

Test:

- mobile
- tablet
- laptop
- ultrawide
- keyboard
- no-JS
- reduced motion
- WebGL failure
- light theme
- dawn
- dusk
- dark
- rain
- snow
- fog

## Phase 7 — final cleanup

Remove:

- dead CSS
- dead TypeScript
- unused components
- unused font imports
- obsolete design tokens
- inactive state logic
- unnecessary comments describing removed systems

---

# 38. Acceptance Criteria

The redesign is complete when:

- [ ] The forest is visually prominent on first arrival.
- [ ] The landscape becomes quieter once the user reads content.
- [ ] Work, Create, and Loves are all part of one scrollable page.
- [ ] No primary homepage content is hidden behind tabs.
- [ ] The large frosted content card is gone.
- [ ] The homepage glass-pill header is gone or reduced to plain text.
- [ ] Background bloom blobs are removed.
- [ ] Ripple effect is removed from the homepage.
- [ ] UI uses no more than two font families.
- [ ] Body text is approximately 17–18px.
- [ ] Work is readable without clicking.
- [ ] Work shows only the most important career chapters.
- [ ] Create has about four featured projects.
- [ ] Secondary projects appear as small experiments.
- [ ] Loves remains simple and personal.
- [ ] Nature is represented as content as well as atmosphere.
- [ ] Forest animation is reduced when reading.
- [ ] Ambient nature effects do not compete simultaneously.
- [ ] Résumé link works.
- [ ] All homepage content remains readable without JavaScript.
- [ ] Reduced-motion behavior still works.
- [ ] GitHub Pages static build still succeeds.
- [ ] Existing project/tool routes remain valid.
- [ ] Weather still updates the environment.
- [ ] Dark / dawn / dusk states remain readable.
- [ ] Mobile feels simpler than desktop.
- [ ] There are no console errors.
- [ ] Dead CSS and JS from the old portfolio app are removed.

---

# 39. Final Design Test

Before approving any visual decision, ask three questions.

## 1. Does this help someone understand Kaung?

If not, remove it.

## 2. Does this strengthen the feeling of being inside a natural environment?

If not, question it.

## 3. Is the site calmer after adding this?

If not, do not add it.

The goal is not a less interesting portfolio.

The goal is:

> **a much quieter interface around a much stronger idea.**

The nature should be memorable.

The work should be easy to understand.

The UI should almost disappear.
