/**
 * API Route: POST /api/ai/studio/generate
 * Generates award-quality presentations using the 5-stage Lume Studio pipeline
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createStudioOrchestrator } from "../../../../../src/ai/studio/StudioOrchestrator";
import type { StudioInputs } from "../../../../../src/ai/studio/payloadBuilders";
import { studioDeckToManifest } from "../../../../../src/ai/studio/converters/deckToManifest";
import { getRedis } from "../../../../../src/lib/redis";
import { DocRepository } from "../../../../../src/repositories/DocRepository";
import { AssetStore } from "../../../../../src/repositories/AssetStore";
import { extractAssetData, detectMimeType } from "../../../../../src/converters/assetHelpers";
import { BraintrustOrchestrator } from "../../../../../src/ai/studio/braintrust/orchestrator";
import { braintrustResultToStudioResult } from "../../../../../src/ai/studio/braintrust/adapters";
import { DEFAULT_BRAND_RULES, DEFAULT_THEME_TOKENS, DEFAULT_LAYOUT_CATALOG } from "../../../../../src/ai/studio/braintrust/examples/defaults";
import type { GenerationContext } from "../../../../../src/ai/studio/braintrust/types";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for complex generation

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate required fields
    const { topic, audience, tone, goal, duration_minutes } = body as Partial<StudioInputs>;

    if (!topic || !audience || !tone || !goal || !duration_minutes) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["topic", "audience", "tone", "goal", "duration_minutes"],
        },
        { status: 400 }
      );
    }

    // Get OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // Setup streaming response
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start generation in background
    (async () => {
      try {
        const enableBraintrust = body.enableBraintrust ?? false;
        let result;

        if (enableBraintrust) {
          // ========== BRAINTRUST PATH ==========
          const openaiClient = new OpenAI({ apiKey });

          const braintrustOrchestrator = new BraintrustOrchestrator(openaiClient, {
            maxRefinementRounds: body.maxRefinementCycles ?? 2,
            targetScore: 4.2, // On 0-5 scale
            minAxisScore: 3.8,
            skipCritique: body.skipCritique ?? false,
            model: body.model ?? "gpt-4o",
            onProgress: async (progress) => {
              // Map Braintrust progress to Studio progress format
              const phaseMap: Record<string, "concept" | "outline" | "design" | "render" | "critique" | "refinement"> = {
                outline: "concept",
                content: "outline",
                design: "design",
                polish: "render",
                critique: "critique",
                refine: "refinement",
              };

              const progressData = JSON.stringify({
                type: "progress",
                data: {
                  phase: phaseMap[progress.pass] || progress.pass,
                  progress: progress.progress,
                  message: progress.message,
                },
              });
              await writer.write(encoder.encode(`data: ${progressData}\n\n`));
            },
          });

          const context: GenerationContext = {
            brief: topic,
            audience,
            goal,
            themeId: body.design_language ?? "Cinematic",
            brandRules: DEFAULT_BRAND_RULES,
            themeTokens: DEFAULT_THEME_TOKENS,
            layoutCatalog: DEFAULT_LAYOUT_CATALOG,
          };

          const braintrustResult = await braintrustOrchestrator.generate(context);

          // Convert Braintrust result to Studio result format
          result = braintrustResultToStudioResult(braintrustResult, {
            topic,
            audience,
            goal,
            tone,
          });
        } else {
          // ========== STANDARD STUDIO PATH ==========
          const orchestrator = createStudioOrchestrator(apiKey, {
            maxRefinementCycles: body.maxRefinementCycles ?? 2,
            targetQualityScore: body.targetQualityScore ?? 8.5,
            skipCritique: body.skipCritique ?? false,
            model: body.model ?? "gpt-4o",
            onProgress: async (progress) => {
              // Stream progress updates to client
              const progressData = JSON.stringify({
                type: "progress",
                data: progress,
              });
              await writer.write(encoder.encode(`data: ${progressData}\n\n`));
            },
          });

          const inputs: StudioInputs = {
            topic,
            audience,
            tone,
            goal,
            duration_minutes,
            deck_title: body.deck_title,
            design_language: body.design_language ?? "Cinematic",
          };

          result = await orchestrator.generate(inputs);
        }

        // Generate deck ID
        const deckId = `studio-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        // Check if user wants images generated
        const imageSource = body.imageSource || "generate";
        const shouldGenerateImages = imageSource === "generate";

        // Generate background images for slides with image_prompts (if enabled)
        if (shouldGenerateImages) {
          await writer.write(encoder.encode(`data: ${JSON.stringify({
            type: "progress",
            data: { phase: "render", progress: 85, message: "Generating background images..." }
          })}\n\n`));

          // Initialize asset store for storing images
          const assetStore = new AssetStore();

          const imageGenerationPromises = result.deck.presentation.slides.map(async (slide, index) => {
            if (!slide.image_prompt || slide.image_prompt.trim() === "") {
              return;
            }

            try {
              console.log(`[Studio API] Generating image for slide ${index + 1}: "${slide.image_prompt}"`);

              // Generate image using Flux (Fireworks AI) directly
              const fireworksApiKey = process.env.FIREWORKS_API_KEY?.trim();

              if (!fireworksApiKey) {
                console.error(`[Studio API] FIREWORKS_API_KEY not configured, skipping image for slide ${index + 1}`);
                return;
              }

              // Use Flux quick model for fast generation
              const fluxResponse = await fetch(
                'https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/flux-1-schnell-fp8/text_to_image',
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Accept": "image/jpeg",
                    "Authorization": `Bearer ${fireworksApiKey}`,
                  },
                  body: JSON.stringify({
                    prompt: slide.image_prompt,
                  }),
                }
              );

              if (!fluxResponse.ok) {
                console.error(`[Studio API] Flux API error for slide ${index + 1}:`, await fluxResponse.text());
                return;
              }

              // Flux workflow returns binary image data
              const imageBuffer = await fluxResponse.arrayBuffer();
              const imageBytes = new Uint8Array(imageBuffer);

              // Store the image in the asset store
              const assetHash = await assetStore.put(imageBytes, {
                mimeType: 'image/jpeg',
                originalFilename: `slide-${index + 1}-background.jpg`,
              });

              // Store asset reference instead of data URL
              slide.image_prompt = `asset://sha256:${assetHash}`;
              console.log(`[Studio API] Generated and stored image for slide ${index + 1} (${assetHash.substring(0, 12)}...)`);
            } catch (error) {
              console.error(`[Studio API] Error generating image for slide ${index + 1}:`, error);
              // Continue without the image
            }
          });

          // Wait for all images to generate
          await Promise.all(imageGenerationPromises);
        }

        // Convert Studio deck to ManifestV1 and save
        const redis = getRedis();
        if (redis) {
          try {
            const manifest = studioDeckToManifest(result.deck, deckId);
            const docRepo = new DocRepository(redis);
            await docRepo.saveManifest(deckId, manifest);
            console.log(`[Studio API] Deck saved successfully with ID: ${deckId}`);
          } catch (saveError) {
            console.error("[Studio API] Error saving deck:", saveError);
            // Continue anyway - we'll send the deck data so client can retry or handle it
          }
        } else {
          console.warn("[Studio API] Redis not configured - deck not saved to repository");
        }

        // Send final result with deck ID
        const resultData = JSON.stringify({
          type: "complete",
          data: {
            ...result,
            deckId, // Include the deck ID in the response
          },
        });
        await writer.write(encoder.encode(`data: ${resultData}\n\n`));
      } catch (error) {
        console.error("Studio generation error:", error);

        const errorData = JSON.stringify({
          type: "error",
          data: {
            message: error instanceof Error ? error.message : "Generation failed",
            error: String(error),
          },
        });
        await writer.write(encoder.encode(`data: ${errorData}\n\n`));
      } finally {
        await writer.close();
      }
    })();

    // Return streaming response
    return new NextResponse(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      {
        error: "Failed to initiate generation",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
