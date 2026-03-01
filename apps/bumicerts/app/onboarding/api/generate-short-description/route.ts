/**
 * POST /onboarding/api/generate-short-description
 *
 * Generates a short description and objectives using Google Gemini Flash.
 *
 * Usage:
 *   POST /onboarding/api/generate-short-description
 *   Body: { longDescription: string, organizationName: string, country?: string }
 *
 * Responses:
 *   200: { shortDescription: string, objectives: string[], success: true }
 *   400: Invalid request body
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { countries } from "@/lib/countries";
import { checkRateLimit, recordRateLimitAttempt, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

const VALID_OBJECTIVES = ["Conservation", "Research", "Education", "Community", "Other"] as const;
type Objective = (typeof VALID_OBJECTIVES)[number];

const requestSchema = z.object({
  longDescription: z.string().min(50, "Description must be at least 50 characters"),
  organizationName: z.string().min(1, "Organization name is required"),
  country: z.string().optional(),
});

function createFallbackResponse(organizationName: string, countryName?: string): { shortDescription: string; objectives: Objective[] } {
  const locationPart = countryName ? ` based in ${countryName}` : "";
  return {
    shortDescription: `${organizationName} is an environmental organization${locationPart} working towards a sustainable future.`,
    objectives: ["Other"],
  };
}

function parseObjectives(text: string): Objective[] {
  const objectives: Objective[] = [];
  for (const obj of VALID_OBJECTIVES) {
    if (text.toLowerCase().includes(obj.toLowerCase()) && obj !== "Other") {
      objectives.push(obj);
    }
  }
  return objectives.length > 0 ? objectives : ["Other"];
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req.headers);
    const ipLimit = await checkRateLimit(
      `ip:${clientIp}`,
      "generate-short-description",
      RATE_LIMITS.generateShortDescription.byIp
    );
    if (!ipLimit.allowed) {
      return Response.json(
        { error: "RateLimitExceeded", message: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((ipLimit.resetAt.getTime() - Date.now()) / 1000)) } }
      );
    }

    const parsed = requestSchema.safeParse(await req.json());

    if (!parsed.success) {
      return Response.json(
        {
          error: "BadRequest",
          message: "Invalid request body",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { longDescription, organizationName, country } = parsed.data;
    const countryName = country ? countries[country]?.name : undefined;
    const countryContext = countryName ? ` based in ${countryName}` : "";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY not configured, using fallback");
      const fallback = createFallbackResponse(organizationName, countryName);
      return Response.json({ ...fallback, success: true });
    }

    // Record attempt BEFORE the Gemini API call (to prevent TOCTOU race)
    await recordRateLimitAttempt(`ip:${clientIp}`, "generate-short-description");

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const prompt = `You are a copywriter helping an environmental conservation organization create a short description for their profile.

Organization Name: ${organizationName}${countryContext}

Full Description:
${longDescription}

TASK 1: Write a compelling short description (1-2 sentences, maximum 300 characters) that:
- Captures the organization's core mission and impact
- Is suitable for previews and search results
- Uses active, engaging language
- Does not start with "We" or the organization name
- Does not include any quotation marks

TASK 2: Based on the description, identify which of these objectives apply to this organization (can be multiple):
- Conservation: Wildlife protection, habitat preservation, biodiversity
- Research: Scientific studies, data collection, monitoring
- Education: Training, awareness, outreach, capacity building
- Community: Local engagement, indigenous peoples, social impact
- Other: If none of the above clearly apply

Respond in this exact format:
SHORT_DESCRIPTION: <your short description here>
OBJECTIVES: <comma-separated list of applicable objectives>`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();

      // Parse the response (using [\s\S] instead of . with s flag for multiline matching)
      const shortDescMatch = text.match(/SHORT_DESCRIPTION:\s*([\s\S]+?)(?=\nOBJECTIVES:|$)/);
      const objectivesMatch = text.match(/OBJECTIVES:\s*([\s\S]+)/);

      let shortDescription = shortDescMatch?.[1]?.trim() || "";
      const objectivesText = objectivesMatch?.[1]?.trim() || "";

      // Clean up short description
      shortDescription = shortDescription.replace(/^["']|["']$/g, "");
      if (shortDescription.length > 300) {
        shortDescription = shortDescription.substring(0, 297) + "...";
      }

      // If parsing failed, use fallback for short description
      if (!shortDescription) {
        shortDescription = createFallbackResponse(organizationName, countryName).shortDescription;
      }

      // Parse objectives
      const objectives = parseObjectives(objectivesText);

      return Response.json({
        shortDescription,
        objectives,
        success: true,
      });
    } catch (aiError) {
      console.error("Gemini API error, using fallback:", aiError);
      const fallback = createFallbackResponse(organizationName, countryName);
      return Response.json({ ...fallback, success: true });
    }
  } catch (err) {
    console.error("Error in generate-short-description:", err);
    // Even on unexpected errors, return a valid response so onboarding can continue
    return Response.json({
      shortDescription: "An environmental organization working towards a sustainable future.",
      objectives: ["Other"],
      success: true,
    });
  }
}
