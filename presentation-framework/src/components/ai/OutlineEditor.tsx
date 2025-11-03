'use client';

import * as React from 'react';
import type { OutlineNode } from '@/ai/types';

interface OutlineEditorProps {
  outline: OutlineNode[];
  onOutlineChange?: (outline: OutlineNode[]) => void;
  editable?: boolean;
}

export function OutlineEditor({
  outline,
  onOutlineChange,
  editable = true,
}: OutlineEditorProps): React.ReactElement {
  const handleNodeClick = (node: OutlineNode) => {
    if (!editable) return;
    // Future: Inline editing
  };

  const renderNode = (node: OutlineNode, depth: number = 0): React.ReactElement => {
    const indent = depth * 24;

    return (
      <div key={node.id} className="mb-2">
        <div
          className={`flex items-start gap-3 p-3 rounded-lg hover:bg-white/50 dark:hover:bg-white/10 transition-colors cursor-pointer ${editable ? '' : 'cursor-default'}`}
          style={{ paddingLeft: `${indent + 12}px` }}
          onClick={() => handleNodeClick(node)}
        >
          <span className="text-2xl mt-0.5">
            {node.type === 'section' ? '📑' : '📄'}
          </span>
          <div className="flex-1">
            <h3 className="font-semibold text-ink">{node.title}</h3>
            {node.description && (
              <p className="text-sm text-ink-subtle mt-1">{node.description}</p>
            )}
            {node.speakerNotes && node.type === 'slide' && (
              <div className="mt-2 text-xs text-ink-mute italic">
                <span className="font-medium">Notes:</span> {node.speakerNotes.substring(0, 100)}
                {node.speakerNotes.length > 100 && '...'}
              </div>
            )}
          </div>
        </div>
        
        {node.children && node.children.length > 0 && (
          <div className="ml-6">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-panel/60 backdrop-blur-sm border border-white/40 dark:border-white/10 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-white/40 dark:border-white/10">
        <h2 className="text-lg font-semibold text-ink">Presentation Outline</h2>
        <p className="text-sm text-ink-subtle mt-1">
          {outline.length} section{outline.length !== 1 ? 's' : ''}
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {outline.length === 0 ? (
          <div className="text-center text-ink-subtle py-12">
            <p>No outline yet</p>
            <p className="text-sm mt-2">Start the conversation to generate one</p>
          </div>
        ) : (
          outline.map(node => renderNode(node))
        )}
      </div>
    </div>
  );
}

