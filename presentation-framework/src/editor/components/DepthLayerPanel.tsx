/**
 * Depth Layer Panel
 * UI for managing depth layers in slide backgrounds
 */

'use client';

import React, { useState } from 'react';
import type { DepthLayer } from '@/rsc/types';

export interface DepthLayerPanelProps {
  layers: DepthLayer[];
  onLayersChange: (layers: DepthLayer[]) => void;
  backgroundImage?: string;
  onClose?: () => void;
}

export const DepthLayerPanel: React.FC<DepthLayerPanelProps> = ({
  layers: initialLayers,
  onLayersChange,
  backgroundImage,
  onClose,
}) => {
  const [layers, setLayers] = useState<DepthLayer[]>(initialLayers);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    initialLayers[0]?.id || null
  );

  const selectedLayer = layers.find((l) => l.id === selectedLayerId);

  const handleAddLayer = () => {
    const newLayer: DepthLayer = {
      id: `layer-${Date.now()}`,
      name: `Layer ${layers.length + 1}`,
      src: backgroundImage || '',
      depth: layers.length > 0 ? Math.max(...layers.map((l) => l.depth)) + 0.1 : 0.5,
      opacity: 1,
      parallaxIntensity: 1,
    };

    const updated = [...layers, newLayer];
    setLayers(updated);
    setSelectedLayerId(newLayer.id);
    onLayersChange(updated);
  };

  const handleRemoveLayer = (layerId: string) => {
    const updated = layers.filter((l) => l.id !== layerId);
    setLayers(updated);
    if (selectedLayerId === layerId) {
      setSelectedLayerId(updated[0]?.id || null);
    }
    onLayersChange(updated);
  };

  const handleUpdateLayer = (layerId: string, changes: Partial<DepthLayer>) => {
    const updated = layers.map((l) => (l.id === layerId ? { ...l, ...changes } : l));
    setLayers(updated);
    onLayersChange(updated);
  };

  const handleQuickSetup = () => {
    if (!backgroundImage) return;

    // Create simple 2-layer depth setup
    const quick: DepthLayer[] = [
      {
        id: 'bg-far',
        name: 'Background',
        src: backgroundImage,
        depth: 0,
        blur: 4,
        opacity: 0.9,
        parallaxIntensity: 0.5,
      },
      {
        id: 'bg-near',
        name: 'Foreground',
        src: backgroundImage,
        depth: 0.8,
        blur: 0,
        opacity: 1,
        parallaxIntensity: 1.5,
      },
    ];

    setLayers(quick);
    setSelectedLayerId(quick[0].id);
    onLayersChange(quick);
  };

  const handleImageUpload = (layerId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        handleUpdateLayer(layerId, { src: result });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold">Depth Layers</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Layer List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Layers</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleQuickSetup}
                    className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                  >
                    Quick Setup
                  </button>
                  <button
                    onClick={handleAddLayer}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Add Layer
                  </button>
                </div>
              </div>

              {layers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No depth layers yet.</p>
                  <p className="text-sm mt-2">Click "Quick Setup" or "Add Layer" to start.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[...layers].sort((a, b) => b.depth - a.depth).map((layer) => (
                    <div
                      key={layer.id}
                      onClick={() => setSelectedLayerId(layer.id)}
                      className={`p-3 rounded border cursor-pointer transition-colors ${
                        selectedLayerId === layer.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{layer.name || `Layer ${layer.id}`}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Depth: {layer.depth.toFixed(2)}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveLayer(layer.id);
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Layer Properties */}
            <div className="space-y-4">
              <h3 className="font-medium">Layer Properties</h3>

              {selectedLayer ? (
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                      type="text"
                      value={selectedLayer.name || ''}
                      onChange={(e) =>
                        handleUpdateLayer(selectedLayer.id, { name: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                      placeholder="Layer name"
                    />
                  </div>

                  {/* Depth */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Depth: {selectedLayer.depth.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={selectedLayer.depth}
                      onChange={(e) =>
                        handleUpdateLayer(selectedLayer.id, { depth: parseFloat(e.target.value) })
                      }
                      className="w-full"
                    />
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      0 = Far background, 1 = Near foreground
                    </div>
                  </div>

                  {/* Opacity */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Opacity: {((selectedLayer.opacity ?? 1) * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={selectedLayer.opacity ?? 1}
                      onChange={(e) =>
                        handleUpdateLayer(selectedLayer.id, { opacity: parseFloat(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>

                  {/* Blur */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Blur: {selectedLayer.blur ?? 0}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="0.5"
                      value={selectedLayer.blur ?? 0}
                      onChange={(e) =>
                        handleUpdateLayer(selectedLayer.id, { blur: parseFloat(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>

                  {/* Parallax Intensity */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Parallax Intensity: {selectedLayer.parallaxIntensity ?? 1}x
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="3"
                      step="0.1"
                      value={selectedLayer.parallaxIntensity ?? 1}
                      onChange={(e) =>
                        handleUpdateLayer(selectedLayer.id, {
                          parallaxIntensity: parseFloat(e.target.value),
                        })
                      }
                      className="w-full"
                    />
                  </div>

                  {/* Image Source */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Layer Image</label>

                    {/* Image Preview */}
                    {selectedLayer.src && (
                      <div className="mb-2 relative w-full h-32 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                        <img
                          src={selectedLayer.src}
                          alt={selectedLayer.name || 'Layer preview'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Upload Button */}
                    <div className="flex gap-2 mb-2">
                      <label className="flex-1 px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 text-center">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleImageUpload(selectedLayer.id, file);
                            }
                          }}
                        />
                        Upload Image
                      </label>
                      <button
                        onClick={() => handleUpdateLayer(selectedLayer.id, { src: backgroundImage || '' })}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Use original background image"
                      >
                        Reset
                      </button>
                    </div>

                    {/* URL Input */}
                    <input
                      type="text"
                      value={selectedLayer.src}
                      onChange={(e) =>
                        handleUpdateLayer(selectedLayer.id, { src: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
                      placeholder="Or enter image URL"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Upload a different image for this layer to create true depth separation
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Select a layer to edit its properties
                </div>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-sm mb-2">How Depth Layers Work</h4>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <li>• Elements can be positioned between layers using their depth value (0-1)</li>
              <li>• Lower depth values (0) = far background, higher values (1) = near foreground</li>
              <li>• Blur creates depth-of-field effect (focus on middle layers)</li>
              <li>• Parallax intensity controls how much each layer moves on hover/scroll</li>
              <li>• Use "Quick Setup" for a simple 2-layer foreground/background split</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
