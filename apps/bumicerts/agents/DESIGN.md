# Bumicerts Design Guidelines

This document captures the visual taste and design principles used throughout the Bumicerts platform. These are not rigid rules about layouts, but guidelines for maintaining a consistent **feeling** across all pages.

---

## Core Philosophy

**Editorial minimalism.** The design draws inspiration from high-end editorial publications, architectural magazines, and premium fintech interfaces. Every element earns its place. White space is a feature, not a bug.

**Character lives in the details.** Plain backgrounds (white/black), restrained color palette, but rich in typography, motion, and micro-interactions. The personality comes from how things move and breathe, not from decorative flourishes.

**Quiet confidence.** Nothing screams for attention. The interface feels calm, trustworthy, and sophisticated. Impact comes from restraint.

---

## Typography

### Font Stack (Three Fonts Only)

We use exactly **three fonts** to maintain visual coherence. Less variety = cleaner design.

| Font | CSS Variable | Purpose |
|------|--------------|---------|
| **Cormorant Garamond** | `--font-garamond-var` | Display text, headlines, titles, brand name, decorative numbers |
| **Instrument Serif** | `--font-instrument-serif-var` | Elegant italic emphasis, fancy accents within text |
| **Geist Sans** | `--font-geist-sans` | Body text, UI elements, buttons, labels, descriptions |

> **Exception:** `Geist Mono` (`--font-geist-mono`) is available for code snippets and technical data only.

### When to Use Each Font

#### Cormorant Garamond (`--font-garamond-var`)
- **Hero headlines** on landing pages (e.g., "Verified Impact", "Nature Stewards")
- **Page titles** and section headlines
- **Card titles** (BumicertCard, OrganizationCard)
- **Brand name** "Bumicerts" in navigation
- **Large decorative numbers** (result counts, statistics)
- **Editorial statements** and pull quotes
- Use `font-light` (300) for large display sizes, `font-medium` for smaller titles
- Tight tracking for display: `tracking-[-0.02em]`

#### Instrument Serif (`--font-instrument-serif-var`)
- **Italic emphasis** within headlines (e.g., "With Real Communities")
- **Fancy accent phrases** that add editorial flair
- **Subheadings** that follow a Garamond headline (secondary emphasis)
- **Almost always used with `fontStyle: "italic"`**
- Creates a graceful, editorial contrast against Garamond

#### Geist Sans (default, `--font-geist-sans`)
- **All body text** and descriptions
- **UI elements**: buttons, inputs, dropdowns, chips, filters
- **Labels and captions**: section labels, metadata, timestamps
- **Navigation items** (except brand name)
- Small uppercase labels: add `tracking-[0.1em]` to `tracking-[0.15em]`

### Typography Principles

1. **Contrast through weight, not size.** Use `font-light` (300) for large display text, creating an elegant, airy feel. Reserve heavier weights for smaller UI elements.

2. **Generous tracking on small caps.** Any uppercase text under 12px should have `tracking-[0.1em]` to `tracking-[0.2em]` for readability and elegance.

3. **Italic for emphasis, not bold.** When you need to emphasize a word or phrase, reach for Instrument Serif italic before reaching for bold.

4. **Line height varies with size.** Large display text: `leading-[1.1]`. Body text: `leading-relaxed`. Small text: `leading-normal`.

### Examples

```tsx
// Hero headline (Cormorant Garamond)
<h1 
  className="text-5xl md:text-7xl font-light tracking-[-0.02em] leading-[1.1]"
  style={{ fontFamily: "var(--font-garamond-var)" }}
>
  Verified Impact
</h1>

// Card title (Cormorant Garamond)
<h3
  className="text-base font-medium"
  style={{ fontFamily: "var(--font-garamond-var)" }}
>
  Rainforest Restoration Project
</h3>

// Fancy italic emphasis within headline (Instrument Serif italic)
<span 
  className="text-foreground/80"
  style={{ fontFamily: "var(--font-instrument-serif-var)", fontStyle: "italic" }}
>
  With Real Communities
</span>

// Section label (Geist Sans - default)
<span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
  About Us
</span>

// Body text (Geist Sans - default, no style needed)
<p className="text-sm text-muted-foreground leading-relaxed">
  This project focuses on restoring native ecosystems...
</p>
```

---

## Color Philosophy

### The Palette

We use an **oklch-based** color system for perceptually uniform colors.

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `--primary` | Deep green | Softer green | Accent color, CTAs, interactive elements |
| `--foreground` | Near black | Off white | Primary text |
| `--muted-foreground` | Gray | Light gray | Secondary text, captions |
| `--background` | Pure white | Near black | Page backgrounds |
| `--border` | Light gray | White 8% | Subtle separators |

### Color Usage Rules

1. **Primary color is precious.** Use it sparingly:
   - CTA buttons
   - Active states
   - Small accent details (icons, lines, badges)
   - Hover states for links
   
2. **Opacity for hierarchy.** Instead of multiple gray shades, use opacity:
   - `text-foreground` - Primary content
   - `text-foreground/80` - Secondary content  
   - `text-foreground/60` - Tertiary content
   - `text-muted-foreground` - Captions, metadata

3. **Decorative elements use very low opacity.** Large decorative numbers, background patterns: `text-primary/[0.1]` to `text-primary/[0.15]`

4. **No colored backgrounds.** Sections differentiate through spacing and subtle `bg-muted/30`, never through colored fills.

---

## Spacing & Layout

### Rhythm

- **Section padding:** `py-20 md:py-28` (generous vertical breathing room)
- **Content max-width:** `max-w-6xl` for most content, `max-w-4xl` for text-heavy
- **Horizontal padding:** `px-6` consistent throughout
- **Component gaps:** Use `gap-12 lg:gap-16` between major elements

### Grid Philosophy

1. **Asymmetric splits feel editorial.** 2-column layouts often work better as content-heavy left, visual right (or vice versa).

2. **Staggered animations.** When items appear in a grid, stagger them with `delay: index * 0.1` for a cascading reveal.

3. **Let things breathe.** When in doubt, add more space. `mb-16` instead of `mb-8`.

---

## Motion & Animation

### Principles

1. **Entrance animations are subtle.** Fade + slight translate, never bounce or overshoot for content:
   ```tsx
   initial={{ opacity: 0, y: 20 }}
   animate={{ opacity: 1, y: 0 }}
   transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
   ```

2. **Hover states are immediate.** Spring physics for interactive elements:
   ```tsx
   whileHover={{ scale: 1.02 }}
   transition={{ type: "spring", stiffness: 400, damping: 25 }}
   ```

3. **Scroll-triggered animations use `whileInView`.** With `viewport={{ once: true }}` to prevent re-triggering.

4. **Stagger children for lists/grids:**
   ```tsx
   transition={{ delay: index * 0.1 + 0.1 }}
   ```

### The Standard Easing

Use this cubic-bezier for most transitions:
```
ease: [0.25, 0.1, 0.25, 1]
```
This is a smooth ease-out that feels natural and unhurried.

### Micro-interactions

- **Buttons:** `whileHover={{ scale: 1.02 }}` + `whileTap={{ scale: 0.98 }}`
- **Cards:** `whileHover={{ y: -4 }}` for subtle lift
- **Links:** Color transition on hover, slight x-translate for arrows
- **Icons:** Subtle rotation or scale on parent hover

---

## Components & Patterns

### Cards

1. **Border, not shadow, for definition.** Use `border border-border` as the primary container style. Shadows are reserved for elevated states (hover, modals).

2. **Rounded corners:** `rounded-2xl` for cards, `rounded-xl` for inner elements, `rounded-full` for pills and avatars.

3. **Hover state:** Add shadow + subtle border color change:
   ```tsx
   className="transition-all duration-500 hover:shadow-2xl hover:border-primary/20"
   ```

### Section Headers

The standard pattern for section labels:
```tsx
<div className="flex items-center gap-2 mb-6">
  <IconComponent className="h-4 w-4 text-primary" />
  <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
    Section Name
  </span>
</div>
```

### Decorative Numbers

Large, faded numbers add editorial flair:
```tsx
<span 
  className="text-5xl md:text-6xl font-light text-primary/[0.15] tracking-tight"
  style={{ fontFamily: "var(--font-garamond-var)" }}
>
  01.
</span>
```

### Buttons

**Primary CTA:**
```tsx
className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-primary text-primary-foreground text-sm font-medium transition-all hover:bg-primary/90 shadow-lg shadow-primary/20"
```

**Secondary/Ghost:**
```tsx
className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
```

### Pills & Badges

```tsx
className="text-[10px] uppercase tracking-[0.08em] text-foreground/60 bg-muted/60 border border-border/50 rounded-full px-2.5 py-1 font-medium"
```

### Gradient Lines

Subtle separator lines that fade at edges:
```tsx
<div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
```

---

## Images & Media

### Treatment

1. **Soft, muted overlays.** Images often have a subtle overlay to blend with the page:
   ```tsx
   <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
   ```

2. **Scale on hover.** Images in cards scale subtly:
   ```tsx
   className="scale-105 group-hover:scale-100 transition-transform duration-700"
   ```

3. **Progressive blur.** Use the `ProgressiveBlur` component for elegant bottom fades on hero images.

### Logo Treatment

When using the brand logo in UI:
- In dark contexts: Use as-is (green on dark)
- In light contexts with text: Apply grayscale filter for better blending
- In accent contexts: Use with `bg-primary/10` background

---

## Accessibility Notes

While pursuing aesthetics, maintain:

1. **Contrast ratios.** `text-muted-foreground` should still meet WCAG AA against backgrounds.

2. **Focus states.** All interactive elements need visible focus indicators.

3. **Motion preferences.** Respect `prefers-reduced-motion` for animations.

4. **Text sizing.** Body text never below 14px. Small labels at 10-11px only for non-essential metadata.

---

## Anti-Patterns (What to Avoid)

- **Colored section backgrounds.** No `bg-green-50` or gradient blobs.
- **Heavy shadows everywhere.** Shadows are earned through interaction.
- **Tight spacing.** When it feels cramped, add more air.
- **Bold everything.** Hierarchy through size and opacity, not weight.
- **Competing animations.** One focal animation at a time.
- **Decorative icons.** Every icon should serve a purpose.
- **Generic stock photo energy.** Images should feel authentic and atmospheric.

---

## Quick Reference

```
Fonts:        Cormorant Garamond (headlines/titles) | Instrument Serif (italic accents) | Geist (body/UI)
Colors:       Primary green (accent) | Black/White (content) | Opacity for hierarchy
Spacing:      Generous (py-20+) | Consistent (px-6) | Breathe (gap-12+)
Motion:       Subtle (y: 20) | Smooth (0.6s) | Staggered (index * 0.1)
Corners:      2xl (cards) | xl (inner) | full (pills)
Borders:      Hairline (border-border) | Accent on hover (border-primary/20)
```

---

*This is a living document. Update it as the design system evolves.*
