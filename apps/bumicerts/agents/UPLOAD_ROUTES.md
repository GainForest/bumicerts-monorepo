# Upload Routes (`/upload/*`)

## Rendering Strategy

All routes under `app/(upload)/upload/` are **100% client-rendered** after the
initial auth check. The page server component exists only to read the session and
pass the authenticated DID down to the client component — it does **no** data
fetching.

```
app/(upload)/upload/
  layout.tsx        ← guards unauthenticated access (server, redirects)
  page.tsx          ← reads session.did, renders <UploadDashboardClient did={did} />
  loading.tsx       ← full-page skeleton (streams instantly)
  error.tsx         ← error boundary
  _components/
    UploadDashboardClient.tsx  ← "use client", owns all data fetching via useQuery
```

**Never add `await dataFetch()` in `page.tsx` under `/upload/*`.** All data is
fetched client-side so the skeleton appears instantly and edits are snappy.

---

## Required Files Per Sub-Route

Every sub-route under `/upload/` **must** have:

| File | Purpose |
|------|---------|
| `page.tsx` | Server component — auth check only, passes DID to client component |
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

### `update` — the right choice for `/upload/*`

The user can only reach `/upload/*` if they are authenticated and their org record
already exists (it was created during onboarding). **Always use `update`, never
`upsert`**, for edits on these pages.

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

// ❌ wrong — resending the whole record every time; any accidentally omitted
//    field (logo, website, etc.) will be wiped from the PDS record
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

After a mutation succeeds, always do these three things in order:

```ts
onSuccess: (result) => {
  // 1. Set optimistic query data immediately — user sees updated values
  //    before the indexer processes the change. For image fields, use
  //    URL.createObjectURL(file) as a temporary preview URL.
  queryClient.setQueryData(queryKey, buildOptimisticData(result, edits, current));

  // 2. Clear edit mode so the page returns to view mode.
  setMode(null);

  // 3. Reset the store's edit state.
  onSaveSuccess();

  // 4. Invalidate in the background — background refetch replaces optimistic
  //    data (especially image CDN URLs) once the indexer has caught up.
  void queryClient.invalidateQueries({ queryKey });
},
```

**Why optimistic data?** The indexer may take a few seconds to index the updated
record. Without `setQueryData`, the user would see the old data immediately after
saving (because the refetch returns stale cached data) until the indexer catches
up. Setting optimistic data bridges that gap.

**Object URLs for images** (`URL.createObjectURL(file)`) are temporary in-memory
URLs that display the file the user just uploaded. They are replaced by the real
CDN URL once the background refetch completes. No cleanup needed — they are
short-lived by design.

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
