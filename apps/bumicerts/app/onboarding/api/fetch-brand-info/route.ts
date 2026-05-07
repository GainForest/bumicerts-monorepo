/**
 * POST /onboarding/api/fetch-brand-info
 *
 * Fetches brand information from BrandFetch API.
 *
 * Usage:
 *   POST /onboarding/api/fetch-brand-info
 *   Body: { domain: "example.com" }
 *
 * Responses:
 *   200: { found: true, name, description, logoUrl, domain, countryCode, foundedYear } or { found: false }
 *   400: Invalid request body
 *   500: Server error
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { checkRateLimit, recordRateLimitAttempt, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { serverEnv as env } from "@/lib/env/server";

const requestSchema = z.object({
  domain: z.string().min(1).transform((val) => {
    // Remove protocol and path, keep only domain
    try {
      const url = val.startsWith("http") ? val : `https://${val}`;
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, "");
    } catch {
      return val.replace(/^www\./, "");
    }
  }),
});

type BrandFetchLogo = {
  theme?: string;
  type?: string;
  formats?: Array<{
    src: string;
    format: string;
    height?: number;
    width?: number;
    size?: number;
    background?: string;
  }>;
};

type BrandFetchResponse = {
  id?: string;
  name?: string;
  domain?: string;
  claimed?: boolean;
  description?: string;
  longDescription?: string;
  logos?: BrandFetchLogo[];
  company?: {
    foundedYear?: number;
    location?: {
      city?: string;
      country?: string;
      countryCode?: string;
      region?: string;
      state?: string;
    };
  };
};

function trimDescription(text: string | undefined, maxLength: number = 1000): string | undefined {
  if (!text) return undefined;

  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;

  // Find the last complete sentence that fits within maxLength
  const substring = trimmed.substring(0, maxLength);
  const lastSentenceEnd = substring.lastIndexOf(". ");

  if (lastSentenceEnd > 0) {
    // Include the period
    return trimmed.substring(0, lastSentenceEnd + 1);
  }

  // First sentence is longer than maxLength, slice abruptly
  return trimmed.substring(0, maxLength);
}

function findBestLogo(logos?: BrandFetchLogo[]): string | undefined {
  if (!logos || logos.length === 0) return undefined;

  // Priority: icon > logo > symbol, prefer light theme, prefer PNG > SVG
  const typeOrder = ["icon", "logo", "symbol"];

  // Sort logos by type priority
  const sortedLogos = [...logos].sort((a, b) => {
    const aIndex = typeOrder.indexOf(a.type || "");
    const bIndex = typeOrder.indexOf(b.type || "");
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });

  for (const logo of sortedLogos) {
    if (!logo.formats || logo.formats.length === 0) continue;

    // Prefer PNG, then SVG, then any other format
    const pngFormat = logo.formats.find((f) => f.format === "png");
    const svgFormat = logo.formats.find((f) => f.format === "svg");
    const selectedFormat = pngFormat || svgFormat || logo.formats[0];

    if (selectedFormat?.src) {
      return selectedFormat.src;
    }
  }

  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req.headers);
    const ipLimit = await checkRateLimit(
      `ip:${clientIp}`,
      "fetch-brand-info",
      RATE_LIMITS.fetchBrandInfo.byIp
    );
    if (!ipLimit.allowed) {
      return Response.json(
        { error: "RateLimitExceeded", message: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((ipLimit.resetAt.getTime() - Date.now()) / 1000)) } }
      );
    }

    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

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

    const { domain } = parsed.data;

    const apiKey = env.BRANDFETCH_API_KEY;
    if (!apiKey) {
      console.warn("BRANDFETCH_API_KEY not configured");
      return Response.json({ found: false }, { status: 200 });
    }

    // Record attempt BEFORE the BrandFetch API call (to prevent TOCTOU race)
    await recordRateLimitAttempt(`ip:${clientIp}`, "fetch-brand-info");

    // Fetch from BrandFetch API
    const response = await fetch(
      `https://api.brandfetch.io/v2/brands/${domain}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      // Brand not found or API error
      if (response.status === 404) {
        return Response.json({ found: false }, { status: 200 });
      }
      console.error("BrandFetch API error:", response.status, await response.text());
      return Response.json({ found: false }, { status: 200 });
    }

    const brandData: BrandFetchResponse = await response.json();

    // Extract the best available data
    const logoUrl = findBestLogo(brandData.logos);

    // Prefer longDescription over description, trim to max 1000 chars at sentence boundary
    const rawDescription = brandData.longDescription || brandData.description;
    const description = trimDescription(rawDescription, 1000);

    return Response.json({
      found: true,
      name: brandData.name,
      description,
      logoUrl,
      domain: brandData.domain || domain,
      countryCode: brandData.company?.location?.countryCode,
      country: brandData.company?.location?.country,
      foundedYear: brandData.company?.foundedYear,
    });
  } catch (err) {
    console.error("Error fetching brand info:", err);
    return Response.json(
      {
        error: "InternalServerError",
        message: "Unable to fetch website information right now. Please try again.",
      },
      { status: 500 }
    );
  }
}
