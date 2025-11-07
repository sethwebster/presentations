/**
 * API Route: POST /api/ai/studio/generate
 * Generates award-quality presentations using the 5-stage Lume Studio pipeline
 */

import { NextRequest, NextResponse } from "next/server";
import { createStudioOrchestrator } from "../../../../../src/ai/studio/StudioOrchestrator";
import type { StudioInputs } from "../../../../../src/ai/studio/payloadBuilders";
import { studioDeckToManifest } from "../../../../../src/ai/studio/converters/deckToManifest";
import { getRedis } from "../../../../../src/lib/redis";
import { DocRepository } from "../../../../../src/repositories/DocRepository";

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

        const result = await orchestrator.generate(inputs);

        // Generate deck ID
        const deckId = `studio-${Date.now()}-${Math.random().toString(36).substring(7)}`;

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
