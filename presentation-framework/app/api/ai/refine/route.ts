import OpenAI from "openai";
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
  image?: string; // Base64 data URL
  originalPrompt?: string;
  refinement?: string;
  width?: number;
  height?: number;
  model?: 'openai' | 'flux';
  quality?: 'quick' | 'polish' | 'heroic';
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

  let body: RefineImageRequest;
  try {
    body = await request.json();
  } catch {
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

  if (!body.image) {
    return NextResponse.json(
      { error: "Image is required for refinement." },
      { status: 400 }
    );
  }

  const model = body.model || 'flux'; // Default to Flux
  const quality = body.quality || 'quick'; // Default to quick generation

  console.log('[API /ai/refine] Request received:', {
    model,
    quality,
    promptLength: originalPrompt?.length,
    refinementLength: refinement?.length,
  });

  // Convert base64 data URL to Buffer, then to File
  let imageFile: File;
  try {
    // Extract base64 data from data URL
    const base64Data = body.image.replace(/^data:image\/[^;]+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");
    // Create a File from the buffer
    imageFile = new File([imageBuffer], "image.png", { type: "image/png" });
  } catch (error) {
    console.error("Failed to convert image data URL to file:", error);
    return NextResponse.json(
      { error: "Failed to process image data." },
      { status: 400 }
    );
  }

  // Calculate aspect ratio description from dimensions
  // Flux models require dimensions to be multiples of 8, with min 256 and max 1440
  const roundToMultipleOf8 = (value: number) => {
    const clamped = Math.max(256, Math.min(1440, value));
    return Math.round(clamped / 8) * 8;
  };
  const width = roundToMultipleOf8(body.width ?? 1280);
  const height = roundToMultipleOf8(body.height ?? 720);

  console.log('[API /ai/refine] Normalized dimensions:', { original: { width: body.width, height: body.height }, normalized: { width, height } });

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

  // Map dimensions to supported sizes
  // For image edits, gpt-image-1 supports: "256x256", "512x512", "1024x1024", "1536x1024", "1024x1536"
  let size: "256x256" | "512x512" | "1024x1024" | "1536x1024" | "1024x1536" = "1024x1024";
  const sizeStr = `${width}x${height}`;
  if (["256x256", "512x512", "1024x1024", "1536x1024", "1024x1536"].includes(sizeStr)) {
    size = sizeStr as typeof size;
  } else {
    // Default to closest supported size
    if (width >= 1536 || height >= 1536) {
      size = width > height ? "1536x1024" : "1024x1536";
    } else if (width >= 1024 || height >= 1024) {
      size = "1024x1024";
    } else if (width >= 512 || height >= 512) {
      size = "512x512";
    } else {
      size = "256x256";
    }
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
          console.log(`Retrying image refinement (attempt ${attempt + 1}/${maxRetries + 1}) after ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        let imageBase64: string | undefined;
        let meta: any;

        if (model === 'flux') {
          // Use Fireworks AI / Flux model for refinement (text-to-image, not edit)
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

          // For Flux, we use text-to-image with the refined prompt (Flux doesn't support image editing)
          // Keep prompt concise to avoid API issues
          const fluxPrompt = truncatedRefinedPrompt;

          console.log('[API /ai/refine] Flux prompt length:', fluxPrompt.length);

          // Kontext Pro uses async workflow with polling
          if (modelVariant === 'flux-kontext-pro') {
            // Step 1: Submit the generation request
            const requestBody = {
              prompt: fluxPrompt,
            };

            console.log('[API /ai/refine] Kontext Pro request:', {
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
              console.error('[API /ai/refine] Fireworks API error:', {
                status: submitResponse.status,
                statusText: submitResponse.statusText,
                body: errorText,
                model: modelVariant,
              });
              throw new Error(`Flux API error (${submitResponse.status}): ${errorText}`);
            }

            const submitResult = await submitResponse.json();
            const requestId = submitResult.request_id;

            if (!requestId) {
              throw new Error('No request ID returned from Kontext Pro');
            }

            console.log('[API /ai/refine] Kontext Pro request submitted:', requestId);

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
                console.error(`[API /ai/refine] Kontext Pro poll error:`, errorText);
                continue; // Keep polling
              }

              const pollResult = await resultResponse.json();
              const status = pollResult.status;

              console.log(`[API /ai/refine] Kontext Pro status: ${status}, attempt ${pollAttempt + 1}/${maxPollAttempts}`);

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
                throw new Error(`Kontext Pro refinement failed: ${pollResult.details || 'Unknown error'}`);
              }

              // Still in progress, continue polling
              if (pollAttempt === maxPollAttempts - 1) {
                throw new Error('Kontext Pro refinement timed out after 60 seconds');
              }
            }
          } else {
            // Standard Flux models (schnell, dev) - synchronous
            // Send ONLY prompt - no dimensions at all
            const requestBody = {
              prompt: fluxPrompt,
            };

            console.log('[API /ai/refine] Flux request (prompt only):', {
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
              console.error('[API /ai/refine] Fireworks API error:', {
                status: fluxResponse.status,
                statusText: fluxResponse.statusText,
                body: errorText,
                model: modelVariant,
              });
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
          // Use OpenAI for image editing
          const openai = new OpenAI({ apiKey });

          const result = await openai.images.edit({
            model: "gpt-image-1",
            prompt: composedPrompt,
            image: imageFile,
            size,
            n: 1,
          });

          if (!result.data || result.data.length === 0) {
            console.error("OpenAI response missing image data:", result);
            return NextResponse.json(
              { error: "Image refinement returned no data." },
              { status: 502 }
            );
          }

          const imageData = result.data[0].b64_json;
          if (!imageData) {
            console.error("OpenAI response missing base64 data:", result);
            return NextResponse.json(
              { error: "Image refinement returned no base64 data." },
              { status: 502 }
            );
          }

          imageBase64 = imageData;

          meta = {
            provider: "openai",
            model: "gpt-image-1",
            requestedSize: `${width}x${height}`,
            actualSize: size,
            quality: "high",
          };
        }

        if (!imageBase64) {
          throw new Error('Image refinement did not produce base64 data');
        }

        const dataUrl = `data:image/${model === 'flux' ? 'jpeg' : 'png'};base64,${imageBase64}`;

        return NextResponse.json({
          image: dataUrl,
          meta,
        });
      } catch (error: any) {
        const sanitizedError = sanitizeSensitiveData(error);

        // Extract status from error or Fireworks API response
        let status = error?.status || error?.response?.status || 500;

        // For Flux/Fireworks errors, check if there's a response status in the error message
        if (model === 'flux' && error?.message?.includes('Flux API error')) {
          const statusMatch = error.message.match(/\((\d+)\)/);
          if (statusMatch) {
            status = parseInt(statusMatch[1]);
          }
        }

        const isServerError = status >= 500;
        const isClientError = status >= 400 && status < 500;
        const shouldRetry = isServerError && attempt < maxRetries;

        const modelName = model === 'flux' ? 'Fireworks AI' : 'OpenAI';

        if (shouldRetry) {
          console.warn(`${modelName} server error (${status}), will retry:`, sanitizedError);
          lastError = { status, detail: sanitizedError };
          continue; // Retry
        }

        // Don't retry: either it's a client error or we've exhausted retries
        console.error(`${modelName} image refinement failed:`, status, sanitizedError);

        let errorMessage: string;
        if (isClientError) {
          if (status === 404) {
            errorMessage = `Model not found or not accessible. Please try a different quality level.`;
          } else {
            errorMessage = error?.message || "Image refinement failed. Please check your refinement request and try again.";
          }
        } else if (isServerError) {
          errorMessage = `${modelName}'s servers are experiencing issues. Please try again in a moment.`;
        } else {
          errorMessage = error?.message || "Image refinement failed.";
        }

        return NextResponse.json(
          {
            error: errorMessage,
            detail: sanitizedError,
          },
          { status: isServerError ? 502 : (isClientError ? 400 : status) }
        );
      }
    }

    // Should never reach here, but handle edge case
    const modelName = model === 'flux' ? 'Fireworks AI' : 'OpenAI';
    return NextResponse.json(
      {
        error: `Image refinement with ${modelName} failed after multiple attempts. Please try again later.`,
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
