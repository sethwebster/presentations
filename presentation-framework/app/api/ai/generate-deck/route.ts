import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import Redis from 'ioredis';
import { auth } from '@/lib/auth';
import type { DeckDefinition, SlideDefinition } from '@/rsc/types';
import { templates } from '@/editor/templates';
import { applyAnimationsToDeck } from '@/editor/services/AnimationService';
import { GENERATION_SYSTEM_PROMPT, SLIDE_CONTENT_GENERATION_PROMPT } from '@/ai/prompts/generation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
const redis = redisUrl ? new Redis(redisUrl) : null;

function sanitizeSensitiveData<T>(value: T): T {
  const mask = (input: string) => input.replace(/sk-[a-zA-Z0-9-_]+/g, 'sk-************************');
  
  if (typeof value === 'string') {
    return mask(value) as T;
  }
  
  if (Array.isArray(value)) {
    return value.map(item => sanitizeSensitiveData(item)) as T;
  }
  
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).map(([key, val]) => [key, sanitizeSensitiveData(val)]);
    return Object.fromEntries(entries) as T;
  }
  
  return value;
}

export async function POST(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI service not configured' },
      { status: 500 }
    );
  }

  const fireworksApiKey = process.env.FIREWORKS_API_KEY?.trim();
  if (!fireworksApiKey) {
    return NextResponse.json(
      { error: 'FIREWORKS_API_KEY not configured' },
      { status: 500 }
    );
  }

  if (!redis) {
    return NextResponse.json(
      { error: 'Redis not configured' },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  const { outline, title, stylisticNotes } = body;

  if (!outline || !Array.isArray(outline)) {
    return NextResponse.json(
      { error: 'Outline is required' },
      { status: 400 }
    );
  }

  const userId = session.user.id;
  const deckId = `deck-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const openai = new OpenAI({ apiKey });
  const encoder = new TextEncoder();

  // Extract all slides from outline (flatten sections)
  const allSlides: Array<{ id: string; title: string; description?: string }> = [];
  outline.forEach((section: any) => {
    if (section.children) {
      section.children.forEach((slide: any) => {
        allSlides.push({
          id: slide.id,
          title: slide.title,
          description: slide.description,
        });
      });
    }
  });

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial event with deck ID
        controller.enqueue(
          encoder.encode(`event: deck_created\ndata: ${JSON.stringify({ deckId })}\n\n`)
        );

        // Generate a proper presentation title based on the entire outline
        let finalTitle = title?.trim();
        if (!finalTitle || finalTitle.length === 0) {
          // Send progress: generating title
          controller.enqueue(
            encoder.encode(`event: phase\ndata: ${JSON.stringify({ phase: 'title' })}\n\n`)
          );

          // Build outline summary for title generation
          const outlineSummary = outline.map((section: any) => {
            const sectionTitle = section.title || '';
            const slideTitles = section.children?.map((slide: any) => slide.title || '').filter(Boolean) || [];
            return `${sectionTitle}${slideTitles.length > 0 ? ': ' + slideTitles.slice(0, 3).join(', ') : ''}`;
          }).filter(Boolean).join('; ');

          const titleMessages = [
            {
              role: 'system' as const,
              content: `You are an expert at creating compelling, concise presentation titles. Generate a professional, engaging title (maximum 60 characters) that captures the essence of the entire presentation based on the outline.`,
            },
            {
              role: 'user' as const,
              content: `Based on this presentation outline, generate a compelling title:

${outlineSummary}

${stylisticNotes?.trim() ? `Stylistic context: ${stylisticNotes.trim()}\n` : ''}
Return only the title text, nothing else. Keep it concise, professional, and memorable.`,
            },
          ];

          try {
            const titleCompletion = await openai.chat.completions.create({
              model: 'gpt-4-turbo',
              messages: titleMessages,
              temperature: 0.7,
              max_tokens: 100,
            });

            const generatedTitle = titleCompletion.choices[0]?.message?.content?.trim();
            // Clean up the title (remove quotes, extra whitespace, etc.)
            const cleanedTitle = generatedTitle?.replace(/^["']|["']$/g, '').trim();
            if (cleanedTitle && cleanedTitle.length > 0 && cleanedTitle.length <= 100) {
              finalTitle = cleanedTitle;
            } else {
              // Fall back to extracting from outline
              finalTitle = outline[0]?.title || outline[0]?.children?.[0]?.title || 'AI Generated Presentation';
            }
          } catch (titleError) {
            console.error('Failed to generate title:', sanitizeSensitiveData(titleError));
            // Fall back to extracting from outline
            finalTitle = outline[0]?.title || outline[0]?.children?.[0]?.title || 'AI Generated Presentation';
          }
        }

        const slides: SlideDefinition[] = [];

        // Generate content and design for each slide
        for (let i = 0; i < allSlides.length; i++) {
          const slideInfo = allSlides[i];
          
          // Send progress: starting slide
          controller.enqueue(
            encoder.encode(`event: slide_start\ndata: ${JSON.stringify({ 
              slideIndex: i, 
              totalSlides: allSlides.length,
              slideTitle: slideInfo.title 
            })}\n\n`)
          );

          // Generate slide content
          const stylisticGuidance = stylisticNotes?.trim() 
            ? `\n\nStylistic Instructions:\n${stylisticNotes.trim()}\n\nPlease incorporate these design preferences, color schemes, visual style notes, and other stylistic guidance into the slide content and design decisions.`
            : '';

          const contentMessages = [
            { role: 'system' as const, content: GENERATION_SYSTEM_PROMPT },
            {
              role: 'user' as const,
              content: `${SLIDE_CONTENT_GENERATION_PROMPT}

Slide Title: ${slideInfo.title}
${slideInfo.description ? `Description: ${slideInfo.description}` : ''}
Presentation Title: ${finalTitle}
Slide ${i + 1} of ${allSlides.length}${stylisticGuidance}

Return JSON with: { "title": "...", "body": "...", "bullets": [...], "speakerNotes": "..." }`,
            },
          ];

          const contentCompletion = await openai.chat.completions.create({
            model: 'gpt-4-turbo',
            messages: contentMessages,
            response_format: { type: 'json_object' },
            temperature: 0.7,
          });

          const slideContent = JSON.parse(contentCompletion.choices[0]?.message?.content || '{}');

          // Send progress: content generated
          controller.enqueue(
            encoder.encode(`event: slide_content\ndata: ${JSON.stringify({ 
              slideIndex: i,
              slideTitle: slideContent.title || slideInfo.title 
            })}\n\n`)
          );

          // Determine template based on slide content and position
          let templateFunction = templates.content; // default
          
          if (i === 0) {
            templateFunction = templates.hero;
          } else if (i === allSlides.length - 1) {
            templateFunction = templates.closing;
          } else if (slideContent.quote) {
            templateFunction = templates.quote;
          } else if (slideContent.bullets && slideContent.bullets.length > 0) {
            templateFunction = templates.content;
          }

          // Apply template
          const designedSlide = templateFunction({
            id: slideInfo.id,
            title: slideContent.title || slideInfo.title,
            subtitle: slideContent.subtitle,
            body: slideContent.body,
            bullets: slideContent.bullets,
            quote: slideContent.quote,
            attribution: slideContent.attribution,
            contactInfo: slideContent.contactInfo,
          });

          // Add speaker notes
          if (slideContent.speakerNotes) {
            designedSlide.notes = {
              presenter: slideContent.speakerNotes,
            };
          }

          // Generate image for content slides (not hero or closing)
          if (i > 0 && i < allSlides.length - 1 && templateFunction === templates.content) {
            // Determine if slide would benefit from an image (every 2nd-3rd slide to avoid too many)
            const shouldGenerateImage = i % 2 === 0 || i % 3 === 0;
            
            if (shouldGenerateImage) {
              // Generate image prompt from slide content
              const imagePrompt = slideContent.body || slideContent.bullets?.join(', ') || slideContent.title || 'professional presentation slide';
              
              // Send progress: starting image generation
              controller.enqueue(
                encoder.encode(`event: slide_image_start\ndata: ${JSON.stringify({ 
                  slideIndex: i,
                  prompt: imagePrompt.substring(0, 100) 
                })}\n\n`)
              );

              try {
                // Create abstract/conceptual prompt from slide content
                // Extract key concepts without being too literal
                let basePrompt = imagePrompt.substring(0, 400);

                // Enhance with stylistic notes if provided
                if (stylisticNotes?.trim()) {
                  const styleContext = stylisticNotes.trim().substring(0, 200);
                  basePrompt = `${basePrompt}. Style: ${styleContext}`;
                }

                // Add instructions for abstract/conceptual imagery without text
                const enhancedImagePrompt = `${basePrompt}, abstract conceptual visualization, artistic interpretation, dramatic lighting, highly detailed, no text, no words, no letters, no logos, no watermarks, visually striking composition`;

                // Use Flux for image generation via Fireworks API
                const fluxResponse = await fetch(
                  "https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/flux-1-schnell-fp8/text_to_image",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Accept": "image/jpeg",
                      "Authorization": `Bearer ${fireworksApiKey}`,
                    },
                    body: JSON.stringify({
                      prompt: enhancedImagePrompt.substring(0, 700),
                    }),
                  }
                );

                if (fluxResponse.ok) {
                  // Flux returns binary image data
                  const imageBuffer = await fluxResponse.arrayBuffer();
                  const imageBase64 = Buffer.from(imageBuffer).toString('base64');
                  const dataUrl = `data:image/jpeg;base64,${imageBase64}`;

                  // Set as subtle background for content slides
                  // Store the original prompt so the image can be refined later
                  designedSlide.background = {
                    type: 'image',
                    value: dataUrl,
                    opacity: 0.25, // Make it subtle so text is readable
                    prompt: basePrompt.substring(0, 500), // Store original prompt for refinement
                  } as any; // Use 'as any' since prompt is not in the base type but will be preserved

                  // Send progress: image generated
                  controller.enqueue(
                    encoder.encode(`event: slide_image_complete\ndata: ${JSON.stringify({
                      slideIndex: i
                    })}\n\n`)
                  );
                } else {
                  console.error('Flux image generation failed:', fluxResponse.status);
                  // Send progress: image generation failed (non-critical)
                  controller.enqueue(
                    encoder.encode(`event: slide_image_failed\ndata: ${JSON.stringify({ 
                      slideIndex: i,
                      error: 'Image generation failed, continuing without image'
                    })}\n\n`)
                  );
                }
              } catch (imgError) {
                console.error('Failed to generate image for slide:', sanitizeSensitiveData(imgError));
                // Send progress: image generation failed (non-critical)
                controller.enqueue(
                  encoder.encode(`event: slide_image_failed\ndata: ${JSON.stringify({ 
                    slideIndex: i,
                    error: 'Image generation failed, continuing without image'
                  })}\n\n`)
                );
              }
            }
          }

          slides.push(designedSlide);

          // Send progress: slide complete
          controller.enqueue(
            encoder.encode(`event: slide_complete\ndata: ${JSON.stringify({ 
              slideIndex: i,
              totalSlides: allSlides.length,
              completedSlides: slides.length
            })}\n\n`)
          );
        }

        // Send progress: applying animations
        controller.enqueue(
          encoder.encode(`event: phase\ndata: ${JSON.stringify({ phase: 'animations' })}\n\n`)
        );

        // Apply animations
        const animatedSlides = applyAnimationsToDeck(slides);

        // Create deck with AI generation metadata for regeneration
        const generatedAt = new Date().toISOString();
        const deck: DeckDefinition = {
          meta: {
            id: deckId,
            title: finalTitle,
            createdAt: generatedAt,
            updatedAt: generatedAt,
            ownerId: userId,
            // Store original conversation for regeneration
            aiGeneration: {
              outline: outline, // Store the full outline
              originalTitle: title?.trim() || undefined, // User-provided title (if any)
              stylisticNotes: stylisticNotes?.trim() || undefined,
              generatedAt,
              model: 'gpt-4-turbo', // Model used for generation
            },
          },
          slides: animatedSlides,
        };

        // Save to Redis
        await redis.set(`deck:${deckId}:data`, JSON.stringify(deck));

        // Send final event with deck info
        controller.enqueue(
          encoder.encode(`event: complete\ndata: ${JSON.stringify({
            deckId,
            slideCount: slides.length,
            title: deck.meta.title,
          })}\n\n`)
        );

        controller.close();
      } catch (error: any) {
        console.error('Generation error:', sanitizeSensitiveData(error));
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({
            error: 'Failed to generate presentation',
            detail: sanitizeSensitiveData(error),
          })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

