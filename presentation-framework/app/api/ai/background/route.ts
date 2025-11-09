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
  model?: 'openai' | 'flux';
  quality?: 'quick' | 'polish' | 'heroic'; // Quality tier for Flux models
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

  console.log('[API /ai/background] Request received:', {
    model: body.model,
    quality: body.quality,
    promptLength: body.prompt?.length,
  });

  const userPrompt = body.prompt?.trim();
  if (!userPrompt) {
    return NextResponse.json(
      { error: "Prompt is required." },
      { status: 400 }
    );
  }

  const model = body.model || 'flux'; // Default to Flux
  const quality = body.quality || 'quick'; // Default to quick generation

  console.log('[API /ai/background] Using model:', model, 'quality:', quality);

  // Calculate aspect ratio description from dimensions
  // Flux models require dimensions to be multiples of 8
  // Support up to 4K (3840x2160) for high-quality displays
  const roundToMultipleOf8 = (value: number) => {
    const clamped = Math.max(256, Math.min(3840, value)); // Increased max to 3840 for 4K
    return Math.round(clamped / 8) * 8;
  };
  const width = roundToMultipleOf8(body.width ?? 1920); // Default to 1920 (1080p)
  const height = roundToMultipleOf8(body.height ?? 1080); // Default to 1080 (1080p)

  console.log('[API /ai/background] Normalized dimensions:', { original: { width: body.width, height: body.height }, normalized: { width, height } });

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
  // Make images abstract and conceptual to avoid literal interpretations
  // CRITICAL: Never include any text/typography in images
  const baseInstructions = `Stunning high-quality ${aspectDescription} image (${width}x${height} dimensions), photorealistic or artistic masterpiece quality, dramatic lighting, creative composition, highly detailed, visually striking, abstract and conceptual interpretation, ABSOLUTELY NO TEXT OF ANY KIND, no words, no letters, no typography, no labels, no captions, no signage, no logos, no watermarks, no written language, no numbers, no symbols, no cameras, no filming equipment, no production crew, no stage equipment unless explicitly requested in the prompt`;

  // Combine user prompt with instructions, ensuring we stay under 4000 chars
  const maxPromptLength = 3500; // Leave buffer for instructions
  const truncatedUserPrompt = userPrompt.length > maxPromptLength
    ? userPrompt.substring(0, maxPromptLength).trim() + "..."
    : userPrompt;

  // Prioritize user intent with quality enhancement
  const composedPrompt = `${truncatedUserPrompt}. ${baseInstructions}`;

  // For Flux models, keep prompt concise and validate
  const fluxPrompt = truncatedUserPrompt.trim();

  // Ensure prompt is not empty
  if (!fluxPrompt) {
    return NextResponse.json(
      { error: "Prompt cannot be empty for Flux models." },
      { status: 400 }
    );
  }

  console.log('[API /ai/background] Flux prompt:', {
    length: fluxPrompt.length,
    preview: fluxPrompt.substring(0, 100),
  });

  // Map dimensions to supported sizes
  // gpt-image-1 supports: "1024x1024", "1024x1536", "1536x1024", and "auto"
  // For widescreen (16:9) presentations, we'll use 1536x1024 (1.5:1 aspect ratio, close to 16:9 = 1.78:1)
  // For portrait/square, we'll use 1024x1024 or 1024x1536
  let size: "1024x1024" | "1024x1536" | "1536x1024" | "auto" = "1024x1024";
  
  // Use the already-calculated aspectRatio variable
  if (aspectRatio > 1.3) {
    // Widescreen/landscape - use 1536x1024
    size = "1536x1024";
  } else if (aspectRatio < 0.8) {
    // Portrait - use 1024x1536
    size = "1024x1536";
  } else {
    // Square or close to square - use 1024x1024
    size = "1024x1024";
  }

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

        let imageBase64: string | undefined;
        let meta: any;

        if (model === 'flux') {
          // Use Fireworks AI / Flux model with quality tiers
          const fireworksApiKey = process.env.FIREWORKS_API_KEY?.trim();
          if (!fireworksApiKey) {
            return NextResponse.json(
              { error: "FIREWORKS_API_KEY is not configured. Please add it to .env.local and restart the dev server." },
              { status: 500 }
            );
          }

          // Map quality to model variant
          let modelVariant: string;
          let qualityLabel: string;
          switch (quality) {
            case 'quick':
              modelVariant = 'flux-1-schnell-fp8'; // 4 steps, instant
              qualityLabel = 'quick';
              break;
            case 'polish':
              modelVariant = 'flux-1-dev-fp8'; // 12 steps, better quality
              qualityLabel = 'polish';
              break;
            case 'heroic':
              modelVariant = 'flux-kontext-pro'; // Highest quality, cached
              qualityLabel = 'heroic';
              break;
            default:
              modelVariant = 'flux-1-schnell-fp8';
              qualityLabel = 'quick';
          }

          // Kontext Pro uses async workflow with polling
          if (modelVariant === 'flux-kontext-pro') {
            // Step 1: Submit the generation request
            const requestBody = {
              prompt: fluxPrompt,
            };

            console.log('[API /ai/background] Kontext Pro request:', {
              model: modelVariant,
              body: requestBody,
              dimensions: { width, height },
            });

            const submitResponse = await fetch(
              `https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/${modelVariant}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Accept": "application/json",
                  "Authorization": `Bearer ${fireworksApiKey}`,
                },
                body: JSON.stringify(requestBody),
              }
            );

            if (!submitResponse.ok) {
              const errorText = await submitResponse.text();
              throw new Error(`Flux API error (${submitResponse.status}): ${errorText}`);
            }

            const submitResult = await submitResponse.json();
            const requestId = submitResult.request_id;

            if (!requestId) {
              throw new Error('No request ID returned from Kontext Pro');
            }

            console.log('[API /ai/background] Kontext Pro request submitted:', requestId);

            // Step 2: Poll for the result
            const resultEndpoint = `https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/${modelVariant}/get_result`;
            const maxPollAttempts = 60; // 60 seconds max

            for (let pollAttempt = 0; pollAttempt < maxPollAttempts; pollAttempt++) {
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

              const resultResponse = await fetch(resultEndpoint, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Accept": "application/json",
                  "Authorization": `Bearer ${fireworksApiKey}`,
                },
                body: JSON.stringify({ id: requestId })
              });

              if (!resultResponse.ok) {
                const errorText = await resultResponse.text();
                console.error(`[API /ai/background] Kontext Pro poll error:`, errorText);
                continue; // Keep polling
              }

              const pollResult = await resultResponse.json();
              const status = pollResult.status;

              console.log(`[API /ai/background] Kontext Pro status: ${status}, attempt ${pollAttempt + 1}/${maxPollAttempts}`);

              if (['Ready', 'Complete', 'Finished'].includes(status)) {
                const imageData = pollResult.result?.sample;

                if (typeof imageData === 'string' && imageData.startsWith('http')) {
                  // Download from URL
                  const imageResponse = await fetch(imageData);
                  const imageBuffer = await imageResponse.arrayBuffer();
                  imageBase64 = Buffer.from(imageBuffer).toString('base64');
                } else if (imageData) {
                  // Already base64
                  imageBase64 = imageData;
                } else {
                  throw new Error('No image data in Kontext Pro result');
                }
                break;
              }

              if (['Failed', 'Error'].includes(status)) {
                throw new Error(`Kontext Pro generation failed: ${pollResult.details || 'Unknown error'}`);
              }

              // Still in progress, continue polling
              if (pollAttempt === maxPollAttempts - 1) {
                throw new Error('Kontext Pro generation timed out after 60 seconds');
              }
            }
          } else {
            // Standard Flux models (schnell, dev) - synchronous
            // Send ONLY prompt - no dimensions at all
            const requestBody = {
              prompt: fluxPrompt,
            };

            console.log('[API /ai/background] Flux request (prompt only):', {
              model: modelVariant,
              endpoint: `/workflows/accounts/fireworks/models/${modelVariant}/text_to_image`,
              promptLength: fluxPrompt.length,
            });

            const fluxResponse = await fetch(
              `https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/${modelVariant}/text_to_image`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Accept": "image/jpeg",
                  "Authorization": `Bearer ${fireworksApiKey}`,
                },
                body: JSON.stringify(requestBody),
              }
            );

            if (!fluxResponse.ok) {
              const errorText = await fluxResponse.text();
              throw new Error(`Flux API error (${fluxResponse.status}): ${errorText}`);
            }

            // Flux workflow returns binary image data
            const imageBuffer = await fluxResponse.arrayBuffer();
            imageBase64 = Buffer.from(imageBuffer).toString('base64');
          }

          meta = {
            provider: "fireworks",
            model: modelVariant,
            quality: qualityLabel,
            requestedSize: `${width}x${height}`,
          };
        } else {
          // Use OpenAI (default)
          const openai = new OpenAI({ apiKey });
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

          meta = {
            provider: "openai",
            model: "gpt-image-1",
            requestedSize: `${width}x${height}`,
            actualSize: size,
            quality: "high",
            revised_prompt: result.data[0].revised_prompt,
          };
        }

        if (!imageBase64) {
          throw new Error('Image generation did not produce base64 data');
        }

        const dataUrl = `data:image/${model === 'flux' ? 'jpeg' : 'png'};base64,${imageBase64}`;

        return NextResponse.json({
          image: dataUrl,
          meta,
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
