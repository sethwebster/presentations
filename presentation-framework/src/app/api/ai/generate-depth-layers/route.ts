/**
 * API Route: Generate Depth Layers from Image
 * Uses AI to detect depth in an image and split it into layers
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { DepthLayer } from '@/rsc/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GenerateDepthLayersRequest {
  imageUrl: string;
  numLayers?: number; // 2-5 layers
  mode?: 'auto' | 'simple' | 'detailed';
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateDepthLayersRequest = await request.json();
    const { imageUrl, numLayers = 2, mode = 'auto' } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Use GPT-4o Vision to analyze the image and suggest depth layers
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert in image composition and depth analysis. Analyze images to identify distinct depth layers for creating 2.5D parallax effects.

Your task is to identify ${numLayers} depth layers in the image, from far background to near foreground.

For each layer, determine:
1. What visual elements belong to this layer
2. The depth value (0 = far background, 1 = near foreground)
3. Appropriate blur amount for depth of field
4. Parallax intensity (how much it should move)

Respond in JSON format:
{
  "layers": [
    {
      "id": "layer-0",
      "name": "Descriptive name",
      "description": "What elements are in this layer",
      "depth": 0.0,
      "blur": 6,
      "opacity": 1,
      "parallaxIntensity": 0.5
    }
  ],
  "suggestions": "Brief notes on how to extract/mask these layers"
}`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this image and identify ${numLayers} distinct depth layers. Mode: ${mode}

${mode === 'simple' ? 'Create a simple foreground/background split.' : ''}
${mode === 'detailed' ? 'Identify complex depth planes with subtle gradations.' : ''}
${mode === 'auto' ? 'Automatically determine the best layer split based on image content.' : ''}

Provide depth layer suggestions with specific depth values, blur amounts, and descriptions of what visual elements belong to each layer.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    const analysis = JSON.parse(jsonStr);

    // Create depth layers with the original image
    // In a production system, you'd use image segmentation AI here to actually
    // extract the layers. For now, we'll create layers that all use the same image
    // but with different depths and effects
    const depthLayers: DepthLayer[] = analysis.layers.map((layer: any, index: number) => ({
      id: layer.id || `layer-${index}`,
      name: layer.name,
      src: imageUrl, // Same image for all layers (in production, segment the image)
      depth: layer.depth,
      blur: layer.blur || 0,
      opacity: layer.opacity ?? 1,
      parallaxIntensity: layer.parallaxIntensity ?? 1,
    }));

    return NextResponse.json({
      layers: depthLayers,
      analysis: {
        suggestions: analysis.suggestions,
        layerDescriptions: analysis.layers.map((l: any) => ({
          name: l.name,
          description: l.description,
        })),
      },
    });
  } catch (error) {
    console.error('Error generating depth layers:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate depth layers',
      },
      { status: 500 }
    );
  }
}
