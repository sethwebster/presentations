import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@/lib/auth';
import type { DeckDefinition } from '@/rsc/types';
import { REFINEMENT_SYSTEM_PROMPT } from '@/ai/prompts/refinement';
import { getRedis } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const redis = getRedis();

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
      description: 'Add a new element to a slide. If the user requests multiple elements (like a grid, pattern, or list), call this function multiple times to create all elements. For shapes, you MUST include shapeType and style.fill to ensure the element is visible.',
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
              shapeType: { 
                type: 'string', 
                enum: ['rect', 'ellipse', 'path', 'polygon'],
                description: 'REQUIRED for shape elements. Use "rect" for rectangles/squares, "ellipse" for circles/ovals.'
              },
              bounds: {
                type: 'object',
                properties: {
                  x: { type: 'number' },
                  y: { type: 'number' },
                  width: { type: 'number' },
                  height: { type: 'number' },
                },
              },
              style: { 
                type: 'object',
                description: 'Style properties. For shapes: use "fill" (hex color like "#ff0000" for red) for background color, "stroke" for border color, "strokeWidth" for border width, "borderRadius" for corner radius. ALWAYS include fill for shapes to make them visible.',
                properties: {
                  fill: { type: 'string', description: 'Background color for shapes (hex format like "#ff0000" for red). REQUIRED for shapes to be visible.' },
                  stroke: { type: 'string', description: 'Border color (hex format)' },
                  strokeWidth: { type: 'number', description: 'Border width in pixels' },
                  borderRadius: { type: 'number', description: 'Corner radius in pixels' },
                },
              },
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
      description: 'Update properties of an existing element. IMPORTANT: If the user requests changes to "all boxes", "all shapes", "all rectangles", etc., you MUST call this function MULTIPLE TIMES - once for each matching element. Do not create new elements, only update existing ones that match the description.',
      parameters: {
        type: 'object',
        properties: {
          slideId: { type: 'string' },
          elementId: { type: 'string', description: 'The ID of the element to update. Get this from the Elements list in the slide context.' },
          changes: {
            type: 'object',
            properties: {
              content: { type: 'string' },
              bounds: { 
                type: 'object',
                properties: {
                  x: { type: 'number' },
                  y: { type: 'number' },
                  width: { type: 'number' },
                  height: { type: 'number' },
                  rotation: { 
                    type: 'number',
                    description: 'Rotation angle in degrees (e.g., 45 for 45 degrees, -90 for -90 degrees). Rotation is applied around the element\'s origin point.'
                  },
                  originX: { 
                    type: 'number',
                    description: 'X offset of the rotation origin point from the element center (default: 0, meaning center)'
                  },
                  originY: { 
                    type: 'number',
                    description: 'Y offset of the rotation origin point from the element center (default: 0, meaning center)'
                  },
                },
                description: 'Partial bounds - only include properties you want to change. Other properties (width, height, x, y, originX, originY, etc.) are preserved automatically. Examples: { rotation: 45 } to rotate while keeping size/position, { width: 100, height: 100 } to resize, { x: 640, y: 360 } to move.'
              },
              style: { 
                type: 'object',
                description: 'Partial style - only include properties you want to change (e.g., { fill: "#ff0000" } to change color)'
              },
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
      name: 'group_elements',
      description: 'Group multiple elements together',
      parameters: {
        type: 'object',
        properties: {
          slideId: { type: 'string' },
          elementIds: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['slideId', 'elementIds'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'ungroup_elements',
      description: 'Ungroup a group element, separating its children',
      parameters: {
        type: 'object',
        properties: {
          slideId: { type: 'string' },
          groupId: { type: 'string' },
        },
        required: ['slideId', 'groupId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'duplicate_element',
      description: 'Duplicate an element on the slide',
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
      name: 'toggle_element_lock',
      description: 'Lock or unlock an element to prevent editing',
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
      name: 'toggle_element_visibility',
      description: 'Show or hide an element',
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
      name: 'bring_to_front',
      description: 'Move element to the front of all other elements',
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
      name: 'send_to_back',
      description: 'Move element to the back, behind all other elements',
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
      name: 'bring_forward',
      description: 'Move element one layer forward',
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
      name: 'send_backward',
      description: 'Move element one layer backward',
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
      name: 'align_elements',
      description: 'Align multiple elements (left, right, center, top, bottom, etc.)',
      parameters: {
        type: 'object',
        properties: {
          slideId: { type: 'string' },
          elementIds: {
            type: 'array',
            items: { type: 'string' },
          },
          alignment: {
            type: 'string',
            enum: ['left', 'right', 'centerX', 'centerY', 'top', 'bottom'],
          },
        },
        required: ['slideId', 'elementIds', 'alignment'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'distribute_elements',
      description: 'Distribute elements evenly (horizontally or vertically)',
      parameters: {
        type: 'object',
        properties: {
          slideId: { type: 'string' },
          elementIds: {
            type: 'array',
            items: { type: 'string' },
          },
          axis: {
            type: 'string',
            enum: ['horizontal', 'vertical'],
          },
        },
        required: ['slideId', 'elementIds', 'axis'],
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
  {
    type: 'function' as const,
    function: {
      name: 'get_deck_info',
      description: 'Get information about the deck structure, settings, and metadata. Use this to understand slide dimensions, total slide count, and deck-wide settings.',
      parameters: {
        type: 'object',
        properties: {
          infoType: {
            type: 'string',
            enum: ['all', 'settings', 'structure', 'metadata'],
            description: 'Type of information to retrieve: "all" for everything, "settings" for slide size and deck settings, "structure" for slide organization, "metadata" for title and description',
          },
        },
        required: ['infoType'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_slide_info',
      description: 'Get detailed information about a specific slide, including all its elements, background, and layout. Use this to query other slides or get more details about the current slide.',
      parameters: {
        type: 'object',
        properties: {
          slideId: {
            type: 'string',
            description: 'The ID of the slide to query. Use the current slide ID from context, or query other slides by their index.',
          },
          includeElements: {
            type: 'boolean',
            description: 'Whether to include detailed element information (default: true)',
            default: true,
          },
        },
        required: ['slideId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_element_info',
      description: 'Get detailed information about a specific element by its ID. Use this to query element properties, bounds, style, and metadata.',
      parameters: {
        type: 'object',
        properties: {
          slideId: {
            type: 'string',
            description: 'The ID of the slide containing the element',
          },
          elementId: {
            type: 'string',
            description: 'The ID of the element to query',
          },
        },
        required: ['slideId', 'elementId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_slides',
      description: 'List all slides in the deck with their titles and IDs. Use this to see the overall structure of the presentation.',
      parameters: {
        type: 'object',
        properties: {
          includeMetadata: {
            type: 'boolean',
            description: 'Whether to include slide metadata like title and notes (default: true)',
            default: true,
          },
        },
        required: [],
      },
    },
  },
];

/**
 * Maps technical function names to user-friendly action descriptions
 */
function mapFunctionToUserFriendlyAction(functionName: string): string {
  const mapping: Record<string, string> = {
    'add_element': 'added an element',
    'update_element': 'updated elements',
    'delete_element': 'deleted an element',
    'update_layout': 'updated the slide layout',
    'suggest_image': 'generated an image',
    'distribute_elements': 'distributed elements',
    'align_elements': 'aligned elements',
    'group_elements': 'grouped elements',
    'ungroup_elements': 'ungrouped elements',
    'duplicate_element': 'duplicated an element',
    'toggle_element_lock': 'toggled element lock',
    'toggle_element_visibility': 'toggled element visibility',
    'bring_to_front': 'brought elements to front',
    'send_to_back': 'sent elements to back',
    'bring_forward': 'brought elements forward',
    'send_backward': 'sent elements backward',
    'set_key_object': 'set key object',
    'clear_key_object': 'cleared key object',
    'equalize_size': 'equalized element sizes',
  };
  
  return mapping[functionName] || 'made changes';
}

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

  const { message, deckId, conversationId, slideContext, screenshot } = body;

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

    // Build system prompt with deck context and current slide
    let contextDetails = `Current Deck Context:
- Title: ${deck.meta.title}
- Total Slides: ${deck.slides.length}`;

    // Add current slide context if provided
    if (slideContext) {
      // Add slide size information for AI calculations
      const slideSize = slideContext.slideSize || { width: 1280, height: 720, ratio: 1280/720, aspectRatio: '16:9' };
      
      contextDetails += `\n\nCurrent Slide Context:
- Slide ID: ${slideContext.slideId}
- Title: ${slideContext.title || 'Untitled'}
- Notes: ${slideContext.notes || 'None'}
- Slide Dimensions: ${slideSize.width}px × ${slideSize.height}px (aspect ratio: ${slideSize.aspectRatio}, ratio: ${slideSize.ratio.toFixed(3)})
- Slide Center: (${slideSize.width / 2}, ${slideSize.height / 2})
- Elements: ${slideContext.elements?.length || 0} element(s)
${slideContext.elements?.length > 0 ? `\nElements on slide (use these IDs to update elements):
${slideContext.elements.map((el: any, idx: number) => {
  let desc = `${idx + 1}. [ID: ${el.id}] ${el.type}`;
  
  // Add clear category labels for easy identification
  if (el.type === 'shape') {
    const shapeType = el.shapeType || 'unknown';
    if (shapeType === 'rect') {
      desc += ` (BOX/RECTANGLE)`;
    } else if (shapeType === 'ellipse') {
      desc += ` (CIRCLE/OVAL)`;
    } else {
      desc += ` (${shapeType})`;
    }
    if (el.fillColor) {
      desc += ` - fill: ${el.fillColor}`;
    }
    if (el.strokeColor) {
      desc += `, stroke: ${el.strokeColor}`;
    }
  } else if (el.type === 'text' && el.content) {
    desc += ` (TEXT): "${el.content.substring(0, 50)}${el.content.length > 50 ? '...' : ''}"`;
  } else if (el.type === 'image') {
    desc += ` (IMAGE) - src: ${el.src ? 'present' : 'none'}`;
  }
  
  desc += ` - position: (${el.bounds?.x || 0}, ${el.bounds?.y || 0}), size: ${el.bounds?.width || 0}x${el.bounds?.height || 0}`;
  return desc;
}).join('\n')}

Note: When user says "all boxes" or "all rectangles", they mean all shape elements with shapeType "rect". When they say "all circles", they mean all shape elements with shapeType "ellipse". Count all matching elements and call update_element for each one.` : ''}
- Selected Elements: ${slideContext.selectedElementIds?.join(', ') || 'None'}`;

      if (slideContext.background) {
        contextDetails += `\n- Background: ${slideContext.background.type || 'none'}`;
      }
    }

    // Add screenshot context if provided
    if (screenshot) {
      contextDetails += `\n\nScreenshot available: A visual representation of the current slide is available for reference.`;
    }

    const contextPrompt = `${REFINEMENT_SYSTEM_PROMPT}

${contextDetails}

Instructions:
1. When the user requests a change, EXECUTE IT IMMEDIATELY using function calls
2. DO NOT ask questions or ask for confirmation - execute the requested action
3. DO NOT respond with text saying "I will..." or "Let me..." - ACTUALLY EXECUTE the function calls immediately
4. NEVER write text like "[Called 12 function(s)]" or similar - you MUST ACTUALLY CALL THE FUNCTIONS using the function calling API, not just describe what you would do in text
5. If the user asks you to do something (center, align, color, move, resize, etc.), you MUST execute function calls - text-only responses are NOT acceptable
6. Writing text that describes function calls is NOT the same as calling functions - you MUST use the function calling API
5. ERR ON THE SIDE OF MAGIC: If the user asks for a grid, pattern, or multiple items, create ALL of them. For a 3x3 grid, create 9 elements. Be complete and proactive.
6. For updating existing elements: If the user says "all boxes", "all shapes", "all rectangles", "all circles", "all text", etc., you MUST iterate through ALL matching elements in the slide context and call update_element ONCE FOR EACH matching element. DO NOT create new elements - only update existing ones that match the description.
7. Element identification: "boxes" or "rectangles" = shape elements with shapeType "rect", "circles" = shape elements with shapeType "ellipse", "shapes" = any element with type "shape", "text" = any element with type "text". Count ALL matching elements from the Elements list above.
8. For shapes: ALWAYS include shapeType (e.g., "rect" for rectangles) AND style.fill (hex color like "#ff0000") in add_element calls to make them visible
9. Use element IDs and descriptions from the current slide context above - the Elements list shows all elements with their IDs, types, and properties
10. For color changes on shapes, look for fillColor in the element descriptions
11. If multiple elements match the description, you MUST modify ALL of them by calling update_element separately for each element ID
12. If you cannot find the target element, modify the most likely match based on the description
13. You have access to ALL editor actions - group/ungroup, lock/unlock, visibility, layering, alignment, distribution, etc.
14. For centering groups/grids: Calculate the bounding box of all elements, find the center, calculate offset to slide center, then call update_element for each element with offset applied to bounds.x and bounds.y
15. Execute function calls directly - the user expects immediate action, not conversation
16. AFTER executing function calls, ALWAYS provide a brief summary message explaining what you did (e.g., "I've updated all 11 boxes to 100x100 pixels." or "I've created a 3x3 grid of 9 red squares, evenly spaced across the slide." or "I've centered the grid on the slide.")`;

    // Build messages array for OpenAI
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: contextPrompt },
      ...conversationHistory,
    ];

    // Create streaming completion
    // Use 'required' tool_choice to force function calls when actions are requested
    // This prevents the AI from responding with text like "[Called 12 function(s)]" without actually calling functions
    const stream = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: messages as any,
      tools,
      tool_choice: 'required', // Force function calls - AI must use tools, not just text
      stream: true,
      temperature: 0.7,
    });

    const encoder = new TextEncoder();
    let assistantMessage = '';
    // Track multiple parallel function calls by index
    const functionCalls = new Map<number, { name: string; arguments: string }>();
    const executedFunctionCalls: string[] = [];

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const choice = chunk.choices[0];
            
            // Handle tool calls - can be multiple parallel calls
            if (choice?.delta?.tool_calls) {
              // Process all tool calls in the delta (not just the first one)
              for (const toolCallDelta of choice.delta.tool_calls || []) {
                const index = toolCallDelta.index;
                
                if (index === undefined || index === null) {
                  console.warn('[AI Function Call] Tool call missing index:', toolCallDelta);
                  continue;
                }
                
                // Initialize function call if this is the first chunk for this index
                if (toolCallDelta.function?.name && !functionCalls.has(index)) {
                  const functionCall = {
                    name: toolCallDelta.function.name,
                    arguments: '',
                  };
                  functionCalls.set(index, functionCall);
                  console.log('[AI Function Call] Starting function call:', {
                    index,
                    name: functionCall.name,
                    timestamp: new Date().toISOString(),
                  });
                  controller.enqueue(
                    encoder.encode(
                      `event: function_call\n` +
                      `data: ${JSON.stringify({ name: functionCall.name, index })}\n\n`
                    )
                  );
                }
                
                // Accumulate arguments for this function call
                if (toolCallDelta.function?.arguments) {
                  const functionCall = functionCalls.get(index);
                  if (functionCall) {
                    functionCall.arguments += toolCallDelta.function.arguments;
                    console.log('[AI Function Call] Accumulating arguments:', {
                      index,
                      name: functionCall.name,
                      currentLength: functionCall.arguments.length,
                    });
                    controller.enqueue(
                      encoder.encode(
                        `event: function_call\n` +
                        `data: ${JSON.stringify({ arguments: functionCall.arguments, index })}\n\n`
                      )
                    );
                  }
                }
              }
            } else if (choice?.delta?.content) {
              assistantMessage += choice.delta.content;
              console.log('[AI Function Call] Assistant message delta:', {
                content: choice.delta.content,
                totalLength: assistantMessage.length,
              });
              controller.enqueue(
                encoder.encode(
                  `event: message\n` +
                  `data: ${JSON.stringify({ content: choice.delta.content })}\n\n`
                )
              );
            }
            
            // Log finish_reason for debugging
            if (choice?.finish_reason) {
              console.log('[AI Function Call] Finish reason:', {
                finish_reason: choice.finish_reason,
                activeFunctionCalls: functionCalls.size,
                assistantMessageLength: assistantMessage.length,
              });
            }

            // When finish_reason is 'tool_calls', process all completed tool calls
            if (choice?.finish_reason === 'tool_calls') {
              // Get tool calls from message if available, otherwise process from accumulated map
              const choiceAny = choice as any;
              const toolCallsToProcess = choiceAny?.message?.tool_calls || [];
              
              console.log('[AI Function Call] Processing tool_calls finish_reason:', {
                hasMessageToolCalls: !!choiceAny?.message?.tool_calls,
                toolCallsCount: toolCallsToProcess.length,
                toolCalls: toolCallsToProcess.map((tc: any) => ({
                  index: tc.index,
                  name: tc.function?.name,
                  argumentsLength: tc.function?.arguments?.length,
                })),
                functionCallsMapSize: functionCalls.size,
                functionCallsMapKeys: Array.from(functionCalls.keys()),
              });
              
              // If we have tool calls from the message, process those
              // Otherwise, process all accumulated function calls
              const indicesToProcess = toolCallsToProcess.length > 0
                ? toolCallsToProcess.map((tc: any) => tc.index)
                : Array.from(functionCalls.keys());
              
              for (const index of indicesToProcess) {
                // Try to get from message first, then fall back to accumulated
                let toolCall = toolCallsToProcess.find((tc: any) => tc.index === index);
                let argsString = toolCall?.function?.arguments?.trim() || '';
                let functionName = toolCall?.function?.name;
                
                // Fallback to accumulated arguments if message doesn't have them
                if (!argsString || !functionName) {
                  const functionCall = functionCalls.get(index);
                  if (functionCall) {
                    if (!argsString) {
                      argsString = functionCall.arguments?.trim() || '';
                    }
                    if (!functionName) {
                      functionName = functionCall.name;
                    }
                  }
                }
                
                if (!functionName) {
                  console.warn('[AI Function Call] No function name for tool call at index:', index);
                  continue;
                }
                
                if (!argsString) {
                  console.warn('[AI Function Call] Empty function arguments for', functionName, 'at index', index);
                  functionCalls.delete(index);
                  continue;
                }
                
                try {
                  
                  // Try to extract valid JSON - sometimes there might be trailing characters
                  // Find the last closing brace/bracket that matches the opening
                  let validJsonEnd = argsString.length;
                  let braceCount = 0;
                  let bracketCount = 0;
                  let inString = false;
                  let escapeNext = false;
                  
                  for (let i = 0; i < argsString.length; i++) {
                    const char = argsString[i];
                    
                    if (escapeNext) {
                      escapeNext = false;
                      continue;
                    }
                    
                    if (char === '\\') {
                      escapeNext = true;
                      continue;
                    }
                    
                    if (char === '"') {
                      inString = !inString;
                      continue;
                    }
                    
                    if (!inString) {
                      if (char === '{') braceCount++;
                      else if (char === '}') {
                        braceCount--;
                        if (braceCount === 0 && i > 0 && argsString[0] === '{') {
                          validJsonEnd = i + 1;
                          break;
                        }
                      } else if (char === '[') bracketCount++;
                      else if (char === ']') {
                        bracketCount--;
                        if (bracketCount === 0 && i > 0 && argsString[0] === '[') {
                          validJsonEnd = i + 1;
                          break;
                        }
                      }
                    }
                  }
                  
                  // Extract the valid JSON portion
                  const jsonString = argsString.substring(0, validJsonEnd).trim();
                  
                  if (!jsonString) {
                    throw new Error('No valid JSON found in arguments');
                  }
                  
                  const args = JSON.parse(jsonString);
                  
                  console.log('[AI Function Call] Function call completed:', {
                    index,
                    name: functionName,
                    arguments: args,
                    argumentsLength: argsString.length,
                    timestamp: new Date().toISOString(),
                  });
                  
                  // Handle introspection functions that return data immediately
                  let functionResult: any = args; // Default to passing args through
                  
                  if (functionName === 'get_deck_info') {
                    const infoType = args.infoType || 'all';
                    functionResult = {
                      deck: {
                        title: deck.meta.title,
                        totalSlides: deck.slides.length,
                      },
                      settings: infoType === 'all' || infoType === 'settings' ? {
                        slideSize: deck.settings?.slideSize || { width: 1280, height: 720 },
                        aspectRatio: deck.settings?.slideSize 
                          ? `${deck.settings.slideSize.width}:${deck.settings.slideSize.height}`
                          : '16:9',
                      } : undefined,
                      structure: infoType === 'all' || infoType === 'structure' ? {
                        slides: deck.slides.map((slide, idx) => ({
                          index: idx,
                          id: slide.id,
                          title: slide.title || `Slide ${idx + 1}`,
                        })),
                      } : undefined,
                      metadata: infoType === 'all' || infoType === 'metadata' ? {
                        title: deck.meta.title,
                        description: deck.meta.description,
                      } : undefined,
                    };
                  } else if (functionName === 'get_slide_info') {
                    const slideId = args.slideId;
                    const slide = deck.slides.find(s => s.id === slideId);
                    if (slide) {
                      const slideSize = deck.settings?.slideSize || { width: 1280, height: 720 };
                      functionResult = {
                        slide: {
                          id: slide.id,
                          title: slide.title || 'Untitled',
                          notes: slide.notes || 'None',
                          background: slide.background,
                          layout: slide.layout,
                          slideSize: {
                            width: slideSize.width,
                            height: slideSize.height,
                            ratio: slideSize.width / slideSize.height,
                            aspectRatio: `${slideSize.width}:${slideSize.height}`,
                            center: { x: slideSize.width / 2, y: slideSize.height / 2 },
                          },
                          elements: args.includeElements !== false ? [
                            ...(slide.elements || []),
                            ...(slide.layers?.flatMap(l => l.elements) || []),
                          ].map((el: any) => {
                            const elementInfo: any = {
                              id: el.id,
                              type: el.type,
                              bounds: el.bounds,
                              style: el.style,
                            };
                            if (el.type === 'text' && el.content) {
                              elementInfo.content = el.content;
                            }
                            if (el.type === 'shape' && el.shapeType) {
                              elementInfo.shapeType = el.shapeType;
                            }
                            if (el.type === 'image' && el.src) {
                              elementInfo.src = el.src;
                              elementInfo.alt = el.alt;
                            }
                            return elementInfo;
                          }) : undefined,
                        },
                      };
                    } else {
                      functionResult = { error: `Slide with ID ${slideId} not found` };
                    }
                  } else if (functionName === 'get_element_info') {
                    const { slideId, elementId } = args;
                    const slide = deck.slides.find(s => s.id === slideId);
                    if (slide) {
                      const allElements = [
                        ...(slide.elements || []),
                        ...(slide.layers?.flatMap(l => l.elements) || []),
                      ];
                      const element = allElements.find(el => el.id === elementId);
                      if (element) {
                        const elementInfo: any = {
                          id: element.id,
                          type: element.type,
                          bounds: element.bounds,
                          style: element.style,
                          metadata: element.metadata,
                        };
                        if (element.type === 'text' && (element as any).content) {
                          elementInfo.content = (element as any).content;
                        }
                        if (element.type === 'shape' && (element as any).shapeType) {
                          elementInfo.shapeType = (element as any).shapeType;
                        }
                        if (element.type === 'image') {
                          elementInfo.src = (element as any).src;
                          elementInfo.alt = (element as any).alt;
                        }
                        functionResult = { element: elementInfo };
                      } else {
                        functionResult = { error: `Element with ID ${elementId} not found on slide ${slideId}` };
                      }
                    } else {
                      functionResult = { error: `Slide with ID ${slideId} not found` };
                    }
                  } else if (functionName === 'list_slides') {
                    functionResult = {
                      slides: deck.slides.map((slide, idx) => ({
                        index: idx,
                        id: slide.id,
                        title: slide.title || `Slide ${idx + 1}`,
                        notes: args.includeMetadata !== false ? (slide.notes || 'None') : undefined,
                        elementCount: [
                          ...(slide.elements || []),
                          ...(slide.layers?.flatMap(l => l.elements) || []),
                        ].length,
                      })),
                      totalSlides: deck.slides.length,
                    };
                  }
                  
                  // Send function result for this specific call
                  controller.enqueue(
                    encoder.encode(
                      `event: function_result\n` +
                      `data: ${JSON.stringify({ name: functionName, result: functionResult, index })}\n\n`
                    )
                  );
                  
                  console.log('[AI Function Call] Function result sent to client:', {
                    index,
                    name: functionName,
                    resultKeys: Object.keys(functionResult),
                  });
                  
                  // Track executed function calls for summary (skip introspection queries)
                  const introspectionFunctions = ['get_deck_info', 'get_slide_info', 'get_element_info', 'list_slides'];
                  if (!introspectionFunctions.includes(functionName)) {
                    executedFunctionCalls.push(functionName);
                  }
                  console.log('[AI Function Call] Tracked executed function call:', {
                    index,
                    name: functionName,
                    totalExecuted: executedFunctionCalls.length,
                    executedCalls: [...executedFunctionCalls],
                  });
                  
                  // Remove this function call from the map
                  functionCalls.delete(index);
                } catch (err) {
                  console.error('[AI Function Call] Failed to parse function arguments:', err, {
                    index,
                    functionName: functionName,
                    argumentsLength: argsString?.length,
                    argumentsPreview: argsString?.substring(0, 200),
                  });
                  // Send error event instead of failing silently
                  controller.enqueue(
                    encoder.encode(
                      `event: error\n` +
                      `data: ${JSON.stringify({ error: 'Failed to parse function arguments', function: functionName, index, details: err instanceof Error ? err.message : String(err) })}\n\n`
                    )
                  );
                  // Remove this function call from the map even on error
                  functionCalls.delete(index);
                }
              }
              
              // Save conversation history after processing all tool calls
              if (executedFunctionCalls.length > 0) {
                conversationHistory.push({
                  role: 'assistant',
                  content: assistantMessage || `[Called ${executedFunctionCalls.length} function(s)]`,
                });
                await redis.setex(historyKey, 86400, JSON.stringify(conversationHistory));
              }
              
              // Clear assistant message for next iteration
              assistantMessage = '';
              
              // Continue processing - the stream may continue after function calls
              // Don't close the stream yet, wait for 'stop' finish_reason
            }

            if (choice?.finish_reason === 'stop') {
              console.log('[AI Function Call] Stream finished with stop reason:', {
                executedFunctionCallsCount: executedFunctionCalls.length,
                executedFunctionCalls: [...executedFunctionCalls],
                assistantMessageLength: assistantMessage.length,
                assistantMessage: assistantMessage.substring(0, 200),
                timestamp: new Date().toISOString(),
              });
              
              // If we executed function calls but have no summary message, prompt for one
              if (executedFunctionCalls.length > 0 && !assistantMessage.trim()) {
                // Send a message asking for summary (this will be handled on the next turn if needed)
                // For now, generate a basic summary based on executed calls
                const friendlyActions = executedFunctionCalls.map(mapFunctionToUserFriendlyAction);
                const summary = friendlyActions.length === 1 
                  ? `Done! ${friendlyActions[0]}.`
                  : `Done! I've ${friendlyActions.join(', ')}.`;
                console.log('[AI Function Call] Generating summary message:', {
                  summary,
                  executedCount: executedFunctionCalls.length,
                });
                assistantMessage = summary;
                controller.enqueue(
                  encoder.encode(
                    `event: message\n` +
                    `data: ${JSON.stringify({ content: summary })}\n\n`
                  )
                );
                console.log('[AI Function Call] Summary message sent to client');
              } else if (executedFunctionCalls.length > 0 && assistantMessage.trim()) {
                console.log('[AI Function Call] Assistant provided message, no summary needed:', {
                  messageLength: assistantMessage.length,
                  messagePreview: assistantMessage.substring(0, 200),
                });
              }
              
              // Save assistant message if there is one
              if (assistantMessage.trim()) {
                conversationHistory.push({
                  role: 'assistant',
                  content: assistantMessage,
                });
              }

              await redis.setex(historyKey, 86400, JSON.stringify(conversationHistory));

              controller.enqueue(
                encoder.encode(`event: done\ndata: {}\n\n`)
              );
              controller.close();
              return; // Exit the loop
            }
          }
          
          // Stream ended - send done event if we haven't already
          // This handles cases where the stream ends without an explicit 'stop' finish_reason
          // If we executed function calls but have no summary, generate one
          console.log('[AI Function Call] Stream ended, checking for summary:', {
            executedFunctionCallsCount: executedFunctionCalls.length,
            executedFunctionCalls: [...executedFunctionCalls],
            assistantMessageLength: assistantMessage.length,
            assistantMessage: assistantMessage.substring(0, 200),
            timestamp: new Date().toISOString(),
          });
          
          if (executedFunctionCalls.length > 0 && !assistantMessage.trim()) {
            const friendlyActions = executedFunctionCalls.map(mapFunctionToUserFriendlyAction);
            const summary = friendlyActions.length === 1 
              ? `Done! ${friendlyActions[0]}.`
              : `Done! I've ${friendlyActions.join(', ')}.`;
            console.log('[AI Function Call] Generating summary message at stream end:', {
              summary,
              executedCount: executedFunctionCalls.length,
            });
            assistantMessage = summary;
            controller.enqueue(
              encoder.encode(
                `event: message\n` +
                `data: ${JSON.stringify({ content: summary })}\n\n`
              )
            );
            console.log('[AI Function Call] Summary message sent to client at stream end');
          }
          
          if (assistantMessage.trim()) {
            conversationHistory.push({
              role: 'assistant',
              content: assistantMessage,
            });
          }
          
          await redis.setex(historyKey, 86400, JSON.stringify(conversationHistory));
          
          controller.enqueue(
            encoder.encode(`event: done\ndata: {}\n\n`)
          );
          controller.close();
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


