import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@/lib/auth';
import { DESIGN_SELECTION_PROMPT } from '@/ai/prompts/generation';
import { templates } from '@/editor/templates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    console.error('OPENAI_API_KEY is missing');
    return NextResponse.json(
      { error: 'AI service not configured' },
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

  const { slideContent, slideId } = body;

  if (!slideContent || !slideId) {
    return NextResponse.json(
      { error: 'slideContent and slideId are required' },
      { status: 400 }
    );
  }

  const openai = new OpenAI({ apiKey });

  try {
    // First, get AI recommendation for template
    const messages = [
      {
        role: 'user' as const,
        content: `${DESIGN_SELECTION_PROMPT}

Slide Content:
Title: ${slideContent.title || 'Untitled'}
Body: ${slideContent.body || ''}
${slideContent.bullets ? `Bullets: ${slideContent.bullets.join(', ')}` : ''}

Select the best template and return JSON with template name, confidence (0-1), and reasoning.`,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

    const recommendation = JSON.parse(completion.choices[0]?.message?.content || '{}');
    const templateName = recommendation.template || 'content';

    // Map AI recommendation to template function
    let templateFunction = templates.content; // default
    if (templateName === 'hero' || templateName === 'HeroSlide') {
      templateFunction = templates.hero;
    } else if (templateName === 'content' || templateName === 'ContentSlide') {
      templateFunction = templates.content;
    } else if (templateName === 'imageLeft' || templateName === 'ImageLeftSlide') {
      templateFunction = templates.imageLeft;
    } else if (templateName === 'quote' || templateName === 'QuoteSlide') {
      templateFunction = templates.quote;
    } else if (templateName === 'closing' || templateName === 'ClosingSlide') {
      templateFunction = templates.closing;
    }

    // Apply template to content
    const designedSlide = templateFunction({
      id: slideId,
      title: slideContent.title,
      subtitle: slideContent.subtitle,
      body: slideContent.body,
      bullets: slideContent.bullets,
      quote: slideContent.quote,
      attribution: slideContent.attribution,
      contactInfo: slideContent.contactInfo,
    });

    return NextResponse.json({
      slide: designedSlide,
      template: templateName,
      reasoning: recommendation.reasoning,
      confidence: recommendation.confidence,
    });
  } catch (error: any) {
    console.error('OpenAI API error:', sanitizeSensitiveData(error));
    return NextResponse.json(
      {
        error: 'Failed to design slide',
        detail: sanitizeSensitiveData(error),
      },
      { status: 500 }
    );
  }
}

