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

  const { outline, title } = body;

  if (!outline || !Array.isArray(outline)) {
    return NextResponse.json(
      { error: 'Outline is required' },
      { status: 400 }
    );
  }

  const userId = session.user.id;
  const deckId = `deck-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const openai = new OpenAI({ apiKey });

  try {
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

    const slides: SlideDefinition[] = [];

    // Generate content and design for each slide
    for (let i = 0; i < allSlides.length; i++) {
      const slideInfo = allSlides[i];
      
      // Generate slide content
      const contentMessages = [
        { role: 'system' as const, content: GENERATION_SYSTEM_PROMPT },
        {
          role: 'user' as const,
          content: `${SLIDE_CONTENT_GENERATION_PROMPT}

Slide Title: ${slideInfo.title}
${slideInfo.description ? `Description: ${slideInfo.description}` : ''}
Presentation Title: ${title || 'Presentation'}
Slide ${i + 1} of ${allSlides.length}

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
          
          try {
            // Use OpenAI API directly for image generation
            const imageResult = await openai.images.generate({
              model: 'dall-e-3',
              prompt: `Stunning high-quality widescreen image (1280x720 dimensions), photorealistic or artistic masterpiece quality, dramatic lighting, creative composition, highly detailed, visually striking, related to: ${imagePrompt.substring(0, 300)}. No text, no logos, no watermarks.`,
              size: '1024x1024' as const, // DALL-E 3 supports: 1024x1024, 1792x1024, 1024x1792
              n: 1,
              quality: 'standard' as const,
            });

            if (imageResult.data && imageResult.data.length > 0) {
              const imageUrl = imageResult.data[0].url;
              
              if (imageUrl) {
                // Fetch and convert to data URL for embedding
                const imageResponse = await fetch(imageUrl);
                if (imageResponse.ok) {
                  const imageBuffer = await imageResponse.arrayBuffer();
                  const imageBase64 = Buffer.from(imageBuffer).toString('base64');
                  const dataUrl = `data:image/png;base64,${imageBase64}`;
                  
                  // Set as subtle background for content slides
                  designedSlide.background = {
                    type: 'image',
                    value: dataUrl,
                    opacity: 0.25, // Make it subtle so text is readable
                  };
                }
              }
            }
          } catch (imgError) {
            console.error('Failed to generate image for slide:', sanitizeSensitiveData(imgError));
            // Continue without image - not critical
          }
        }
      }

      slides.push(designedSlide);
    }

    // Apply animations
    const animatedSlides = applyAnimationsToDeck(slides);

    // Create deck
    const deck: DeckDefinition = {
      meta: {
        id: deckId,
        title: title || 'AI Generated Presentation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ownerId: userId,
      },
      slides: animatedSlides,
    };

    // Save to Redis
    await redis.set(`deck:${deckId}:data`, JSON.stringify(deck));

    return NextResponse.json({
      deckId,
      slideCount: slides.length,
      title: deck.meta.title,
    });
  } catch (error: any) {
    console.error('Generation error:', sanitizeSensitiveData(error));
    return NextResponse.json(
      {
        error: 'Failed to generate presentation',
        detail: sanitizeSensitiveData(error),
      },
      { status: 500 }
    );
  }
}

