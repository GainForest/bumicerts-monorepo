# New Route Guidelines

## The SSR / SEO / First-Paint Problem

Two goals are in tension:

| Goal | Requires |
|------|----------|
| Fast first paint | Show UI immediately — don't block on data |
| Good SEO | Data must be in the initial HTML — requires `await` |

`await` in `page.tsx` blocks the entire server response until data is ready. Skipping
`await` means crawlers never see the real content.

**`loading.tsx` is the resolution.** Next.js wraps `page.tsx` in a Suspense boundary
and streams `loading.tsx` to the browser instantly while `page.tsx` executes. Crawlers
that need full content wait for `page.tsx` — so SEO sees everything.

---

## Page Classification

Before building a new route, decide which type it is:

### Type A — Static chrome + one main data block

The page has a persistent heading, search bar, filters, or other UI that doesn't depend
on the main data fetch, plus one primary data-driven area (a grid, a list, etc.).

**Use the Shell pattern** (see below). Scaffold it with the CLI.

### Type B — Entire page is dynamic

Everything on the page depends on a single fetch (e.g. a detail page). There is no
meaningful static chrome to show while loading.

**Use a full-page `loading.tsx` skeleton.** No Shell needed.

```
app/.../[param]/
  loading.tsx   ← full-page skeleton (no text, pure <Skeleton> blocks)
  page.tsx      ← await data → render full page, return <ErrorPage /> if fetch fails
```

---

## The Shell Pattern (Type A)

A Shell component:
- Is `"use client"`
- Renders all static chrome immediately (heading, inputs, layout)
- Accepts an `animate` prop — `true` in `loading.tsx`, `false` in `page.tsx`
- Accepts `children` for the main data-driven slot
- Is used in **both** `loading.tsx` and `page.tsx` — same wrapper, different props

```
loading.tsx  →  <Shell animate={true}>  <MainSkeleton />  </Shell>   ← streams instantly
page.tsx     →  <Shell animate={false}> <RealContent />   </Shell>   ← swaps in silently
```

### The `animate` prop

Every Shell has `animate?: boolean` (default `true`). It gates entry animations on the
static chrome so the heading doesn't re-animate when `page.tsx` swaps in:

```tsx
<motion.div
  initial={animate ? { opacity: 0, y: 16 } : false}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
>
  <h1>Page Title</h1>
</motion.div>
```

- `loading.tsx` → `animate={true}`: chrome animates in on first display
- `page.tsx` → `animate={false}`: shell appears at its final position, no re-animation

### Secondary dynamic data inside the Shell

If the Shell itself needs data that isn't critical for SEO (e.g. filter chips), wrap
it in `<Suspense>` with a skeleton fallback **inside the Shell**:

```tsx
export function ExampleShell({ animate, children }: Props) {
  return (
    <section>
      <motion.div initial={animate ? { opacity: 0, y: 16 } : false} ...>
        <h1>Page Title</h1>
      </motion.div>
      <Suspense fallback={<FilterChipsSkeleton />}>
        <FilterChips />                   {/* secondary dynamic, not SEO-critical */}
      </Suspense>
      {children}                          {/* main data slot */}
    </section>
  );
}
```

If the secondary dynamic content and the main children share the same data, fetch it
**once** in `page.tsx` and pass it as a prop to the Shell. Never fetch the same data twice.

```tsx
// page.tsx
const data = await fetchData();
return <ExampleShell data={data} animate={false}>{/* ... */}</ExampleShell>;

// loading.tsx
return (
  <ExampleShell data={[]} animate={true}>
    <MainSkeleton />
  </ExampleShell>
);
```

---

## Skeleton Rules

- **No text** in skeletons — not even labels like "Description". Only `<Skeleton>` blocks.
- Use `<Skeleton>` from `@/components/ui/skeleton` (applies the shimmer animation).
- The skeleton layout must **mirror the real layout** to avoid layout shift on swap.
- Before creating a new skeleton, check if the relevant card/component already exports
  one (e.g. `BumicertCardSkeleton`, `OrganizationCardSkeleton`). Reuse them.

---

## Caching

The app intentionally **never caches data**:

- `graphql-request` does not go through Next.js's extended `fetch`, so the Data Cache
  never applies.
- All data-fetching pages `await` inside async Server Components, making them
  dynamically rendered by default.
- `React.cache()` is used **only** for request deduplication within a single render
  pass (e.g. `generateMetadata` and `page.tsx` both needing the same data for the
  same request) — not for persistence across requests.

You do **not** need `export const dynamic = 'force-dynamic'` on pages — `await`ing
data makes them dynamic already.

---

## Scaffolding a New Route (Type A)

Use the built-in CLI to scaffold a Shell-pattern route:

```bash
# Run from the bumicerts app root.
# <path> is relative to app/(marketplace)/
bun run init-marketplace-route <path>

# Examples:
bun run init-marketplace-route dashboard
bun run init-marketplace-route reports/summary
bun run init-marketplace-route 'organization/[did]/timeline'

# Overwrite existing files:
bun run init-marketplace-route dashboard --force
```

The CLI creates the following under `app/(marketplace)/<path>/`:

| File | Purpose |
|------|---------|
| `_components/{Route}Shell.tsx` | `"use client"`, `animate` prop, motion heading, `children` slot |
| `_components/{Route}Skeleton.tsx` | Placeholder `<Skeleton>` blocks — fill in to mirror real layout |
| `_components/{Route}Header.tsx` | Injects content into the sticky header (left, right, sub slots) |
| `loading.tsx` | `<{Route}Shell animate={true}><{Route}Skeleton /></{Route}Shell>` |
| `page.tsx` | Async server component using `<{Route}Shell animate={false}>` |
| `error.tsx` | Error boundary using the shared `ErrorPage` component |

**Route name derivation** — the CLI walks path segments right-to-left, picks the first
non-dynamic segment (not starting with `[`), strips route-group parens, and converts
to PascalCase. The rule: all non-alphanumeric characters are word boundaries.

After scaffolding:
1. Fill in `{Route}Skeleton.tsx` to mirror the real page layout (no text)
2. Add your data fetch in `page.tsx` — `return <ErrorPage />` if the fetch fails
3. Pass data as props to the Shell
4. Remove the `{/* TODO */}` placeholder comments

---

## Checklist for New Pages

1. **Which type?**
   - Static chrome + main data block → Type A, run the scaffold CLI
   - Entire page is one fetch → Type B, write a plain `loading.tsx` skeleton

2. **Shared data between Shell secondary content and main children?**
   - Yes → Fetch once in `page.tsx`, pass as Shell prop
   - No → Secondary component fetches its own data inside `<Suspense>`

3. **Skeleton has readable text?** → Remove it. Skeletons are text-free.

4. **`animate` prop set correctly?**
   - `loading.tsx` → `animate={true}`
   - `page.tsx` → `animate={false}`

5. **Fetch failed in `page.tsx`?** → `return <ErrorPage />`, never `throw`.
