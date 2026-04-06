"use client";

import { motion } from "framer-motion";
import { FileTextIcon } from "lucide-react";
import { useUploadDashboardStore } from "./store";
import { useUploadMode } from "../_hooks/useUploadMode";
import type { OrganizationData } from "@/lib/types";
import { LeafletRenderer } from "@/components/ui/leaflet-renderer";
import { LeafletEditor } from "@/components/ui/leaflet-editor";

interface EditableAboutProps {
  organization: OrganizationData;
}

/**
 * Displays the long-form "About" section.
 *
 * - View mode: renders as a styled Leaflet document.
 * - Edit mode: WYSIWYG Leaflet editor that buffers changes in the store.
 */
export function EditableAbout({ organization }: EditableAboutProps) {
  const [mode] = useUploadMode();
  const isEditing = mode === "edit";

  const edits = useUploadDashboardStore((s) => s.edits);
  const setEdit = useUploadDashboardStore((s) => s.setEdit);

  const longDescription = edits.longDescription ?? organization.longDescription;
  const hasContent = longDescription.blocks.length > 0;

  if (!isEditing && !hasContent) return null;

  if (isEditing) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="py-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <FileTextIcon className="h-4 w-4 text-primary" />
          <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
            About
          </span>
        </div>

        <div className="w-full rounded-xl border border-border overflow-hidden">
          <LeafletEditor
            content={longDescription}
            onChange={(doc) => setEdit("longDescription", doc)}
            ownerDid={organization.did}
            placeholder="Tell the world about your organisation — its mission, history, and the work you do…"
          />
        </div>
      </motion.section>
    );
  }

  // View mode
  if (!hasContent) return null;

  return (
    <section className="py-6 md:py-8">
      <LeafletRenderer
        document={longDescription}
        ownerDid={organization.did}
      />
    </section>
  );
}
