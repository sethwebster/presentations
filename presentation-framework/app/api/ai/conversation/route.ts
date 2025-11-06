import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@/lib/auth';
import { CONVERSATION_SYSTEM_PROMPT } from '@/ai/prompts/conversation';
import { getRedis } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const redis = getRedis();

// OpenAI tools for function calling
const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'generate_outline',
      description: 'Generate a presentation outline with sections and slides',
      parameters: {
        type: 'object',
        properties: {
          sections: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                slides: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                    },
                    required: ['title'],
                  },
                },
              },
              required: ['title', 'slides'],
            },
          },
        },
        required: ['sections'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'refine_outline',
      description: 'Modify an existing outline based on user feedback',
      parameters: {
        type: 'object',
        properties: {
          changes: { type: 'string', description: 'Description of changes to make' },
          updatedSections: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                slides: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                    },
                    required: ['title'],
                  },
                },
              },
              required: ['title', 'slides'],
            },
          },
        },
        required: ['changes', 'updatedSections'],
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

  const { message, conversationId, deckId, currentOutline } = body;

  if (!message || typeof message !== 'string') {
    return NextResponse.json(
      { error: 'Message is required' },
      { status: 400 }
    );
  }

  const openai = new OpenAI({ apiKey });

  try {
    // Get conversation history from Redis
    const historyKey = `conversation:${conversationId || session.user.id}:messages`;
    let conversationHistory: Array<{ role: string; content: string }> = [];
    
    if (redis) {
      try {
        const historyData = await redis.get(historyKey);
        if (historyData) {
          conversationHistory = JSON.parse(historyData);
        }
      } catch (err) {
        console.error('Failed to load conversation history:', err);
      }
    }

    // Add user message to history
    conversationHistory.push({ role: 'user', content: message });

    // Build system prompt with current outline context if available
    let systemPrompt = CONVERSATION_SYSTEM_PROMPT;
    if (currentOutline && currentOutline.length > 0) {
      systemPrompt += `\n\nCURRENT OUTLINE:\n${JSON.stringify(currentOutline, null, 2)}\n\nWhen the user asks to refine or modify the outline, use the refine_outline function with the updated version.`;
    }

    // Build messages array for OpenAI
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
    ];

    // Create streaming completion
    // Only force function calling on the first presentation-related message when there's no outline yet
    let toolChoice: 'auto' | 'required' = 'auto';
    const lowerMessage = message.toLowerCase();
    const isPresentationRequest = lowerMessage.includes('outline') ||
        lowerMessage.includes('presentation') ||
        lowerMessage.includes('slide') ||
        lowerMessage.includes('section') ||
        lowerMessage.includes('keynote') ||
        lowerMessage.includes('talk') ||
        lowerMessage.includes('give a') ||
        lowerMessage.includes('create') ||
        lowerMessage.includes('need to present');

    // Force function call only for initial presentation requests without an outline
    if (!currentOutline && isPresentationRequest && conversationHistory.length <= 2) {
      toolChoice = 'required';
    }

    const stream = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: messages as any,
      tools,
      tool_choice: toolChoice,
      stream: true,
      temperature: 0.7,
    });

    // Create readable stream for SSE
    const encoder = new TextEncoder();
    let assistantMessage = '';
    let functionCall: { name: string; arguments: string } | null = null;

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const choice = chunk.choices[0];
            
            if (choice?.delta?.tool_calls) {
              // Handle function call streaming
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
              // Handle regular message streaming
              assistantMessage += choice.delta.content;
              controller.enqueue(
                encoder.encode(
                  `event: message\n` +
                  `data: ${JSON.stringify({ content: choice.delta.content })}\n\n`
                )
              );
            }

            if (choice?.finish_reason === 'tool_calls' && functionCall) {
              // Function call complete
              try {
                const args = JSON.parse(functionCall.arguments);
                
                // Save to conversation history (skip if no assistant message content)
                if (assistantMessage) {
                  conversationHistory.push({
                    role: 'assistant',
                    content: assistantMessage,
                  });
                }

                // Save updated history
                if (redis) {
                  await redis.setex(historyKey, 86400, JSON.stringify(conversationHistory)); // 24hr TTL
                }

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
              // Message complete
              conversationHistory.push({
                role: 'assistant',
                content: assistantMessage,
              });

              // Save updated history
              if (redis) {
                await redis.setex(historyKey, 86400, JSON.stringify(conversationHistory));
              }

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

