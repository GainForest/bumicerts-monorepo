import { z } from "zod";
import { countries } from "@/lib/countries";

/**
 * Schema for organization information during onboarding.
 * Shared between client-side validation (StepOrgDetails) and server-side validation (onboard API).
 */
export const organizationInfoSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(100, "Display name must be 100 characters or less"),
  shortDescription: z.string().min(1, "Short description is required").max(300, "Short description must be 300 characters or less"),
  longDescription: z.string().min(50, "Long description must be at least 50 characters").max(5000, "Long description must be 5000 characters or less"),
  country: z.string().length(2, "Country must be a 2-letter ISO code").refine(
    (code) => code in countries,
    "Invalid country code"
  ),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  startDate: z.string().optional(),
});

export type OrganizationInfo = z.infer<typeof organizationInfoSchema>;
