/**
 * POST /bumicert/create/api/generate-short-description
 *
 * Generates a short description for a bumicert using Google Gemini Flash.
 * Takes the impact story (LinearDocument extracted as plain text) and title,
 * returns a concise short description suitable for previews and list views.
 *
 * Body: { descriptionText: string, title: string }
 * Response: { shortDescription: string, success: true }
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  checkRateLimit,
  recordRateLimitAttempt,
  getClientIp,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { serverEnv as env } from "@/lib/env/server";

const requestSchema = z.object({
  descriptionText: z
    .string()
    .min(1, "Description text is required")
    .max(50000),
  title: z.string().min(1, "Title is required").max(500),
});

function createFallbackResponse(title: string): { shortDescription: string } {
  return {
    shortDescription: `${title} — an impact story documenting real-world environmental or social progress.`,
  };
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
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.ceil((ipLimit.resetAt.getTime() - Date.now()) / 1000)
            ),
          },
        }
      );
    }

    const parsed = requestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json(
        { error: "BadRequest", message: "Invalid request body", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { descriptionText, title } = parsed.data;

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY not configured, using fallback");
      return Response.json({ ...createFallbackResponse(title), success: true });
    }

    // Record attempt BEFORE the API call (prevents TOCTOU race)
    await recordRateLimitAttempt(`ip:${clientIp}`, "generate-short-description");

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `You are a copywriter helping document environmental and social impact work.

Title: ${title}

Full Impact Story:
${descriptionText}

TASK: Write a compelling short description (1–2 sentences, maximum 300 characters) that:
- Captures the core impact and outcome of this work
- Is suitable for previews, cards, and list views
- Uses active, concrete language — focus on what was done and what changed
- Does not start with "We", "I", or the title
- Does not include quotation marks

Respond with ONLY the short description text, nothing else.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      // Strip any accidental leading/trailing quotes
      let shortDescription = text.replace(/^["']|["']$/g, "").trim();

      if (shortDescription.length > 300) {
        shortDescription = shortDescription.substring(0, 297) + "...";
      }

      if (!shortDescription) {
        return Response.json({ ...createFallbackResponse(title), success: true });
      }

      return Response.json({ shortDescription, success: true });
    } catch (aiError) {
      console.error("Gemini API error, using fallback:", aiError);
      return Response.json({ ...createFallbackResponse(title), success: true });
    }
  } catch (err) {
    console.error("Error in bumicert generate-short-description:", err);
    return Response.json(
      { shortDescription: "An impact story documenting meaningful progress.", success: true }
    );
  }
}
