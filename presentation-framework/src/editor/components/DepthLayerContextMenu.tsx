/**
 * Depth Layer Context Menu
 * Right-click menu for generating depth layers from images
 */

'use client';

import React, { useState } from 'react';
import type { DepthLayer } from '@/rsc/types';

export interface DepthLayerContextMenuProps {
  imageUrl: string;
  x: number;
  y: number;
  onClose: () => void;
  onLayersGenerated: (layers: DepthLayer[]) => void;
}

export const DepthLayerContextMenu: React.FC<DepthLayerContextMenuProps> = ({
  imageUrl,
  x,
  y,
  onClose,
  onLayersGenerated,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateLayers = async (mode: 'simple' | 'auto' | 'detailed', numLayers: number) => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/generate-depth-layers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          numLayers,
          mode,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // Show analysis in console for debugging
      console.log('[Depth Layers] Generated:', result);
      if (result.analysis?.suggestions) {
        console.log('[Depth Layers] Suggestions:', result.analysis.suggestions);
      }

      onLayersGenerated(result.layers);
      onClose();
    } catch (err) {
      console.error('Failed to generate depth layers:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate depth layers');
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Context Menu */}
      <div
        className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 min-w-[240px]"
        style={{
          left: `${x}px`,
          top: `${y}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="py-2">
          <div className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 border-b dark:border-gray-700">
            Generate Depth Layers
          </div>

          {error && (
            <div className="px-4 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 mx-2 my-2 rounded">
              {error}
            </div>
          )}

          {isGenerating ? (
            <div className="px-4 py-6 text-center">
              <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Analyzing image depth...
              </div>
            </div>
          ) : (
            <>
              {/* Quick Options */}
              <div className="py-1">
                <button
                  onClick={() => handleGenerateLayers('simple', 2)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <span className="text-lg">⚡</span>
                  <div>
                    <div className="font-medium">Quick Split</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Simple foreground/background (2 layers)
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleGenerateLayers('auto', 3)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <span className="text-lg">🎯</span>
                  <div>
                    <div className="font-medium">Auto Detect</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      AI analyzes depth automatically (3 layers)
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleGenerateLayers('detailed', 5)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <span className="text-lg">🎨</span>
                  <div>
                    <div className="font-medium">Detailed Analysis</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Complex depth planes (5 layers)
                    </div>
                  </div>
                </button>
              </div>

              <div className="border-t dark:border-gray-700 my-1" />

              {/* Info */}
              <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                <div className="font-medium mb-1">How it works:</div>
                <ul className="space-y-1">
                  <li>• AI analyzes image depth</li>
                  <li>• Creates layers at different depths</li>
                  <li>• Adds blur &amp; parallax effects</li>
                  <li>• Elements can float between layers</li>
                </ul>
              </div>

              <div className="border-t dark:border-gray-700 my-1" />

              <button
                onClick={onClose}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

/**
 * Hook to manage context menu state
 */
export function useDepthLayerContextMenu() {
  const [contextMenu, setContextMenu] = useState<{
    imageUrl: string;
    x: number;
    y: number;
  } | null>(null);

  const showContextMenu = (imageUrl: string, x: number, y: number) => {
    setContextMenu({ imageUrl, x, y });
  };

  const hideContextMenu = () => {
    setContextMenu(null);
  };

  return {
    contextMenu,
    showContextMenu,
    hideContextMenu,
  };
}
