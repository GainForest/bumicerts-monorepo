# Bumicerts — Agent Guidelines

General rules that apply across the entire codebase. For domain-specific rules,
follow the references at the bottom.

---

## Tooling

- **Always use `bun`** as the package manager and script runner. Never use npm or pnpm.
- **Always run `bun run lint`** after making changes. Lint errors must be resolved —
  never ignore them. Warnings are acceptable only if they are genuinely not important.
- **Run `bun run build` before pushing.** Don't push speculatively and rely on CI to
  catch build errors — it wastes build resources.

---

## File Organization

- **Prefer creating a new file** over appending more code to an existing one. If a
  component, hook, or utility is growing large or serving a distinct purpose, split it.

---

## Type Safety

- **Never use `as any`.** No exceptions.
- **Avoid `as` entirely** unless there is genuinely no other way. Prefer proper typing
  or type guards. `as unknown as SomeType` is a red flag — exhaust other options first.
- **Never use `!` to assert non-null.** Use optional chaining (`?.`), nullish
  coalescing (`??`), or an explicit guard instead.
- **No loose types.** Every variable, parameter, and return value should have a type
  that accurately describes what it holds.

---

## Null / Undefined Handling

- **Prefer `??` over `||`** for fallbacks. `||` coerces all falsy values (including
  `0`, `""`, `false`); `??` only falls back on `null` and `undefined`, which is almost
  always the correct intent.

---

## Base URL

- **All public base URL resolution lives in `lib/url.ts`.** The two exported
  functions are the only permitted way to get the app's own base URL in server-side
  code:
  - `getPublicUrl()` — returns `string | undefined`; use where `undefined` is
    acceptable (e.g. the auth setup, where `undefined` triggers a build-time
    placeholder in the package).
  - `requirePublicUrl()` — returns `string` and throws a descriptive error if no URL
    can be resolved; use everywhere a URL is required at runtime (metadata, structured
    data, absolute asset URIs, internal server-to-self fetches).
- **Never read `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, or
  `NEXT_PUBLIC_BASE_URL` directly anywhere else in the codebase.** `lib/url.ts` is
  the single place that knows about these variables and their priority order.
- **Never hardcode `https://bumicerts.com` or any other domain string.** Always call
  `requirePublicUrl()` so the correct domain is used in every environment.
- For local development, set `NEXT_PUBLIC_BASE_URL=http://127.0.0.1:3001` in
  `.env.local`. For production on Vercel, set
  `NEXT_PUBLIC_BASE_URL=https://alpha.fund.gainforest.app` in the project's
  **Production** environment variables. `VERCEL_PROJECT_PRODUCTION_URL` and
  `VERCEL_URL` are automatic fallbacks — never set them manually.

---

## Links & Routes

- **Never hardcode URLs or paths inline.** Add the path to `lib/links.ts` and import
  it from there. This keeps all navigation targets in one place and makes refactoring
  safe.

---

## Icons

- **For bumicert-specific icons**, use `BumicertIcon` from `icons/BumicertIcon.tsx`.
  Bumicert is a concept defined by this project — there is no equivalent in Lucide, so
  do not substitute a random Lucide icon.
- **For all other icons**, use Lucide. Pick the icon that is semantically accurate for
  the action or concept, not merely one that looks similar.

---

## Server ↔ Client Serialization

When passing data across the server/client boundary (server component → client
component props, or client → server via actions/tRPC), ensure the data is properly
serialized. Plain objects, arrays, strings, numbers, and booleans are fine. Class
instances, `Date` objects, `Map`, `Set`, `undefined` in object values, and other
non-serializable types must be converted to a serializable form before crossing the
boundary, and reconstructed on the other side if needed.

---

## Error Handling on Server Components

- **Never `throw` inside an SSR page component.** In production, Next.js catches
  unhandled throws in Server Components and renders a generic error page, hiding the
  actual error from both the user and the logs in an unhelpful way.
- **Return `<ErrorPage />` instead.** If a data fetch fails or a required resource is
  missing, `return <ErrorPage ... />` so the page renders a meaningful, visible error.

---

## Buttons & Icons

- **Do not set an explicit size on an icon inside a `<Button>` component.** The
  `<Button>` component already handles icon sizing based on its own `size` prop. Adding
  an explicit `className="size-4"` (or similar) on the icon overrides that and causes
  inconsistency.

---

## ATProto Mutations: `update` vs `upsert`

When calling tRPC mutations against ATProto records, always choose the right
operation for the situation:

| Situation | Use |
|-----------|-----|
| Record is **guaranteed to exist** (user is already authenticated and viewing the record) | `update` |
| Record **may or may not exist** (first save after onboarding, seeding) | `upsert` |

**Why this matters:**

- `update` takes `{ data: Partial<RecordFields>, unset?: string[] }` — you only send
  the fields that changed. The mutation fetches the existing record from the PDS
  server-side and applies a patch. Fields omitted from `data` are preserved
  automatically (including BlobRefs for images, optional fields, etc.).
- `upsert` takes the **full** record shape — all required fields every time. If you
  use `upsert` for a partial edit, you must re-send every field, and anything
  accidentally omitted will be lost.

**Rule of thumb for `/upload/*` routes:** always use `update`. The user can only
reach those pages after their org record exists.

**Image fields** must be wrapped in the `SmallImage` shape and the File serialized:
```ts
// ✅ correct
data.logo = { image: await toSerializableFile(file) };

// ❌ wrong — resolveFileInputs can't find the file inside logo directly
data.logo = file;
data.logo = await toSerializableFile(file);
```

**After a successful update:**
1. Call `queryClient.setQueryData(key, optimistic)` — apply text fields from the
   mutation result immediately; use `URL.createObjectURL(file)` for newly uploaded
   images so the UI updates before the indexer catches up.
2. Clear edit mode (set nuqs mode param to `null`).
3. Call `queryClient.invalidateQueries(key)` to trigger a background refetch that
   will replace optimistic image object URLs with real CDN URLs once indexed.

---

## Complex Systems Reference

Before modifying a complex or non-obvious system, check `docs/` for a reference
document on that system. These documents describe how existing flows work — architecture,
data flow, API contracts, and key decisions — so you don't have to reverse-engineer
them from the code.

Current reference documents:
- [`docs/DONATIONS_FLOW.md`](docs/DONATIONS_FLOW.md) — USDC donation flow (EIP-3009,
  x402, modal sequence, facilitator, wallet attestation)

---

## Modals

The app uses a custom stack-based modal system. Do not use plain Radix `<Dialog>` or
shadcn `<Sheet>` directly for app-level modals.

→ See [`agents/MODALS.md`](agents/MODALS.md) for the full API, usage patterns, and
guidance on where to place a new modal.

---

## New Routes

→ See [`agents/NEW_ROUTE.md`](agents/NEW_ROUTE.md) for the SSR/SEO strategy, the
Shell pattern, skeleton rules, caching behaviour, and the scaffold CLI.

---

## Upload Routes (`/upload/*`)

→ See [`agents/UPLOAD_ROUTES.md`](agents/UPLOAD_ROUTES.md) for the rendering
strategy, required files per sub-route, and mutation patterns specific to the
upload dashboard.

---

## Design

→ See [`agents/DESIGN.md`](agents/DESIGN.md) for typography, colour, spacing, motion,
and component patterns.
