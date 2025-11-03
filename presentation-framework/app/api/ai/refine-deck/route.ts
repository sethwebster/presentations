import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import Redis from 'ioredis';
import { auth } from '@/lib/auth';
import type { DeckDefinition } from '@/rsc/types';
import { REFINEMENT_SYSTEM_PROMPT } from '@/ai/prompts/refinement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
const redis = redisUrl ? new Redis(redisUrl) : null;

// Comprehensive editing tools for deck refinement
const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'update_slide_content',
      description: 'Update text content, title, or notes for a slide',
      parameters: {
        type: 'object',
        properties: {
          slideId: { type: 'string' },
          changes: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              notes: { type: 'string' },
            },
          },
        },
        required: ['slideId', 'changes'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_element',
      description: 'Add a new element to a slide',
      parameters: {
        type: 'object',
        properties: {
          slideId: { type: 'string' },
          element: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string', enum: ['text', 'richtext', 'image', 'shape', 'chart', 'codeblock', 'table'] },
              content: { type: 'string' },
              bounds: {
                type: 'object',
                properties: {
                  x: { type: 'number' },
                  y: { type: 'number' },
                  width: { type: 'number' },
                  height: { type: 'number' },
                },
              },
              style: { type: 'object' },
            },
            required: ['id', 'type'],
          },
        },
        required: ['slideId', 'element'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'remove_element',
      description: 'Remove an element from a slide',
      parameters: {
        type: 'object',
        properties: {
          slideId: { type: 'string' },
          elementId: { type: 'string' },
        },
        required: ['slideId', 'elementId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_element',
      description: 'Update properties of an existing element',
      parameters: {
        type: 'object',
        properties: {
          slideId: { type: 'string' },
          elementId: { type: 'string' },
          changes: {
            type: 'object',
            properties: {
              content: { type: 'string' },
              bounds: { type: 'object' },
              style: { type: 'object' },
            },
          },
        },
        required: ['slideId', 'elementId', 'changes'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_layout',
      description: 'Change the layout or background of a slide',
      parameters: {
        type: 'object',
        properties: {
          slideId: { type: 'string' },
          layout: { type: 'string' },
          background: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['color', 'gradient', 'image'] },
              value: { type: 'string' },
            },
          },
        },
        required: ['slideId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_alternative_text',
      description: 'Generate alternative phrasing for element content',
      parameters: {
        type: 'object',
        properties: {
          slideId: { type: 'string' },
          elementId: { type: 'string' },
          alternatives: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['slideId', 'elementId', 'alternatives'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'improve_speaker_notes',
      description: 'Enhance speaker notes with better context and delivery tips',
      parameters: {
        type: 'object',
        properties: {
          slideId: { type: 'string' },
          improvedNotes: { type: 'string' },
          explanation: { type: 'string' },
        },
        required: ['slideId', 'improvedNotes'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'suggest_image',
      description: 'Suggest an image for a slide based on content',
      parameters: {
        type: 'object',
        properties: {
          slideId: { type: 'string' },
          prompt: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['slideId', 'prompt'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'adjust_animations',
      description: 'Add, modify, or remove animations for slide elements',
      parameters: {
        type: 'object',
        properties: {
          slideId: { type: 'string' },
          animation: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              duration: { type: 'number' },
              delay: { type: 'number' },
              targets: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['id', 'type', 'targets'],
          },
        },
        required: ['slideId', 'animation'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_transition',
      description: 'Add a slide transition',
      parameters: {
        type: 'object',
        properties: {
          fromSlideId: { type: 'string' },
          toSlideId: { type: 'string' },
          transition: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              duration: { type: 'number' },
            },
            required: ['type'],
          },
        },
        required: ['fromSlideId', 'toSlideId', 'transition'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'fix_accessibility',
      description: 'Fix accessibility issues like contrast, alt text, or structure',
      parameters: {
        type: 'object',
        properties: {
          slideId: { type: 'string' },
          fixes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                elementId: { type: 'string' },
                issue: { type: 'string' },
                fix: { type: 'string' },
              },
              required: ['elementId', 'issue', 'fix'],
            },
          },
        },
        required: ['slideId', 'fixes'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'provide_suggestions',
      description: 'Provide general suggestions without making changes',
      parameters: {
        type: 'object',
        properties: {
          suggestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                message: { type: 'string' },
                priority: { type: 'string', enum: ['low', 'medium', 'high'] },
              },
              required: ['type', 'message'],
            },
          },
        },
        required: ['suggestions'],
      },
    },
  },
];

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

  const { message, deckId, conversationId } = body;

  if (!message || typeof message !== 'string') {
    return NextResponse.json(
      { error: 'Message is required' },
      { status: 400 }
    );
  }

  if (!deckId) {
    return NextResponse.json(
      { error: 'deckId is required' },
      { status: 400 }
    );
  }

  const openai = new OpenAI({ apiKey });

  try {
    // Get deck from Redis
    if (!redis) {
      return NextResponse.json(
        { error: 'Redis not configured' },
        { status: 500 }
      );
    }

    const deckDataJson = await redis.get(`deck:${deckId}:data`);
    if (!deckDataJson) {
      return NextResponse.json(
        { error: 'Deck not found' },
        { status: 404 }
      );
    }

    const deck: DeckDefinition = JSON.parse(deckDataJson);

    // Get conversation history
    const historyKey = `conversation:${conversationId || `${deckId}-${session.user.id}`}:messages`;
    let conversationHistory: Array<{ role: string; content: string }> = [];
    
    try {
      const historyData = await redis.get(historyKey);
      if (historyData) {
        conversationHistory = JSON.parse(historyData);
      }
    } catch (err) {
      console.error('Failed to load conversation history:', err);
    }

    // Add user message to history
    conversationHistory.push({ role: 'user', content: message });

    // Build system prompt with deck context
    const contextPrompt = `${REFINEMENT_SYSTEM_PROMPT}

Current Deck Context:
- Title: ${deck.meta.title}
- Total Slides: ${deck.slides.length}
- Current deck state available for reference

Instructions:
1. Analyze the user's request carefully
2. When making edits, return function calls with complete element/slide data
3. Explain your reasoning in the response
4. Ask for confirmation before major changes`;

    // Build messages array for OpenAI
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: contextPrompt },
      ...conversationHistory,
    ];

    // Create streaming completion
    const stream = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: messages as any,
      tools,
      tool_choice: 'auto',
      stream: true,
      temperature: 0.7,
    });

    const encoder = new TextEncoder();
    let assistantMessage = '';
    let functionCall: { name: string; arguments: string } | null = null;

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const choice = chunk.choices[0];
            
            if (choice?.delta?.tool_calls) {
              const toolCall = choice.delta.tool_calls[0];
              
              if (toolCall?.function?.name && !functionCall) {
                functionCall = {
                  name: toolCall.function.name,
                  arguments: '',
                };
                controller.enqueue(
                  encoder.encode(
                    `event: function_call\n` +
                    `data: ${JSON.stringify({ name: functionCall.name })}\n\n`
                  )
                );
              }
              
              if (toolCall?.function?.arguments) {
                if (functionCall) {
                  functionCall.arguments += toolCall.function.arguments;
                  controller.enqueue(
                    encoder.encode(
                      `event: function_call\n` +
                      `data: ${JSON.stringify({ arguments: functionCall.arguments })}\n\n`
                    )
                  );
                }
              }
            } else if (choice?.delta?.content) {
              assistantMessage += choice.delta.content;
              controller.enqueue(
                encoder.encode(
                  `event: message\n` +
                  `data: ${JSON.stringify({ content: choice.delta.content })}\n\n`
                )
              );
            }

            if (choice?.finish_reason === 'tool_calls' && functionCall) {
              try {
                const args = JSON.parse(functionCall.arguments);
                
                conversationHistory.push({
                  role: 'assistant',
                  content: assistantMessage || `[Called ${functionCall.name}]`,
                });

                await redis.setex(historyKey, 86400, JSON.stringify(conversationHistory));

                controller.enqueue(
                  encoder.encode(
                    `event: function_result\n` +
                    `data: ${JSON.stringify({ name: functionCall.name, result: args })}\n\n`
                  )
                );
              } catch (err) {
                console.error('Failed to parse function arguments:', err);
              }
            }

            if (choice?.finish_reason === 'stop') {
              conversationHistory.push({
                role: 'assistant',
                content: assistantMessage,
              });

              await redis.setex(historyKey, 86400, JSON.stringify(conversationHistory));

              controller.enqueue(
                encoder.encode(`event: done\ndata: {}\n\n`)
              );
              controller.close();
            }
          }
        } catch (error: any) {
          console.error('Streaming error:', sanitizeSensitiveData(error));
          controller.enqueue(
            encoder.encode(
              `event: error\n` +
              `data: ${JSON.stringify({ error: 'Streaming failed' })}\n\n`
            )
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
  } catch (error: any) {
    console.error('OpenAI API error:', sanitizeSensitiveData(error));
    return NextResponse.json(
      {
        error: 'Failed to process request',
        detail: sanitizeSensitiveData(error),
      },
      { status: 500 }
    );
  }
}

