import type { OrganizationData } from "@/lib/types";

/**
 * Long-form about / mission copy.
 * No heading, no section label, no drop cap — content flows straight in.
 * Returns null when there's nothing to show.
 */
export function OrgAbout({ organization }: { organization: OrganizationData }) {
  if (!organization.longDescription) return null;

  const paragraphs = organization.longDescription
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return null;

  return (
    <section className="py-6 md:py-8 org-animate org-fade-in-up org-delay-1">
      {paragraphs.map((para, i) => (
        <p
          key={i}
          className="text-base leading-relaxed text-foreground/80 mb-4 last:mb-0"
        >
          {para}
        </p>
      ))}
    </section>
  );
}
