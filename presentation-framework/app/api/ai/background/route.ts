import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * AI Background Image Generation API
 * 
 * Requires OPENAI_API_KEY to be set in .env.local:
 *   OPENAI_API_KEY=sk-...
 */
type GenerateBackgroundRequest = {
  prompt?: string;
  width?: number;
  height?: number;
};

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

  let body: GenerateBackgroundRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const userPrompt = body.prompt?.trim();
  if (!userPrompt) {
    return NextResponse.json(
      { error: "Prompt is required." },
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

  // Focus on quality and creativity, prioritizing user intent.
  // Avoid production-oriented terms that cause staging equipment to appear.
  const baseInstructions = `Stunning high-quality ${aspectDescription} image (${width}x${height} dimensions), photorealistic or artistic masterpiece quality, dramatic lighting, creative composition, highly detailed, visually striking, no text, no logos, no watermarks, no cameras, no filming equipment, no production crew, no stage equipment unless explicitly requested in the prompt`;
  
  // Combine user prompt with instructions, ensuring we stay under 4000 chars
  const maxPromptLength = 3500; // Leave buffer for instructions
  const truncatedUserPrompt = userPrompt.length > maxPromptLength 
    ? userPrompt.substring(0, maxPromptLength).trim() + "..."
    : userPrompt;
  
  // Prioritize user intent with quality enhancement
  const composedPrompt = `${truncatedUserPrompt}. ${baseInstructions}`;

  // Map dimensions to supported sizes
  // For image generation, gpt-image-1 supports: "256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"
  let size: "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792" = "1024x1024";
  const sizeStr = `${width}x${height}`;
  if (["256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"].includes(sizeStr)) {
    size = sizeStr as typeof size;
  } else {
    // Default to closest supported size
    if (width >= 1792 || height >= 1792) {
      size = width > height ? "1792x1024" : "1024x1792";
    } else if (width >= 1024 || height >= 1024) {
      size = "1024x1024";
    } else if (width >= 512 || height >= 512) {
      size = "512x512";
    } else {
      size = "256x256";
    }
  }

  // Initialize OpenAI client
  const openai = new OpenAI({ apiKey });

  // Retry logic for transient server errors
  const maxRetries = 2;
  let lastError: { status: number; detail: unknown } | null = null;

  try {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff: wait 1s, then 2s
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          console.log(`Retrying image generation (attempt ${attempt + 1}/${maxRetries + 1}) after ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        const result = await openai.images.generate({
          model: "gpt-image-1",
          prompt: composedPrompt,
          size,
          n: 1,
          quality: "high",
        });

        if (!result.data || result.data.length === 0) {
          console.error("OpenAI response missing image data:", result);
          return NextResponse.json(
            { error: "Image generation returned no data." },
            { status: 502 }
          );
        }

        // gpt-image-1 returns b64_json in the response even without response_format parameter
        const imageData = result.data[0];
        let imageBase64: string;

        if (imageData.b64_json) {
          // Use base64 data directly if available
          imageBase64 = imageData.b64_json;
        } else if (imageData.url) {
          // Fallback: fetch from URL if b64_json not available
          const imageResponse = await fetch(imageData.url);
          if (!imageResponse.ok) {
            console.error("Failed to fetch generated image:", imageResponse.statusText);
            return NextResponse.json(
              { error: "Failed to fetch generated image." },
              { status: 502 }
            );
          }
          const imageBuffer = await imageResponse.arrayBuffer();
          imageBase64 = Buffer.from(imageBuffer).toString('base64');
        } else {
          console.error("OpenAI response missing image data (no b64_json or url):", result);
          return NextResponse.json(
            { error: "Image generation returned no image data." },
            { status: 502 }
          );
        }

        const dataUrl = `data:image/png;base64,${imageBase64}`;

        return NextResponse.json({
          image: dataUrl,
          meta: {
            provider: "openai",
            model: "gpt-image-1",
            requestedSize: `${width}x${height}`,
            actualSize: size,
            quality: "high",
            revised_prompt: result.data[0].revised_prompt,
          },
        });
      } catch (error: any) {
        const sanitizedError = sanitizeSensitiveData(error);
        
        // Check if it's a retryable server error
        const status = error?.status || error?.response?.status || 500;
        const isServerError = status >= 500;
        const shouldRetry = isServerError && attempt < maxRetries;

        if (shouldRetry) {
          console.warn(`OpenAI server error (${status}), will retry:`, sanitizedError);
          lastError = { status, detail: sanitizedError };
          continue; // Retry
        }

        // Don't retry: either it's a client error or we've exhausted retries
        console.error("OpenAI image generation failed:", status, sanitizedError);
        
        const errorMessage = isServerError
          ? "OpenAI's servers are experiencing issues. Please try again in a moment."
          : error?.message || "Image generation failed. Please check your prompt and try again.";

        return NextResponse.json(
          {
            error: errorMessage,
            detail: sanitizedError,
          },
          { status: isServerError ? 502 : status }
        );
      }
    }

    // Should never reach here, but handle edge case
    return NextResponse.json(
      {
        error: "Image generation failed after multiple attempts. Please try again later.",
        detail: lastError?.detail,
      },
      { status: 502 }
    );
  } catch (error) {
    console.error("Image generation error:", sanitizeSensitiveData(error));
    return NextResponse.json(
      {
        error: "Unexpected error while generating background image.",
      },
      { status: 500 }
    );
  }
}
