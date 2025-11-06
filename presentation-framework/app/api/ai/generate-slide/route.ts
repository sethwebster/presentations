import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@/lib/auth';
import { GENERATION_SYSTEM_PROMPT, SLIDE_CONTENT_GENERATION_PROMPT } from '@/ai/prompts/generation';

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

  const { slideTitle, outlineContext, presentationContext } = body;

  if (!slideTitle) {
    return NextResponse.json(
      { error: 'slideTitle is required' },
      { status: 400 }
    );
  }

  const openai = new OpenAI({ apiKey });

  try {
    const messages = [
      { role: 'system' as const, content: GENERATION_SYSTEM_PROMPT },
      {
        role: 'user' as const,
        content: `${SLIDE_CONTENT_GENERATION_PROMPT}

Slide Title: ${slideTitle}
${outlineContext ? `Context: ${outlineContext}` : ''}
${presentationContext ? `Presentation Theme: ${presentationContext}` : ''}`,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: 'No content generated' },
        { status: 500 }
      );
    }

    const slideContent = JSON.parse(content);

    return NextResponse.json(slideContent);
  } catch (error: any) {
    console.error('OpenAI API error:', sanitizeSensitiveData(error));
    return NextResponse.json(
      {
        error: 'Failed to generate slide content',
        detail: sanitizeSensitiveData(error),
      },
      { status: 500 }
    );
  }
}

