/**
 * API Route: Generate Depth Layers from Image
 * Uses AI to detect depth in an image and split it into layers
 * Creates segmented layer images with transparency
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { DepthLayer } from '@/rsc/types';
import sharp from 'sharp';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GenerateDepthLayersRequest {
  imageUrl: string;
  numLayers?: number; // 2-5 layers
  mode?: 'auto' | 'simple' | 'detailed';
}

/**
 * Create a gradient mask for a depth layer
 * Segments the image vertically based on depth (0 = top/far, 1 = bottom/near)
 */
async function createDepthMask(
  width: number,
  height: number,
  depth: number,
  totalLayers: number,
  layerIndex: number
): Promise<Buffer> {
  // Create an alpha channel where each layer gets a specific vertical slice
  const layerHeight = height / totalLayers;
  const featherSize = Math.floor(Math.min(layerHeight * 0.3, 100)); // Blend zone size

  // Calculate the vertical position for this layer based on depth
  // depth 0 = top, depth 1 = bottom
  const centerY = Math.floor(depth * height);
  const startY = Math.max(0, Math.floor(centerY - layerHeight / 2));
  const endY = Math.min(height, Math.floor(centerY + layerHeight / 2));

  // Create pixel data for the alpha mask
  const pixels = Buffer.alloc(width * height);

  for (let y = 0; y < height; y++) {
    let alpha = 0;

    if (y >= startY && y <= endY) {
      // Within layer bounds
      if (y < startY + featherSize) {
        // Fade in at top
        alpha = Math.floor(((y - startY) / featherSize) * 255);
      } else if (y > endY - featherSize) {
        // Fade out at bottom
        alpha = Math.floor(((endY - y) / featherSize) * 255);
      } else {
        // Fully opaque in the middle
        alpha = 255;
      }
    }

    // Fill the row with the alpha value
    for (let x = 0; x < width; x++) {
      pixels[y * width + x] = alpha;
    }
  }

  // Create a grayscale image from the pixel data
  return await sharp(pixels, {
    raw: {
      width,
      height,
      channels: 1
    }
  })
  .toFormat('png')
  .toBuffer();
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

    // Fetch the image (convert asset:// URLs or fetch from external URL)
    let imageBuffer: Buffer;
    let processedImageUrl: string;

    if (imageUrl.startsWith('asset://sha256:')) {
      const hash = imageUrl.substring('asset://sha256:'.length);
      const assetUrl = `${request.nextUrl.origin}/api/asset/${hash}`;

      try {
        const assetResponse = await fetch(assetUrl);
        if (!assetResponse.ok) {
          throw new Error(`Failed to fetch asset: ${assetResponse.statusText}`);
        }

        const arrayBuffer = await assetResponse.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
        const base64 = imageBuffer.toString('base64');

        // Detect content type from response headers
        const contentType = assetResponse.headers.get('content-type') || 'image/jpeg';
        processedImageUrl = `data:${contentType};base64,${base64}`;
      } catch (err) {
        console.error('Failed to convert asset URL:', err);
        return NextResponse.json(
          { error: `Failed to convert asset URL: ${err instanceof Error ? err.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    } else if (imageUrl.startsWith('data:')) {
      // Extract from data URL
      const base64Data = imageUrl.split(',')[1];
      imageBuffer = Buffer.from(base64Data, 'base64');
      processedImageUrl = imageUrl;
    } else {
      // Fetch from external URL
      try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
        processedImageUrl = imageUrl;
      } catch (err) {
        console.error('Failed to fetch image:', err);
        return NextResponse.json(
          { error: `Failed to fetch image: ${err instanceof Error ? err.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
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
                url: processedImageUrl,
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

    // Get image dimensions
    const imageMetadata = await sharp(imageBuffer).metadata();
    const imageWidth = imageMetadata.width || 1920;
    const imageHeight = imageMetadata.height || 1080;

    // Generate segmented layers - simple approach: extract vertical slices
    const depthLayers: DepthLayer[] = await Promise.all(
      analysis.layers.map(async (layer: any, index: number) => {
        const layerHeight = imageHeight / analysis.layers.length;
        const featherSize = Math.floor(Math.min(layerHeight * 0.2, 80));

        // Calculate vertical bounds for this layer based on depth
        const centerY = Math.floor(layer.depth * imageHeight);
        const startY = Math.max(0, Math.floor(centerY - layerHeight / 2));
        const endY = Math.min(imageHeight, Math.floor(centerY + layerHeight / 2));
        const sliceHeight = endY - startY;

        // Extract this vertical slice from the original image
        const slice = await sharp(imageBuffer)
          .extract({
            left: 0,
            top: startY,
            width: imageWidth,
            height: sliceHeight
          })
          .toBuffer();

        // Create a transparent canvas of full image size
        const transparentCanvas = await sharp({
          create: {
            width: imageWidth,
            height: imageHeight,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          }
        })
        .png()
        .toBuffer();

        // Composite the slice onto the transparent canvas at the correct position
        const segmentedImage = await sharp(transparentCanvas)
          .composite([{
            input: slice,
            top: startY,
            left: 0
          }])
          .png()
          .toBuffer();

        // Convert to data URL
        const dataUrl = `data:image/png;base64,${segmentedImage.toString('base64')}`;

        return {
          id: layer.id || `layer-${index}`,
          name: layer.name,
          src: dataUrl,
          depth: layer.depth,
          blur: layer.blur || 0,
          opacity: layer.opacity ?? 1,
          parallaxIntensity: layer.parallaxIntensity ?? 1,
        };
      })
    );

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
