function sanitizeSensitiveData<T>(value: T): T {
  const mask = (input: string) => input.replace(/sk-[a-zA-Z0-9-_]+/g, 'sk-************************');

  if (typeof value === "string") {
    return mask(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSensitiveData(item)) as T;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value).map(([key, val]) => [key, sanitizeSensitiveData(val)]);
    return Object.fromEntries(entries) as T;
  }

  return value;
}

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * AI Image Refinement API
 * 
 * Requires OPENAI_API_KEY to be set in .env.local:
 *   OPENAI_API_KEY=sk-...
 */
type RefineImageRequest = {
  image?: string; // Base64 data URL (not used for regeneration, but kept for future vision API support)
  originalPrompt?: string;
  refinement?: string;
  width?: number;
  height?: number;
};

export async function POST(request: Request) {
  // Read from .env.local (Next.js automatically loads .env.local)
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error("OPENAI_API_KEY is missing or empty. Check .env.local file.");
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured. Please add it to .env.local and restart the dev server." },
      { status: 500 }
    );
  }
  
  // Validate API key format (should start with sk-)
  if (!apiKey.startsWith('sk-')) {
    console.error("OPENAI_API_KEY format appears invalid (should start with 'sk-')");
    return NextResponse.json(
      { error: "Invalid API key format. OpenAI API keys should start with 'sk-'." },
      { status: 500 }
    );
  }

  let body: RefineImageRequest;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const originalPrompt = body.originalPrompt?.trim();
  const refinement = body.refinement?.trim();

  if (!originalPrompt) {
    return NextResponse.json(
      { error: "Original prompt is required." },
      { status: 400 }
    );
  }

  if (!refinement) {
    return NextResponse.json(
      { error: "Refinement request is required." },
      { status: 400 }
    );
  }

  // Calculate aspect ratio description from dimensions
  const width = body.width ?? 1280;
  const height = body.height ?? 720;
  const aspectRatio = width / height;
  
  // Describe aspect ratio in a natural way
  let aspectDescription = "";
  if (aspectRatio > 2.0) {
    aspectDescription = "ultrawide";
  } else if (aspectRatio > 1.5) {
    aspectDescription = "widescreen";
  } else if (aspectRatio > 1.2) {
    aspectDescription = "wide format";
  } else if (aspectRatio > 0.9) {
    aspectDescription = "square format";
  } else {
    aspectDescription = "portrait format";
  }

  // Combine original prompt with refinement
  // The refinement is a modification request, so we combine them naturally
  const refinedPrompt = `${originalPrompt}, ${refinement}`;

  // DALL-E 3 has a 4000 character limit. Keep instructions concise but effective.
  // Focus on quality and creativity, prioritizing user intent.
  // Avoid production-oriented terms that cause staging equipment to appear.
  const baseInstructions = `Stunning high-quality ${aspectDescription} image (${width}x${height} dimensions), photorealistic or artistic masterpiece quality, dramatic lighting, creative composition, highly detailed, visually striking, no text, no logos, no watermarks, no cameras, no filming equipment, no production crew, no stage equipment unless explicitly requested in the prompt`;
  
  // Combine refined prompt with instructions, ensuring we stay under 4000 chars
  const maxPromptLength = 3500; // Leave buffer for instructions
  const truncatedRefinedPrompt = refinedPrompt.length > maxPromptLength 
    ? refinedPrompt.substring(0, maxPromptLength).trim() + "..."
    : refinedPrompt;
  
  // Prioritize user intent with quality enhancement
  const composedPrompt = `${truncatedRefinedPrompt}. ${baseInstructions}`;

  // Retry logic for transient server errors
  const maxRetries = 2;
  let lastError: { status: number; detail: unknown } | null = null;

  try {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff: wait 1s, then 2s
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          console.log(`Retrying image refinement (attempt ${attempt + 1}/${maxRetries + 1}) after ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        // Map dimensions to DALL-E 3 supported sizes
        // DALL-E 3 supports: "1024x1024", "1792x1024", or "1024x1792"
        let dallESize: string;
        if (aspectRatio < 0.9) {
          // Portrait
          dallESize = "1024x1792";
        } else if (aspectRatio > 1.5) {
          // Landscape/widescreen
          dallESize = "1792x1024";
        } else {
          // Square or near-square
          dallESize = "1024x1024";
        }

        const response = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: composedPrompt,
            size: dallESize,
            quality: "hd",
            style: "vivid",
            n: 1,
            response_format: "b64_json",
          }),
        });

        if (!response.ok) {
          let rawDetail: unknown = null;
          try {
            rawDetail = await response.json();
          } catch (jsonError) {
            rawDetail = await response.text();
          }

          const sanitizedDetail = sanitizeSensitiveData(rawDetail);
          lastError = { status: response.status, detail: sanitizedDetail };

          // Retry on server errors (500, 502, 503, 504), but not on client errors (400, 401, 403, 429)
          const isServerError = response.status >= 500;
          const shouldRetry = isServerError && attempt < maxRetries;

          if (shouldRetry) {
            console.warn(`OpenAI server error (${response.status}), will retry:`, sanitizedDetail);
            continue; // Retry
          }

          // Don't retry: either it's a client error or we've exhausted retries
          console.error("OpenAI image refinement failed:", response.status, sanitizedDetail);
          
          const errorMessage = isServerError
            ? "OpenAI's servers are experiencing issues. Please try again in a moment."
            : "Image refinement failed. Please check your refinement request and try again.";

          return NextResponse.json(
            {
              error: errorMessage,
              detail: sanitizedDetail,
            },
            { status: isServerError ? 502 : response.status }
          );
        }

        // Success - break out of retry loop
        const payload = await response.json();
        const imageBase64: string | undefined = payload?.data?.[0]?.b64_json;

        if (!imageBase64) {
          console.error("OpenAI response missing image data:", payload);
          return NextResponse.json(
            { error: "Image refinement returned no data." },
            { status: 502 }
          );
        }

        const dataUrl = `data:image/png;base64,${imageBase64}`;

        return NextResponse.json({
          image: dataUrl,
          meta: {
            provider: "openai",
            model: "dall-e-3",
            size: dallESize,
            requestedSize: `${width}x${height}`,
            quality: "hd",
          },
        });
      } catch (fetchError) {
        // Network or other fetch errors
        if (attempt < maxRetries) {
          console.warn(`Fetch error on attempt ${attempt + 1}, will retry:`, fetchError);
          lastError = { status: 0, detail: fetchError };
          continue; // Retry
        }
        // Exhausted retries - throw to outer catch
        throw fetchError;
      }
    }

    // Should never reach here, but handle edge case
    return NextResponse.json(
      {
        error: "Image refinement failed after multiple attempts. Please try again later.",
        detail: lastError?.detail,
      },
      { status: 502 }
    );
  } catch (error) {
    console.error("Image refinement error:", sanitizeSensitiveData(error));
    return NextResponse.json(
      {
        error: "Unexpected error while refining image.",
      },
      { status: 500 }
    );
  }
}

