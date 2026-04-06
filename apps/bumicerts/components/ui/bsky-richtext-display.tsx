"use client";

/**
 * BskyRichTextDisplay — read-only renderer for Bluesky-style richtext.
 *
 * Used wherever shortDescription is displayed in full (not truncated in a card).
 * Handles mentions, links, and hashtags from app.bsky.richtext.facet.
 *
 * Mentions are wrapped in a MentionTooltip that:
 *   - Lazily fetches the Bluesky profile on hover
 *   - Checks if the DID is a Gainforest org and shows a profile link if so
 */

import { RichTextDisplay, type MentionProps } from "@gainforest/leaflet-react/richtext";
import type { Facet } from "@gainforest/leaflet-react/richtext";
import { MentionTooltip } from "./mention-tooltip";

// ── Custom mention renderer ───────────────────────────────────────────────────

function MentionWithTooltip({ text, did }: MentionProps) {
  // text is "@handle" — strip the @ for the handle prop
  const handle = text.startsWith("@") ? text.slice(1) : text;

  return (
    <MentionTooltip did={did} handle={handle}>
      <a
        href={`https://bsky.app/profile/${did}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline font-medium"
        onClick={(e) => e.stopPropagation()}
      >
        {text}
      </a>
    </MentionTooltip>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface BskyRichTextDisplayProps {
  text: string;
  facets?: Facet[];
  className?: string;
}

export function BskyRichTextDisplay({
  text,
  facets,
  className,
}: BskyRichTextDisplayProps) {
  return (
    <RichTextDisplay
      value={{ text, facets: facets ?? [] }}
      renderMention={MentionWithTooltip}
      className={className}
      classNames={{
        link: "text-primary hover:underline",
        tag: "text-primary hover:underline font-medium",
      }}
    />
  );
}
