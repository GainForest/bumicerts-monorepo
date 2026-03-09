# Bumicerts — Agent Guidelines

## SSR, SEO & First Paint Strategy

### The Problem

Two goals are in tension:

| Goal | Requires |
|------|----------|
| Fast first paint | Show UI immediately — don't block on data |
| Good SEO | Data must be in the initial HTML — requires `await` |

Using `await` in `page.tsx` blocks the entire server response until data is ready.
Not using `await` means crawlers never see the real content.

**`loading.tsx` is the resolution.** Next.js wraps `page.tsx` in a Suspense boundary
and streams `loading.tsx` to the browser instantly while `page.tsx` executes. Crawlers
that need full content wait for `page.tsx` to finish — so SEO sees everything.

---

### The Shell Pattern

For pages where some UI is static (heading, search bar, filters) but the main data
needs fetching (a grid of cards), we use a **Shell component**.

A Shell:
- Renders all the static chrome immediately (heading, inputs, layout)
- Accepts an `animate` prop — `true` in `loading.tsx`, `false` in `page.tsx`
- Accepts `children` where the main data-driven content goes
- Used in **both** `loading.tsx` and `page.tsx` — same wrapper, different props

```
loading.tsx  →  <Shell animate={true}>  <GridSkeleton />  </Shell>   ← streams instantly, animates in
page.tsx     →  <Shell animate={false}> {/* content */}  </Shell>    ← swaps in silently
```

The user sees the shell + skeleton with entry animations immediately (fast first paint).
When data arrives, `page.tsx` swaps in without re-running the animations (no double-flash).
The crawler waits for `page.tsx` and sees the full content (good SEO).

#### The `animate` prop

Every Shell component has an `animate?: boolean` prop (default `true`). It gates the
entry animations on the static chrome (heading, search row, etc.):

```tsx
<motion.div
  initial={animate ? { opacity: 0, y: 16 } : false}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
>
  <h1>...</h1>
</motion.div>
```

- `loading.tsx` passes `animate={true}` → heading and chrome animate in on first display
- `page.tsx` passes `animate={false}` → shell swaps in at its final position, no re-animation

#### Secondary dynamic data inside the Shell

Sometimes the shell itself contains data that isn't critical for SEO — e.g. filter
chips derived from the dataset. For these, use `<Suspense>` with a skeleton fallback
**inside the Shell**. We don't care if crawlers miss those chips; we do care about
the main content grid.

```tsx
// ExploreShell example
export function ExploreShell({ bumicerts, animate, children }: Props) {
  return (
    <section>
      <motion.div initial={animate ? { opacity: 0, y: 16 } : false} ...>
        <h1>Discover Regenerative Impact</h1>
      </motion.div>
      <SearchAndSortBar />                                         {/* static chrome */}
      <Suspense fallback={<FilterChipsSkeleton />}>
        <FilterChips bumicerts={bumicerts} />                      {/* secondary dynamic */}
      </Suspense>
      <div className="h-px ..." />
      {children}                                                   {/* main data slot */}
    </section>
  );
}
```

When the Shell needs data that both the secondary dynamic parts and the main children
need (e.g. `bumicerts` for both filter chips and the grid), that data is fetched
**once** in `page.tsx` and passed as a prop to the Shell. No duplicate fetches.

```tsx
// page.tsx
const bumicerts = await fetchBumicerts();
return <ExploreShell bumicerts={bumicerts} animate={false} />;

// loading.tsx
return (
  <ExploreShell bumicerts={[]} animate={true}>
    <BumicertGridSkeleton />
  </ExploreShell>
);
```

---

### Page Classification

#### Type A — Multiple sections, some static, one main data block (e.g. `/explore`, `/organization/all`)

Use the Shell + `loading.tsx` pattern.

```
app/explore/
  _components/
    ExploreShell.tsx      ← "use client", animate prop, heading motion, children slot
    ExploreShell.tsx      ← the main data content (or inline in Shell via children ?? <Grid>)
  loading.tsx             ← <ExploreShell bumicerts={[]} animate={true}><Skeleton /></ExploreShell>
  page.tsx                ← await data → <ExploreShell bumicerts={data} animate={false} />
```

#### Type B — Entire page is dynamic (e.g. `/bumicert/[id]`, `/organization/[did]`)

Use `loading.tsx` with a full-page skeleton. No Shell needed — everything is one fetch.

```
app/bumicert/[id]/
  loading.tsx   ← full skeleton (no text, pure visual divs)
  page.tsx      ← await data → render full page
```

---

### Skeleton Rules

- **No text** in skeletons — not even section labels like "Description". Only `<Skeleton>` blocks.
- Skeletons use `<Skeleton>` from `@/components/ui/skeleton` which applies the shimmer animation.
- Layout of the skeleton must **mirror the real layout** so there's no layout shift on swap.
- The `BumicertCardSkeleton` already exists in `BumicertCard.tsx` — reuse it.
- The `OrganizationCardSkeleton` already exists in `OrganizationCard.tsx` — reuse it.

---

### Caching

The app intentionally **never caches data**:

- `graphql-request` does not use Next.js's extended `fetch` API, so no Data Cache applies.
- All data-fetching pages `await` inside async Server Components, making them dynamically rendered.
- React `cache()` is used only for **request deduplication within a single render pass** (e.g. `generateMetadata` + `page` both calling `getOrgData` for the same DID) — not for persistence across requests.
- Next.js 15+ Router Cache does not cache page segments by default.

No `export const dynamic = 'force-dynamic'` is needed on pages — they are already dynamic by virtue of `await`ing data.

---

### Scaffolding New Routes

Use the built-in CLI to scaffold a new Shell-pattern route:

```bash
# From the bumicerts app root:
bun run init-marketplace-route <path>

# path is relative to app/(marketplace)/
bun run init-marketplace-route dashboard
bun run init-marketplace-route reports/summary
bun run init-marketplace-route 'organization/[did]/timeline'

# Or CD into the target directory first:
cd app/(marketplace)/my-new-route
bun run init-marketplace-route .

# Overwrite existing files:
bun run init-marketplace-route dashboard --force
```

This creates:

```
app/(marketplace)/{path}/
  _components/
    {Route}Shell.tsx      ← "use client", animate prop, motion heading, children slot
    {Route}Skeleton.tsx   ← placeholder <Skeleton> blocks (fill in to mirror real layout)
  loading.tsx             ← <{Route}Shell animate={true}><{Route}Skeleton /></{Route}Shell>
  page.tsx                ← async server component, <{Route}Shell animate={false}>
```

**Route name derivation** — walks path segments from right to left, picks the first
non-dynamic segment (one that doesn't start with `[`), strips route-group parens,
converts to PascalCase (all non-alphanumeric characters become word boundaries):

| Path | Route name |
|------|------------|
| `dashboard` | `Dashboard` |
| `organization/all` | `All` |
| `organization/[did]` | `Organization` |
| `organization/[did]/bumicerts` | `Bumicerts` |
| `my-cool-route` | `MyCoolRoute` |
| `snake_case` | `SnakeCase` |

After scaffolding:
1. Fill in `{Route}Skeleton.tsx` to mirror the real page layout
2. Add your data fetch in `page.tsx`
3. Pass data as props to the Shell
4. Delete the `{/* TODO */}` comments

---

### Summary Checklist for New Pages

1. Does the page have a clear "main data" section (a grid, a list) + static chrome around it?
   - **Yes** → Use Shell pattern. Run `bun run init-marketplace-route <path>`.
   - **No** → Use plain `loading.tsx` with full-page skeleton (Type B).

2. Does secondary dynamic content inside the Shell share data with the main content?
   - **Yes** → Fetch once in `page.tsx`, pass as Shell prop. Shell passes to `<Suspense>` children.
   - **No** → Secondary component fetches its own data inside `<Suspense>`.

3. Does the skeleton contain any readable text?
   - **Yes** → Remove it. Skeletons must be text-free.

4. Did you set the `animate` prop correctly?
   - `loading.tsx` → `animate={true}`
   - `page.tsx` → `animate={false}`
