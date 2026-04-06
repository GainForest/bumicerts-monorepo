# Bumicerts 2 — End Goal

## What This Project Is

**Bumicerts** is a marketplace platform that connects **nature stewards** (communities, organizations doing on-ground regenerative work) with **funders** (donors, impact investors). The core product is a "Bumicert" — a digital certificate that records a specific environmental action with proof (photos, geolocation, monitoring data), gives it a permanent identity on the AT Protocol (Bluesky's decentralized social protocol), and allows anyone in the world to directly fund it.

Think: "verifiable environmental impact certificates you can fund like buying a piece of a story."

## The Problem With the Current UI (`bumicerts-platform`)

The existing app works — but it looks like a competent engineering project, not a product people *feel* something about. It's functional and clean, but it's **neutral to the point of invisibility**. A platform built around forests, ecosystems, and human communities doing heroic work deserves a UI that has *soul*.

The existing design problems:
- Pale, forgettable visual language — nothing that communicates the weight or beauty of what's happening on the ground
- The "character" is missing — there's nothing that makes a user pause, feel inspired, or feel like they're part of something real
- Motion exists (Framer Motion is already used) but it's not systematic — it's scattered
- Typography is rich (Baskervville, Instrument Serif, Cormorant Garamond are in the font stack) but not leveraged with intent
- The sidebar navbar is functional but doesn't feel like an experience
- Cards, layouts, and data feel informational, not emotional

## The End Goal Vision

Build a **100x better UI** — the kind of product that wins design awards, gets shared on Twitter for its beauty, and makes users *trust* the platform because it looks like it was built by people who care.

### The Core Philosophy

**Plain backgrounds. Rich experiences.**

Do NOT change the background to a solid forest-green or earthy brown to "add character." That's the cheap answer. The background stays near-white in light mode (`oklch(1 0 0)` or very close), near-black in dark mode. The character lives *inside the design itself* — in:

- The **typography** — pairing a humanist serif (Baskervville, Cormorant Garamond) with the UI sans (Geist) with deliberate hierarchy, weight, and spacing
- The **motion** — every element that enters, exits, or changes state does so with choreographed intention using Framer Motion and the View Transitions API
- The **micro-details** — subtle textures on cards (striped patterns, noise, grain), precise shadow layering, adaptive color extraction from images
- The **data visualization** — progress bars, coverage stats, funding meters that are beautiful, not clinical
- The **interactions** — hover states that breathe, buttons that respond, links that feel *clickable*
- The **whitespace** — generous, intentional, editorial — like a premium print magazine layout

---

## Tech Stack (bumicerts-2 is the clean slate to build into)

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4
- **Animation**: Framer Motion (`framer-motion`) + View Transitions API (`next/navigation` `unstable_ViewTransition` or CSS `view-transition-name`)
- **Icons**: Lucide React
- **Fonts**: Mix of serif (Baskervville, Cormorant Garamond, Instrument Serif) + Geist Sans/Mono
- **Theme**: Light/dark via `next-themes` (class-based)
- **State**: Zustand + React Query (TanStack)
- **Auth/Identity**: Privy + AT Protocol (Bluesky DIDs)
- **Data**: AT Protocol via the Gainforest SDK (tRPC-based server callers)

All packages from `bumicerts-platform` should be installed and mirrored in `bumicerts-2`. The `bumicerts-2` project is the **destination** — a complete rebuild of the UI, not a patch.

---

## Pages & Sections to Rebuild (reference: `bumicerts-platform`)

### 1. Root Layout (`app/layout.tsx`)
- Font loading: Geist Sans, Geist Mono, Baskervville, Cormorant Garamond, Instrument Serif
- ThemeProvider (next-themes, class-based, default: light)
- Provider tree: Privy, tRPC, AT Protocol, Nuqs, Modal
- Smooth theme transition (no flash) — body has a CSS transition on `background-color` and `color`

### 2. Global Navbar (Desktop + Mobile)
**Current**: A 240px fixed left sidebar with logo, nav links, footer links, and theme toggle.

**Target**: The sidebar should feel like a *crafted artifact*, not a list of links.
- Logo area: The Bumicerts logo (SVG leaf/earth mark) animates in on first load with a gentle scale + fade. The wordmark "Bumicerts" in Baskervville sits beside it.
- Nav links: Each link has a subtle left-border indicator when active (already exists, but needs to be a smooth Framer Motion `layoutId` animated pill/underline — not just a static div)
- Hover states: Link rows should have a silky-smooth background transition, not a jarring flash
- Group expand/collapse: Animated height transition using Framer Motion `AnimatePresence` + `motion.div` with `initial={{ height: 0 }}` and `animate={{ height: "auto" }}`
- Theme toggle at the bottom: Not just a Switch — make it feel like a moment. Use a small sun/moon icon that morphs (Framer Motion keyframes or layout animation between two states)
- Mobile navbar: A bottom sheet or slide-in drawer with spring animation. Use `vaul` (already in dependencies) for the drawer primitive.
- The sidebar background should be subtly distinct from the page background — not a different color, but perhaps `backdrop-blur` + very faint `border-r` + `bg-background/80` so it floats

### 3. Home Page (`/`)
**Current**: A hero image with motion, a "What is a Bumicert?" accordion, and two CTA cards.

**Target**: An editorial landing experience.

**Hero Section**: 
- Full-bleed image with the existing background photograph (planters, approachers, forest)
- The current implementation already has good bones (motion.img + AnimatePresence for the "Learn More" flip) — but it needs to be *taller* on desktop (min 480px), more dramatic in its animation timing
- The "Supporters unite. / Communities thrive." floating quote bubbles: These are genius — keep them but make them feel more like handwritten sticky notes or organic chat bubbles with a very gentle `y` float loop animation (`animate={{ y: [0, -4, 0] }}` with `repeat: Infinity`)
- Below the hero: A bold editorial section title in Cormorant Garamond at ~72px: *"Fund the future of our planet."* — not a centered subtitle, but a left-aligned display heading that takes full width

**CTA Cards ("I want to support" / "I am an organization")**:
- Currently: Simple rounded cards with a muted background
- Target: These should feel like *invitations*. Each card should have:
  - A large, barely-visible icon watermark (30% opacity, massive, positioned absolutely)
  - The serif headline in Cormorant Garamond at ~40px
  - On hover: the card lifts (subtle `boxShadow` + `y: -4` with Framer Motion `whileHover`)
  - A thin animated border gradient on hover — not a thick colored border, a hairline that travels around the card perimeter using CSS `@keyframes` or a Framer Motion path animation
  - The CTA button slides into view on hover (starts at `x: 20, opacity: 0`, animates to `x: 0, opacity: 1`)
  - View Transition on click — the card "expands" into the next page using `view-transition-name`

**"What is a Bumicert?" Section**:
- The Accordion answers are good content — but the section should feel like a spread in a high-end sustainability report
- The `BumicertArt` preview card (the actual certificate visualization) on the left: animate it in as the section enters the viewport (Intersection Observer + Framer Motion `whileInView`)
- The accordion items: When open, the content should expand with a smooth height transition (Framer Motion), and the trigger chevron rotates smoothly

### 4. Explore Page (`/explore`)
**Current**: A flex-wrap grid of BumicertCards in a centered layout.

**Target**: A gallery that feels like browsing a curated collection — not a product catalog.
- **Layout**: Masonry-ish grid or a clean `grid-cols-[repeat(auto-fill,minmax(300px,1fr))]` with cards that have *slightly different heights* based on their content — organic, not rigid
- **BumicertCard**: This is the hero UI element of the whole platform.
  - The card uses `BumicertArt` — a custom certificate visualization. This should be *stunning* on hover.
  - Hover: The card image scales up slightly (`scale: 1.03`), a subtle color overlay appears matching the image's extracted color palette (adaptive colors), and a "View →" CTA slides up from the bottom
  - Entry animation: Cards stagger in using `delay: index * 0.05` — they emerge from a slight blur and scale, not just a fade
  - The striped background in the card header (`StripedDiv`) is a nice touch — keep it, but make the stripe more refined (thinner, ~2px, at ~15deg angle, more translucent)
  - Loading skeleton: The `BumicertCardSkeleton` should use a shimmer animation (CSS `@keyframes` moving gradient from left to right), not a static muted block

- **Filter/Search Header**: 
  - A single clean search input — pill-shaped, with a subtle inner shadow, Geist Sans, placeholder text that fades in/out with different suggestions (e.g., "Search by location...", "Search by ecosystem type...")
  - Filter chips below: Small pill buttons with smooth select/deselect animations

### 5. Bumicert Detail Page (`/bumicert/[bumicertId]`)
**Current**: A hero with adaptive background colors extracted from the cover image, title, metadata, and work scope tags.

**Target**: A *full editorial article experience* for a certificate.

**Hero**:
- The adaptive color extraction (`useAdaptiveColors`) is already implemented and powerful — lean into it HARD
- The cover image on the right: Should be large, commanding. On desktop, make it take up half the viewport height. Use the extracted `background` color as a very subtle tinted wash on the left content area — not a block color fill, just a ghost of it (5-8% opacity)
- The striped background (`getStripedBackground`) is the right move — it gives the hero texture without a photo background. Keep it but tune the angle and opacity
- The title in Baskervville at 3xl-4xl with a drop shadow that uses the extracted foreground color
- Work scope tags: Small rounded-full pills with the extracted `backgroundMuted` color and gentle `foreground` text — these already exist, just need more intentional sizing and spacing
- The "Listed on the homepage" / "Backed by 3 proofs of impact" top bar: Make this feel like a certification stamp row — use small checkmark icons, maybe a very subtle `bg-green-500/5` tint, and render it as a pair of badges rather than a bar

**Body / Content**:
- The main description/content area below the hero should feel like reading a field report — editorial typography, `leading-relaxed`, `max-w-prose`, left-aligned on desktop with a right sidebar for metadata
- Photos/evidence section: Image grid with a lightbox (Framer Motion `layoutId` shared element transition when clicking a photo to expand it)

**Progress / Funding**:
- The `ProgressView` component: A funding progress visualization that is *beautiful* — not a standard progress bar. Think a layered circle/arc, or a horizontal fill that glows in the brand's green at the leading edge

### 6. Organization Profile Page (`/organization/[did]`)
**Current**: A hero, sub-hero, about section, and a bumicert list placeholder.

**Target**: Feels like a premium nonprofit's annual report microsite.
- **Hero**: Full-width cover image with the organization logo floating over it — the logo should have a `backdrop-blur` frosted glass pill behind it. Organization name in Cormorant Garamond, massive.
- **Sub-hero / Stats**: Key metrics (number of bumicerts, total area covered, years active) displayed as large typographic numbers with labels — like a Bloomberg data display
- **About section**: Long-form text with drop-cap initial letter (CSS `::first-letter`), generous line-height, max-width prose container
- **Bumicerts list**: Not a placeholder — a responsive grid of their BumicertCards with a `whileInView` stagger

---

## Design System Principles

### Typography
- **Display / Hero text**: Cormorant Garamond — used for the *big* emotional moments. 60px+. When someone lands on a page, the headline should make them feel the weight of what they're reading.
- **Section headings / Card titles**: Baskervville or Instrument Serif — authoritative, warm, trustworthy. 24-36px.
- **Body text**: Geist Sans — the workhorse. Clean, modern, excellent legibility at any size.
- **Mono / data**: Geist Mono — for addresses, hashes, technical identifiers. Makes blockchain data feel at home.
- **Line heights**: Generous. `leading-relaxed` minimum for body, `leading-tight` for display.
- **Letter spacing**: `-0.02em` on display text for optical tightening.

### Color
- **Light mode background**: `oklch(1 0 0)` — pure white or within 1-2% of it. NO earthy/colored backgrounds.
- **Dark mode background**: `oklch(0.08 0 0)` — very deep near-black (darker than current `oklch(0.2 0 0)`).
- **Primary green**: Already defined in the existing theme — `oklch(0.5 0.0719 157.12)`. This is the *accent*, not the background. Used for CTAs, indicators, active states.
- **Character through tone, not hue**: The palette is essentially neutral. The richness comes from the *quality* of neutrals — the borders are hairline-thin and precise, shadows are multi-layered and soft, the muted tones are warm (slightly yellowish-gray) in light mode and cool (slightly bluish-gray) in dark mode.
- **Adaptive image colors**: The `useAdaptiveColors` hook extracts dominant colors from images. USE IT EVERYWHERE images appear — tint the surrounding UI elements with a ghost of the image's palette.

### Borders & Surfaces
- Borders: `1px solid oklch(0.92 0.004 286.32)` in light mode — barely visible, surgical. In dark mode: `oklch(1 0 0 / 0.08)` — equally restrained.
- Card surfaces: `bg-background` with a `shadow-sm` by default. On hover: `shadow-md` — no color change, just depth.
- Use `backdrop-blur` generously for floating UI elements (navbar, modals, popover, the "Learn More" pill in the hero). It communicates modern depth without adding color.
- Border radius: `0.75rem` for cards (current `--radius`), `1.5rem` for hero sections and large blocks, `9999px` for pills/badges.

### Motion Design (Framer Motion + View Transitions)

**The Rule**: Every transition must have a *reason*. Motion communicates meaning — it doesn't just look cool.

**Page Transitions** (View Transitions API):
- Use `view-transition-name` on shared elements between pages (e.g., a BumicertCard on the explore page and the hero image on the bumicert detail page should share a `view-transition-name` so the image morphs between the two routes — a "hero" shared element transition)
- In `next.config.ts`, ensure View Transitions are enabled (Next.js 16 supports this)
- Default page transition: A gentle fade + slight `y: 8` translate. Nothing dramatic. 250ms ease.

**Component Entry** (`whileInView`):
- Use `initial={{ opacity: 0, y: 16 }}` and `whileInView={{ opacity: 1, y: 0 }}` for sections as they scroll into view
- `viewport={{ once: true }}` — animations play once, not every time you scroll
- `transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}` — a refined cubic bezier, not the default spring

**Stagger**:
- For lists of cards, use `staggerChildren: 0.05` on the container `variants`
- Keep stagger delays short — the goal is a sense of rhythm, not a waterfall

**Hover**:
- `whileHover={{ scale: 1.02, y: -2 }}` on cards — subtle lift, not a dramatic zoom
- Pair with `transition={{ type: "spring", stiffness: 400, damping: 25 }}`
- Interactive elements (buttons, links) should have `whileTap={{ scale: 0.97 }}`

**Layout Animations**:
- Use `layout` prop on elements that change size/position (navbar link groups expanding, accordion items opening)
- Use `layoutId` for shared element transitions within the same page (e.g., the active nav indicator pill sliding between links)

**Avoiding the "AI UI" traps**:
- Do NOT add animated gradient backgrounds to hero sections
- Do NOT use large glowing blobs or orbs as decorative elements
- Do NOT use particle systems
- Do NOT make motion so aggressive that it distracts from content
- The test: if you removed all animation and the page still looked great, you've done it right. Animation is seasoning, not the meal.

### Micro-interactions
- Input focus: `ring-2 ring-primary/30` — a soft glow, not a hard outline
- Button press: `whileTap={{ scale: 0.97 }}` + the existing `transition-all` for background color changes
- Theme toggle: Not just a switch — the sun/moon icon should use Framer Motion `AnimatePresence` to swap out with a scale + rotate animation
- Skeleton loaders: Shimmer (gradient moving left-to-right via CSS animation) on all loading states
- Toast/notification: Slides in from the top-right with a spring, slides out the same way

---

## Component Architecture

Mirror the structure of `bumicerts-platform` but in `bumicerts-2`:

```
bumicerts-2/
├── app/
│   ├── layout.tsx              # Root layout: fonts, providers, theme
│   ├── globals.css             # Tailwind + CSS variables + base styles
│   ├── (marketplace)/
│   │   ├── layout.tsx          # Wraps children in Navbar
│   │   ├── page.tsx            # Home page
│   │   ├── explore/
│   │   │   └── page.tsx        # Explore/browse bumicerts
│   │   ├── bumicert/
│   │   │   └── [bumicertId]/
│   │   │       └── page.tsx    # Individual bumicert detail
│   │   └── organization/
│   │       └── [did]/
│   │           └── page.tsx    # Organization profile
├── components/
│   ├── ui/                     # Base primitives (Button, Input, Card, etc.)
│   ├── global/
│   │   └── Navbar/
│   │       ├── DesktopNavbar.tsx
│   │       └── MobileNavbar.tsx
│   └── [feature-components]/
└── lib/
    └── utils.ts                # cn(), and other utilities
```

---

## The "Feel" Test

When a first-time visitor lands on Bumicerts, within 3 seconds they should feel:

1. **Trust**: "This is a real, serious platform. Real organizations. Real impact."
2. **Beauty**: "Wow, this is gorgeous — someone who cares built this."
3. **Clarity**: "I immediately understand what this is and what I can do here."
4. **Connection**: "The people and places on this platform matter. I want to be part of this."

None of these feelings should come from the color of the background. They come from the *quality of craft* in every detail — the way a card's shadow changes on hover, the serif headline that makes you slow down and read, the image that fills a section and reminds you this is about real land and real people, the progress bar that shows actual dollars making actual impact.

---

## What NOT to Do

1. ❌ Don't set `background: #2d4a3e` or any earthy solid color as the page background
2. ❌ Don't add floating blob/orb decorative elements ("glassmorphism soup")
3. ❌ Don't use a gradient hero background instead of actual photography
4. ❌ Don't make animations so long (>600ms) that they feel sluggish
5. ❌ Don't use `font-weight: 900` + all-caps for every heading — the serif fonts earn their authority through letterform quality, not screaming
6. ❌ Don't add a drop shadow to text unless it's sitting on a complex image background
7. ❌ Don't create a component for every single thing — keep it composable but not over-abstracted
8. ❌ Don't ignore dark mode — every single component should look intentional in dark mode
9. ❌ Don't use color to communicate *everything* — use shape, size, position, and typography hierarchy first, color second
10. ❌ Don't make the mobile experience an afterthought — the mobile layout should be equally intentional

---

## Reference Points

If this needs a visual north star, think of the intersection of:
- **Linear.app** — the way plain backgrounds + precise typography + surgical motion creates a premium product feel
- **Stripe's marketing site** — the restraint, the confidence in whitespace, the way data is beautiful
- **A24's website** — editorial, image-forward, lets content breathe
- **Notion's homepage** — calm, clear, trustworthy without being boring
- **Vercel's dashboard** — the dark mode, the subtle borders, the way every element has a clear visual weight

But Bumicerts has something those don't: *real photographs of real ecosystems and communities*. That is the superpower. The design's job is to be a *frame* for those images — to make them shine, not to compete with them.

---

## Summary for Any Agent Picking This Up

You are rebuilding Bumicerts from a clean Next.js 16 + Tailwind v4 starting point in `bumicerts-2/`. The reference app is `bumicerts-platform/`. You are not porting code line-by-line — you are rebuilding it *better*, with:

- Framer Motion animations on every meaningful interaction and page transition
- View Transitions API for route-to-route shared element transitions
- Editorial typography using the full font stack (Cormorant Garamond for display, Baskervville for headings, Geist Sans for body)
- Plain white/black backgrounds with character living in spacing, typography, and micro-details
- A design language that makes the platform feel like it was built by people who love the earth and love good craft

Every line of UI code you write should ask: *"Does this make a first-time visitor feel something?"*

If yes — ship it. If not — rethink it.
