---
name: Kaung's Editorial Portfolio System
colors:
  surface: '#f5faff'
  surface-dim: '#d4dbe0'
  surface-bright: '#f5faff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef4fa'
  surface-container: '#e8eff4'
  surface-container-high: '#e2e9ef'
  surface-container-highest: '#dde3e9'
  on-surface: '#161c21'
  on-surface-variant: '#414754'
  inverse-surface: '#2a3136'
  inverse-on-surface: '#ebf2f7'
  outline: '#727786'
  outline-variant: '#c1c6d7'
  surface-tint: '#005bbf'
  primary: '#0059bb'
  on-primary: '#ffffff'
  primary-container: '#0070ea'
  on-primary-container: '#fefcff'
  inverse-primary: '#acc7ff'
  secondary: '#006780'
  on-secondary: '#ffffff'
  secondary-container: '#23d1ff'
  on-secondary-container: '#00566b'
  tertiary: '#406072'
  on-tertiary: '#ffffff'
  tertiary-container: '#59798c'
  on-tertiary-container: '#fbfcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#acc7ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004492'
  secondary-fixed: '#b8eaff'
  secondary-fixed-dim: '#50d5ff'
  on-secondary-fixed: '#001f28'
  on-secondary-fixed-variant: '#004d61'
  tertiary-fixed: '#c6e7fd'
  tertiary-fixed-dim: '#aacbe0'
  on-tertiary-fixed: '#001e2c'
  on-tertiary-fixed-variant: '#2b4a5c'
  background: '#f5faff'
  on-background: '#161c21'
  surface-variant: '#dde3e9'
  sky-start: '#D0E5FC'
  sky-end: '#A0CDEB'
  frost-surface: '#F8FBFD'
  frost-glow: '#C7E8FE'
  text-strong: '#171D27'
  text-body: '#737A7F'
  accent-gradient: 'linear-gradient(135deg, #2480FD 0%, #26A1FF 50%, #22D1FF 100%)'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-section:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  body-large:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-main:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  nav-item:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1100px
  gutter: 24px
  section-gap-desktop: 120px
  section-gap-mobile: 64px
  card-padding: 32px
---

# kaungthiha.github.io Portfolio Revamp

## Context

The current site is a static GitHub Pages one-pager with a distinctive blue sky, frosted-glass visual identity and two ambient interaction ideas: a weather-themed background mode selector and a cursor-driven water effect. The content inventory is already good and should remain substantially the same. The redesign should focus on presentation, structure, mobile behavior, and tone rather than on adding large new content sections.

The current desktop composition is visually memorable but structurally rigid. It relies on one oversized central shell, right-edge divider tabs, small icon controls, and section layouts that do not scale fluidly across viewports. About is dense, while Tools for Friends and Current Stuff feel sparse and underweighted.

The site should become more personal without becoming cluttered. The goal is not to dump every interest onto the page. The goal is to let the design carry more of the personality: background in Myanmar/Burma, reading, badminton, raves, and Warhammer can surface through selective photography, tighter labels, and stronger “what I’m into now” framing.

## Goals

- Preserve the current palette and soft weather/water emotional language
- Preserve the current content inventory and one-page simplicity
- Improve mobile behavior at 375px and across common breakpoints
- Replace decorative navigation with clearer, more tappable section navigation
- Add personality through restrained use of real personal photography
- Keep animations, but make them optional, lighter, and responsive-safe
- Unify iconography and strengthen visual hierarchy
- Improve accessibility, focus visibility, contrast, and touch ergonomics

## Current Audit

### Live findings

Direct live HTML/CSS/JS inspection was unavailable in the research environment, so exact source-level details remain unspecified:
- exact media queries
- exact image file names and formats
- exact animation implementation
- exact reduced-motion behavior
- exact performance metrics

### Visible current-state findings

The current design uses:
- a large frosted central panel against a pale blue full-bleed background
- a blue gradient title bar
- right-side stacked section tabs
- a two-column About layout
- horizontal project cards with category pills and thumbnail illustrations
- two tool cards in a wide sparse section
- three “Current Stuff” rows for learning, reading, and watching
- illustrated assets throughout instead of real photography

Strengths:
- distinct visual identity
- cohesive custom illustration language
- memorable atmosphere
- thoughtful content categories
- a clear “current stuff” concept worth preserving

Weaknesses:
- rigid desktop-first shell
- weak mobile scaling
- rotated side-tab navigation
- small touch targets
- body text that reads too small in relation to the canvas
- too much empty panel space in lower-density sections
- limited use of authentic personal imagery

## Design Direction

The site should move from “interactive panel deck” toward “calm editorial portfolio.”

Design thesis:
**professional center, personal edges**

Interpretation:
- the center of the page explains what I do
- the edges of the experience reveal who I am
- motion stays atmospheric, not dominant
- personality appears through photo moments, labels, captions, and section framing
- layout becomes simpler even as the site feels more human

The visual tone should remain:
- airy
- soft
- glassy
- weather-adjacent
- lightly playful

The site should not become:
- neon
- utilitarian
- dark-mode-first
- card-noisy
- app-dashboard-heavy

## IA & Layout

### Recommended page order

1. Sticky top rail
2. Hero / About
3. Personal photo strip
4. Recent Projects
5. Tools for Friends
6. Current Stuff
7. Contact / footer

### Navigation

Replace right-edge divider tabs with a sticky top navigation rail.

Desktop:
- pill or chip-style labels inside the main page width
- active-section indicator
- weather control available in the rail or hero

Mobile:
- horizontally scrollable chips
- no rotated labels
- generous tap targets
- active state remains obvious

### Hero / About

Desktop:
- left identity column
- right copy column

Left column:
- avatar or portrait
- name
- Burmese script
- social links
- short identity line
- weather mode control

Right column:
- condensed intro
- “What I’m up to” paragraph
- technical skills grouped into concise cards or chips

### Personal photo strip

Add 2–3 small photo tiles below the hero.
These should carry personality without creating a new biography section.

Examples of framing:
- Home
- Play
- Taste
- Reading lately
- Outside work

Each tile should use either:
- one photo + one short label
- one photo + one caption line

### Recent Projects

Use a more deliberate project rhythm.

Desktop:
- one featured project card
- remaining projects in balanced secondary cards

Mobile:
- single-column stack
- category pills above title
- description and CTA below

### Tools for Friends

Keep it as a compact section with stronger warmth in tone.
This should read like a useful, human side of the portfolio rather than a novelty shelf.

### Current Stuff

Replace the current sparse rows with a compact “Now” shelf.
The section should feel like a live snapshot of interests and learning rather than a low-density appendix.

Desktop:
- three equal cards: Learning, Reading, Watching/Listening/Playing

Mobile:
- three stacked cards

## Visual & Motion System

### Palette

Preserve the existing sky/frost palette.

Suggested approximate tokens:
- sky start: `#D0E5FC`
- sky end: `#A0CDEB`
- frost surface: `#F8FBFD`
- frost glow: `#C7E8FE`
- accent start: `#2480FD`
- accent mid: `#26A1FF`
- accent end: `#22D1FF`
- body text: `#737A7F`
- strong text: `#171D27`

### Surfaces

Use fewer oversized panels.
Prefer:
- one page wrapper
- section cards with consistent radius
- softer shadows
- lighter internal decorative overlays

### Iconography

Keep custom illustrated section artwork where it helps the page feel personal.
Use one consistent UI icon family for:
- navigation
- links
- metadata
- buttons

Do not mix too many icon styles in interface chrome.

### Photography

Introduce real photos in a restrained way.
Recommended:
- 2–5 total personal photos across the entire page
- one can appear in the hero or below it
- others can appear in the personal strip

Photography should support identity, not replace project proof.

### Motion

Keep the current motion ideas, but reduce their footprint.

Rules:
- weather mode is user-controlled
- ripple effect runs only on fine pointers
- reduced-motion preference substantially simplifies or disables ambient motion
- no motion should be necessary to understand content
- content animations should be subtle and brief

## Implementation Notes

### GitHub Pages specifics

Keep the site static and anchor-based.
Avoid introducing a client-side router.

Recommended structure:
- `/index.html`
- `/assets/css/`
- `/assets/js/`
- `/assets/images/`
- optional `/assets/icons/`

Implementation guidance:
- use semantic sections with IDs for in-page nav
- use relative or root-safe asset paths
- if a build step is introduced, publish compiled static output only
- keep the final site deployable as plain HTML/CSS/JS

### Front-end implementation

Use:
- CSS Grid for page layout
- Flexbox for local alignment
- `clamp()` for type and spacing
- `aspect-ratio` for image slots
- `position: sticky` for nav
- `requestAnimationFrame` for ripple updates

Avoid:
- full SPA complexity
- layout-heavy scroll handlers
- oversized libraries for icons or animation
- fixed heights for content sections

### Accessibility implementation

Minimum requirements:
- visible focus state
- labeled icon links
- labeled weather toggle buttons
- active nav state
- decorative images marked decorative
- meaningful photos get alt text
- touch targets enlarged
- reduced-motion mode supported

## Testing & Success Criteria

### Usability

Success means:
- the page is understandable in one scroll
- projects are easy to find immediately
- the user can tell who I am and what I do within a few seconds
- the “Current Stuff” area feels personal, not random
- mobile reading feels natural at 375px

### UI quality

Success means:
- no horizontal scroll on phones
- no rotated navigation labels
- stronger text contrast
- larger and clearer click/tap areas
- more balanced whitespace across sections
- consistent icon and card patterns

### Performance

Success means:
- hero art is optimized
- below-the-fold imagery is lazy-loaded
- animations are lightweight
- no obvious layout shift from image loading
- the site stays responsive even with motion enabled

## Non-goals

- full content rewrite
- full rebrand
- dark-mode-first redesign
- app-style navigation complexity
- adding a blog or social feed
- replacing the current weather/water mood with an unrelated visual theme
- adding every personal interest directly into the hero copy

## Next Steps

1. Choose one of the three layout blueprints
2. Select 2–5 personal photos that can carry identity without clutter
3. Confirm icon direction: keep illustrations + simplify UI icons
4. Build a responsive wireframe for desktop, tablet, and 375px mobile
5. Implement the new shell and navigation first
6. Reintroduce weather and ripple motion only after layout is stable
7. Run a final pass on spacing, contrast, focus styles, and touch targets
