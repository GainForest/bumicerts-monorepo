"use client";

/**
 * UploadDashboardClient
 *
 * Mode is driven entirely by the `?mode=` URL param (via nuqs):
 *
 * /upload          → view mode  (OrgHero + OrgAbout, read-only)
 * /upload?mode=edit → edit mode  (EditableHero + EditableAbout + EditBar)
 *
 * nuqs is the single source of truth — no Zustand isEditing flag, no
 * useEffect sync, no re-trigger bugs. Cancel simply clears the param.
 *
 * Save uses `organization.info.update` (not upsert) because the record is
 * guaranteed to exist when the user reaches /upload. The update mutation
 * fetches the existing record server-side and applies a partial patch, so
 * we only send the fields that actually changed. This means:
 *   - logo / coverImage are preserved from the PDS record when not re-uploaded
 *   - website / startDate are preserved unless explicitly changed
 *
 * On success:
 *   1. The mode param is cleared (returns to view mode).
 *   2. The query cache is updated immediately with the best data we have
 *      (text fields from the mutation result + object URLs for new images).
 *      This prevents the user seeing stale data while the indexer catches up.
 *   3. The query is invalidated so a background refetch replaces the
 *      optimistic data with real CDN URLs once the indexer has processed it.
 */

import { useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { trpc } from "@/lib/trpc/client";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { orgInfoToOrganizationData } from "@/lib/adapters";
import type { GraphQLOrgInfoItem } from "@/lib/adapters";
import type { OrganizationData } from "@/lib/types";
import type { LinearDocument, Richtext } from "@gainforest/atproto-mutations-next";
import { toSerializableFile } from "@gainforest/atproto-mutations-next";
import { formatError } from "@/lib/utils/trpc-errors";

import Container from "@/components/ui/container";
import ErrorPage from "@/components/error-page";
import { OrgHero } from "@/app/(marketplace)/organization/[did]/_components/OrgHero";
import { OrgAbout } from "@/app/(marketplace)/organization/[did]/_components/OrgAbout";
import { EditableHero, EditBar } from "./EditableHero/index";
import { EditableAbout } from "./EditableAbout";
import { UploadNavGrid } from "./UploadNavGrid";
import { UploadDashboardSkeleton } from "./UploadDashboardSkeleton";
import { OrgSetupPrompt } from "./OrgSetupPrompt";
import { useUploadDashboardStore } from "./store";
import { useUploadMode } from "../_hooks/useUploadMode";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UploadDashboardClientProps {
  /** The authenticated user's DID — obtained from server-side session. */
  did: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function UploadDashboardClient({ did }: UploadDashboardClientProps) {
  const indexerUtils = indexerTrpc.useUtils();
  const [mode, setMode] = useUploadMode();
  const isEditing = mode === "edit";

  // ── Store ───────────────────────────────────────────────────────────────────
  const serverData = useUploadDashboardStore((s) => s.serverData);
  const isSaving = useUploadDashboardStore((s) => s.isSaving);
  const setServerData = useUploadDashboardStore((s) => s.setServerData);
  const setSaving = useUploadDashboardStore((s) => s.setSaving);
  const setSaveError = useUploadDashboardStore((s) => s.setSaveError);
  const onSaveSuccess = useUploadDashboardStore((s) => s.onSaveSuccess);
  const edits = useUploadDashboardStore((s) => s.edits);
  const hasChanges = useUploadDashboardStore((s) => s.hasChanges);

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const { data: orgData, isLoading, error } = indexerTrpc.organization.byDid.useQuery({ did });
  const fetchedOrg = orgData?.org
    ? orgInfoToOrganizationData(orgData.org as GraphQLOrgInfoItem, 0)
    : null;

  useEffect(() => {
    if (fetchedOrg) {
      setServerData(fetchedOrg);
    }
  }, [fetchedOrg, setServerData]);

  // ── Mutations ───────────────────────────────────────────────────────────────
  const updateMutation = trpc.organization.info.update.useMutation({
    onSuccess: (result) => {
      // 1. Immediately update the query cache with the best data available:
      //    - Text/scalar fields come from the mutation result record (authoritative).
      //    - Image URLs: if the user uploaded a new file, create a temporary object URL
      //      for instant preview. The background refetch will replace it with the real
      //      CDN URL once the indexer processes the new blob.
      //    - Fields the user didn't change fall back to the existing serverData values.
      const cachedOrg = indexerUtils.organization.byDid.getData({ did });
      const current: OrganizationData | null | undefined = cachedOrg?.org
        ? orgInfoToOrganizationData(cachedOrg.org as GraphQLOrgInfoItem, 0)
        : null;
      if (current) {
        const rec = result.record;
        const shortDesc = rec.shortDescription;

        // Derive optimistic image URLs: object URL if a new file was uploaded,
        // otherwise keep whatever was already in the cache.
        const logoUrl = edits.logo
          ? URL.createObjectURL(edits.logo)
          : current.logoUrl;
        const coverImageUrl = edits.coverImage
          ? URL.createObjectURL(edits.coverImage)
          : current.coverImageUrl;

        const optimistic: OrganizationData = {
          ...current,
          displayName: rec.displayName ?? current.displayName,
          shortDescription: typeof shortDesc?.text === "string"
            ? shortDesc.text
            : current.shortDescription,
          longDescription: rec.longDescription
            ? (rec.longDescription as unknown as OrganizationData["longDescription"])
            : current.longDescription,
          country: rec.country ?? current.country,
          website: rec.website ?? current.website,
          startDate: rec.startDate ?? current.startDate,
          visibility: (rec.visibility as OrganizationData["visibility"]) ?? current.visibility,
          logoUrl,
          coverImageUrl,
        };
        // Store the optimistic OrganizationData in the upload dashboard store
        // so the UI updates instantly (the tRPC cache holds the raw org data shape,
        // not the OrganizationData shape, so we update the store directly)
        setServerData(optimistic);
      }

      // 2. Clear edit mode — return to view mode.
      setMode(null);

      // 3. Reset the store's edit state and saving flag.
      onSaveSuccess();

      // 4. Invalidate in the background so the real indexer data replaces the
      //    optimistic state once it's available (mainly for image CDN URLs).
      void indexerUtils.organization.byDid.invalidate({ did });
    },
    onError: (mutationErr) => {
      setSaving(false);
      setSaveError(formatError(mutationErr));
    },
  });

  // ── Save handler ────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!serverData || !hasChanges() || isSaving) return;

    setSaving(true);
    setSaveError(null);

    // Build partial data — only include fields that were actually edited.
    // The update mutation fetches the existing record from the PDS and merges
    // this patch, so omitted fields are preserved automatically.
    const data: Record<string, unknown> = {};

    if (edits.displayName !== null) {
      data.displayName = edits.displayName;
    }

    if (edits.shortDescription !== null) {
      const resolvedFacets = edits.shortDescriptionFacets ?? serverData.shortDescriptionFacets;
      // Our Facet[] (from leaflet-react) and the generated RichtextFacet.Main[] are
      // structurally identical at runtime (same app.bsky.richtext.facet JSON shape).
      // Cast at this mutation boundary — safe by structural equivalence.
      const shortDescriptionInput: Richtext = {
        text: edits.shortDescription,
        facets: resolvedFacets.length > 0
          ? resolvedFacets as unknown as Richtext["facets"]
          : undefined,
      };
      data.shortDescription = shortDescriptionInput;
    }

    if (edits.longDescription !== null) {
      // LeafletLinearDocument is structurally compatible with the generated LinearDocument
      // at runtime (both serialize to the same JSON). Cast at this mutation boundary.
      data.longDescription = edits.longDescription as unknown as LinearDocument;
    }

    if (edits.country !== null) {
      data.country = edits.country;
    }

    if (edits.visibility !== null) {
      data.visibility = edits.visibility;
    }

    // null in store = "unchanged" — omit from the patch so the update
    // mutation preserves the existing PDS value automatically.
    if (edits.website !== null) {
      data.website = edits.website as `${string}:${string}`;
    }

    if (edits.startDate !== null) {
      data.startDate = edits.startDate as `${string}-${string}-${string}T${string}:${string}:${string}Z`;
    }

    // Images must be wrapped in SmallImage shape { image: SerializableFile }
    // so that resolveFileInputs can upload the file and replace it with a BlobRef.
    if (edits.logo !== null) {
      data.logo = { image: await toSerializableFile(edits.logo) };
    }

    if (edits.coverImage !== null) {
      data.coverImage = { image: await toSerializableFile(edits.coverImage) };
    }

    updateMutation.mutate({ data });
  }, [serverData, edits, hasChanges, isSaving, setSaving, setSaveError, updateMutation]);

  // ── Render states ───────────────────────────────────────────────────────────

  if (isLoading) {
    return <UploadDashboardSkeleton />;
  }

  if (error) {
    return (
      <Container className="pt-4">
        <ErrorPage
          title="Couldn't load your organisation"
          description="We had trouble fetching your organisation data. Please try refreshing."
          error={error}
          showRefreshButton
          showHomeButton={false}
        />
      </Container>
    );
  }

  // Organization doesn't exist yet — prompt user to set it up
  if (!fetchedOrg && !serverData) {
    return (
      <Container className="pt-4">
        <OrgSetupPrompt did={did} />
      </Container>
    );
  }

  // Still waiting for serverData to be set in store after fetchedOrg arrives
  if (!serverData) {
    return <UploadDashboardSkeleton />;
  }

  // ── Edit mode ───────────────────────────────────────────────────────────────

  if (isEditing) {
    return (
      <form
        id="upload-dashboard-save-form"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
      >
        <Container className="pt-4 pb-8 space-y-2">
          <EditableHero organization={serverData} />

          <AnimatePresence>
            <motion.div
              key="edit-bar"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="overflow-hidden"
            >
              <EditBar />
            </motion.div>
          </AnimatePresence>

          <EditableAbout organization={serverData} />
        </Container>
      </form>
    );
  }

  // ── View mode ───────────────────────────────────────────────────────────────

  return (
    <Container className="pt-4 pb-8 space-y-2">
      <OrgHero organization={serverData} showEditButton />
      <OrgAbout organization={serverData} />
      <UploadNavGrid />
    </Container>
  );
}
