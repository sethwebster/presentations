/**
 * Depth Layer Background Component
 * Renders background images with depth layers for parallax/depth effects
 *
 * Allows elements to be positioned between depth layers, creating a
 * 2.5D effect similar to modern motion graphics
 */

'use client';

import React, { useMemo, useState, useCallback } from 'react';
import type { DepthLayer } from '@/rsc/types';

export interface DepthLayerBackgroundProps {
  layers: DepthLayer[];
  // Mouse position for parallax (0-1 normalized)
  mouseX?: number;
  mouseY?: number;
  // Enable parallax effect
  enableParallax?: boolean;
  // Container dimensions
  width?: number;
  height?: number;
  className?: string;
  // Debug mode - shows layer boundaries and info
  debug?: boolean;
}

export const DepthLayerBackground: React.FC<DepthLayerBackgroundProps> = ({
  layers,
  mouseX: propMouseX,
  mouseY: propMouseY,
  enableParallax = false,
  width = 1920,
  height = 1080,
  className = '',
  debug = false,
}) => {
  const [internalMouseX, setInternalMouseX] = useState(0.5);
  const [internalMouseY, setInternalMouseY] = useState(0.5);

  // Use prop values if provided, otherwise use internal state
  const mouseX = propMouseX !== undefined ? propMouseX : internalMouseX;
  const mouseY = propMouseY !== undefined ? propMouseY : internalMouseY;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableParallax) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setInternalMouseX(x);
    setInternalMouseY(y);
  }, [enableParallax]);
  // Sort layers by depth (0 = far, 1 = near)
  const sortedLayers = useMemo(() => {
    return [...layers].sort((a, b) => a.depth - b.depth);
  }, [layers]);

  // Calculate parallax offset for each layer
  const getParallaxTransform = (layer: DepthLayer): string => {
    if (!enableParallax) return 'translate3d(0, 0, 0)';

    const intensity = layer.parallaxIntensity ?? 1;
    const depthFactor = layer.depth; // 0-1

    // Layers closer to camera (depth closer to 1) move more
    const maxOffset = 30; // Maximum offset in pixels
    const offsetX = (mouseX - 0.5) * maxOffset * depthFactor * intensity;
    const offsetY = (mouseY - 0.5) * maxOffset * depthFactor * intensity;

    // Use translate3d for GPU acceleration
    return `translate3d(${offsetX}px, ${offsetY}px, 0)`;
  };

  // Get filter string including blur for depth of field
  const getLayerFilter = (layer: DepthLayer): string | undefined => {
    const filters: string[] = [];

    // Add depth of field blur (far layers blurrier)
    if (layer.blur !== undefined) {
      filters.push(`blur(${layer.blur}px)`);
    } else {
      // Auto blur based on distance from focus plane (depth 0.5)
      const focusPlane = 0.5;
      const distance = Math.abs(layer.depth - focusPlane);
      const autoBlur = distance * 8; // Max 4px blur
      if (autoBlur > 0.5) {
        filters.push(`blur(${autoBlur}px)`);
      }
    }

    // Add custom filters
    if (layer.filter) {
      filters.push(layer.filter);
    }

    return filters.length > 0 ? filters.join(' ') : undefined;
  };

  return (
    <div
      className={`absolute inset-0 overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      {sortedLayers.map((layer) => (
        <div
          key={layer.id}
          data-depth-layer-id={layer.id}
          data-depth={layer.depth}
          className="absolute inset-0"
          style={{
            transform: getParallaxTransform(layer),
            transition: enableParallax ? 'transform 0.1s ease-out' : 'none',
            willChange: 'transform',
            zIndex: Math.floor(layer.depth * 100), // 0-100 z-index based on depth
            pointerEvents: 'none', // Allow clicks to pass through to elements
          }}
        >
          {/* Layer Image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${layer.src})`,
              opacity: layer.opacity ?? 1,
              filter: getLayerFilter(layer),
              // Slightly scale up to prevent gaps during parallax
              transform: 'scale(1.1)',
            }}
          >
            {/* Mask overlay if provided */}
            {layer.mask && (
              <div
                className="absolute inset-0"
                style={{
                  WebkitMaskImage: `url(${layer.mask})`,
                  maskImage: `url(${layer.mask})`,
                  WebkitMaskSize: 'cover',
                  maskSize: 'cover',
                }}
              />
            )}

            {/* Debug overlay */}
            {debug && (
              <div
                className="absolute inset-0 border-4 flex items-center justify-center"
                style={{
                  borderColor: `hsl(${layer.depth * 360}, 80%, 50%)`,
                  backgroundColor: `hsla(${layer.depth * 360}, 80%, 50%, 0.2)`,
                  pointerEvents: 'none',
                }}
              >
                <div className="bg-black/80 text-white px-4 py-2 rounded text-sm">
                  <div className="font-bold">{layer.name || layer.id}</div>
                  <div>Depth: {layer.depth.toFixed(2)}</div>
                  <div>Blur: {layer.blur ?? 0}px</div>
                  <div>Parallax: {layer.parallaxIntensity ?? 1}x</div>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Hook to calculate which depth layer range an element belongs to
 */
export function useElementDepthLayer(elementDepth?: number, layers?: DepthLayer[]) {
  return useMemo(() => {
    if (!elementDepth || !layers || layers.length === 0) {
      return null;
    }

    const sortedLayers = [...layers].sort((a, b) => a.depth - b.depth);

    // Find the layers this element sits between
    for (let i = 0; i < sortedLayers.length - 1; i++) {
      const currentLayer = sortedLayers[i];
      const nextLayer = sortedLayers[i + 1];

      if (elementDepth >= currentLayer.depth && elementDepth < nextLayer.depth) {
        return {
          behindLayer: currentLayer,
          inFrontOfLayer: nextLayer,
          zIndex: Math.floor(elementDepth * 100),
        };
      }
    }

    // Element is beyond all layers
    if (elementDepth >= sortedLayers[sortedLayers.length - 1].depth) {
      return {
        behindLayer: null,
        inFrontOfLayer: sortedLayers[sortedLayers.length - 1],
        zIndex: Math.floor(elementDepth * 100),
      };
    }

    // Element is before all layers
    return {
      behindLayer: sortedLayers[0],
      inFrontOfLayer: null,
      zIndex: Math.floor(elementDepth * 100),
    };
  }, [elementDepth, layers]);
}

/**
 * Utility to generate depth layers from a single image + depth map
 * This would typically be called server-side or during slide generation
 */
export interface DepthMapGenerationOptions {
  baseImage: string;
  depthMap?: string; // Grayscale depth map image
  numLayers?: number; // Number of layers to generate (default: 3)
  blurIntensity?: number; // Depth of field blur multiplier
}

export function generateDepthLayersFromMap(options: DepthMapGenerationOptions): DepthLayer[] {
  const {
    baseImage,
    depthMap,
    numLayers = 3,
    blurIntensity = 1,
  } = options;

  // If no depth map provided, create simple foreground/background split
  if (!depthMap) {
    return [
      {
        id: 'bg-far',
        name: 'Background',
        src: baseImage,
        depth: 0,
        blur: 4 * blurIntensity,
        opacity: 0.8,
      },
      {
        id: 'bg-near',
        name: 'Foreground',
        src: baseImage,
        depth: 0.7,
        blur: 0,
        opacity: 1,
      },
    ];
  }

  // Generate layers from depth map
  const layers: DepthLayer[] = [];

  for (let i = 0; i < numLayers; i++) {
    const depth = i / (numLayers - 1); // 0 to 1
    const distance = Math.abs(depth - 0.5); // Distance from focus plane

    layers.push({
      id: `depth-layer-${i}`,
      name: `Layer ${i + 1}`,
      src: baseImage, // In real implementation, this would be extracted based on depth map
      depth,
      mask: depthMap, // Use depth map as alpha mask
      blur: distance * 8 * blurIntensity,
      opacity: 1,
      parallaxIntensity: 1 + (depth * 0.5), // Foreground moves more
    });
  }

  return layers;
}
