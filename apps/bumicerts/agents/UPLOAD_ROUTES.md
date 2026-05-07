# Upload Routes (`/upload/*`)

## Rendering Strategy

`/upload` is the one allowed exception to the old "auth-only server page" rule.
The root page may do an **SSR authoritative account read** so the first render has
the correct current account state, then the client should immediately resume with a
direct freshness query.

Use this split:

- `page.tsx` on `/upload`: read the session, fetch the authoritative account on the
  server, build the initial page data from that account, and pass both into the
  client component.
- Client component on `/upload`: call `indexerTrpc.account.byDid.useQuery(...)`
  directly with `initialData`, `refetchOnMount: "always"`, and `staleTime: 0` so
  the write surface refreshes against the latest indexer state after hydration.
- Other `/upload/*` sub-routes: keep using the practical client-first pattern unless
  there is a concrete reason they need their own SSR read.

```
app/(upload)/upload/
  layout.tsx        ← guards unauthenticated access (server, redirects)
  page.tsx          ← reads session + authoritative account, passes initial props
  loading.tsx       ← full-page skeleton (streams instantly)
  error.tsx         ← error boundary
  _components/
    UploadDashboardClient.tsx  ← "use client", re-queries account freshness directly
```

Allowed on `/upload`: the initial account read that seeds the write surface.

Avoid in `/upload` server pages:

- extra non-essential SSR fetches that slow first paint
- shell/sidebar-style ambient account reads through shared providers when the route
  itself needs fresher state
- treating the SSR result as permanently fresh; the client query is still required

---

## Required Files Per Sub-Route

Every sub-route under `/upload/` **must** have:

| File | Purpose |
|------|---------|
| `page.tsx` | Server component — auth check, plus `/upload` may seed initial authoritative account data |
| `loading.tsx` | Full-page skeleton — streams instantly while client hydrates |
| `error.tsx` | Error boundary — catches unexpected errors in the route segment |

Current sub-routes and their status:

| Route | `loading.tsx` | `error.tsx` |
|-------|--------------|------------|
| `/upload` | ✅ | ✅ |
| `/upload/sites` | ✅ | ✅ |
| `/upload/audio` | ✅ | ✅ |

When adding a new sub-route, always create all three files. The `loading.tsx`
should render the same skeleton the client component shows before data loads.

---

## Mutations

### `update` vs `upsert`

For an existing organization account on `/upload/*`, prefer `update`. That is the
normal edit path once the organization record already exists.

Use `upsert` only for the specific root `/upload` flow where an onboarded **user**
account is being upgraded into an organization for the first time. Do not use
`upsert` for routine edits to an existing organization record.

`update` takes a partial input `{ data, unset? }`:
- Only send the fields that actually changed — the PDS merges your patch against
  the existing record, preserving everything else automatically.
- Images not re-uploaded stay intact (their BlobRefs are preserved server-side).
- Use `unset` only when the user has explicitly cleared an optional field.

```ts
// ✅ correct — only the changed fields
updateMutation.mutate({
  data: {
    displayName: "New Name",
    logo: { image: await toSerializableFile(logoFile) },
  },
});

// ❌ wrong for normal organization edits — resending the whole record every time;
//    any accidentally omitted field (logo, website, etc.) will be wiped from the
//    PDS record
upsertMutation.mutate({
  displayName: "New Name",
  shortDescription: { text: "..." },
  longDescription: { blocks: [...] },
  // ... every other required field too
});
```

### Image fields

Image fields must be wrapped in the `SmallImage` lexicon shape **and** the
`File` must be serialized with `toSerializableFile` before crossing the tRPC
boundary:

```ts
import { toSerializableFile } from "@gainforest/atproto-mutations-next";

data.logo = { image: await toSerializableFile(file) };
data.coverImage = { image: await toSerializableFile(file) };
```

Passing a bare `File` object (not wrapped in `{ image: ... }`) causes a
`ValidationError: Missing required key "image"` from the PDS.

---

## Post-Save Pattern

After a mutation succeeds on `/upload`, keep the local write surface optimistic
and authoritative first, then let the rest of the app catch up through the shared
account caches.

For account-affecting saves, prefer this pattern:

```ts
onSuccess: (result) => {
  // 1. Update the page-local optimistic state immediately.
  setPageData(buildOptimisticPageData(...));

  // 2. Sync the shared account caches so sidebar/header/user menu stay aligned.
  indexerUtils.account.current.setData(undefined, nextAccount);
  indexerUtils.account.byDid.setData({ did }, nextAccount);

  // 3. Clear edit mode so the page returns to view mode.
  setMode(null);

  // 4. Reset the store's edit state.
  onSaveSuccess();
},
```

**Why avoid immediate invalidate + refresh?** The indexer may take a few seconds
to catch up. If you immediately invalidate account queries or force a route
refresh, a stale read can overwrite the optimistic state and regress the UI back
to `unknown` / `user`, re-open onboarding, or temporarily lose fresh media.

Use the optimistic caches first. Then allow normal future reads (revisit, focus,
manual refresh, or a deliberately delayed invalidation) to reconcile once the
indexer is actually current.

**Object URLs for images** (`URL.createObjectURL(file)`) are temporary in-memory
URLs that display the file the user just uploaded. They are replaced by the real
CDN URL once later refetches reconcile with the indexed record. No cleanup needed
— they are short-lived by design.

---

## Edit Mode: nuqs

Edit mode is driven by `?mode=edit` in the URL via `nuqs`. The `useUploadMode`
hook is the only place this param is read or written:

```ts
const [mode, setMode] = useUploadMode();
const isEditing = mode === "edit";

// Enter edit mode:
setMode("edit");

// Exit edit mode (cancel or save success):
setMode(null);   // removes ?mode= from the URL
```

**Never use Zustand or `useState` for the editing toggle.** The URL param is the
single source of truth — it survives hot-reloads, allows deep-linking, and means
cancel is always just "remove the param".
