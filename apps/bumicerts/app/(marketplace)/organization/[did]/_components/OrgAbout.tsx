import type { OrganizationData } from "@/lib/types";
import { LeafletRenderer } from "@/components/ui/leaflet-renderer";

/**
 * Long-form about / mission copy rendered as a Leaflet document.
 * No heading, no section label, no drop cap — content flows straight in.
 * Returns null when there's nothing to show.
 */
export function OrgAbout({ organization }: { organization: OrganizationData }) {
  if (!organization.longDescription.blocks.length) return null;

  return (
    <section className="py-6 md:py-8 org-animate org-fade-in-up org-delay-1">
      <LeafletRenderer
        document={organization.longDescription}
        ownerDid={organization.did}
      />
    </section>
  );
}
