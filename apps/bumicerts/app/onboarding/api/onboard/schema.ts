import { z } from "zod";
import { countries } from "@/lib/countries";
import { $parse as parseOrganizationInfoLexicon } from "@gainforest/generated/app/gainforest/organization/info.defs";
import { textToLinearDocument } from "@/lib/utils/linearDocument";
import {
  extractValidationIssues,
  formatValidationIssuesMessage,
  FIELD_LABELS,
  type ValidationIssue,
} from "@gainforest/atproto-mutations-core";

/**
 * Schema for organization information during onboarding.
 * Shared for shape/normalization. Lexicon constraints are validated with the
 * same parser that organization.info mutations use internally.
 */
export const organizationInfoSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required"),
  shortDescription: z.string().trim().min(1, "Short description is required"),
  longDescription: z
    .string()
    .trim()
    .min(1, "Long description is required"),
  country: z.string().length(2, "Country must be a 2-letter ISO code").refine(
    (code) => code in countries,
    "Invalid country code",
  ),
  website: z
    .string()
    .transform((val) => {
      if (!val || val.trim() === "") return "";
      const trimmed = val.trim();
      return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    })
    .pipe(z.string().url("Invalid website URL").optional().or(z.literal(""))),
  startDate: z.string().optional(),
});

export type OrganizationInfo = z.infer<typeof organizationInfoSchema>;

export function validateOrganizationInfoWithLexicon(
  input: OrganizationInfo,
  objectives: readonly string[],
):
  | { success: true; data: OrganizationInfo }
  | { success: false; issues: ValidationIssue[]; userMessage: string } {
  try {
    parseOrganizationInfoLexicon({
      $type: "app.gainforest.organization.info",
      displayName: input.displayName,
      shortDescription: { text: input.shortDescription },
      longDescription: textToLinearDocument(input.longDescription),
      objectives,
      country: input.country,
      visibility: "Public",
      website: input.website || undefined,
      startDate: input.startDate
        ? `${input.startDate}T00:00:00.000Z`
        : undefined,
      createdAt: new Date().toISOString(),
    });

    return { success: true, data: input };
  } catch (error) {
    // Extract structured validation issues from the lexicon error
    const issues = extractValidationIssues(error);

    // Format into a user-friendly message using field labels
    const userMessage =
      issues.length > 0
        ? formatValidationIssuesMessage(issues, FIELD_LABELS)
        : "Organization details are invalid. Please review and try again.";

    return {
      success: false,
      issues,
      userMessage,
    };
  }
}
