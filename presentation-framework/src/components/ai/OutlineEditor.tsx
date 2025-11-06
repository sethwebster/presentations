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
          className={`flex items-start gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors cursor-pointer ${editable ? '' : 'cursor-default'}`}
          style={{ paddingLeft: `${indent + 12}px` }}
          onClick={() => handleNodeClick(node)}
        >
          <span className="text-2xl mt-0.5">
            {node.type === 'section' ? '📑' : '📄'}
          </span>
          <div className="flex-1">
            <h3 className="font-semibold" style={{ color: 'var(--lume-mist)' }}>{node.title}</h3>
            {node.description && (
              <p className="text-sm mt-1" style={{ color: 'var(--lume-mist)', opacity: 0.7 }}>{node.description}</p>
            )}
            {node.speakerNotes && node.type === 'slide' && (
              <div className="mt-2 text-xs italic" style={{ color: 'var(--lume-mist)', opacity: 0.6 }}>
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
    <div className="flex flex-col h-full backdrop-blur-sm border rounded-xl overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(236, 236, 236, 0.2)' }}>
      <div className="p-4 border-b" style={{ borderColor: 'rgba(236, 236, 236, 0.1)' }}>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--lume-mist)' }}>Presentation Outline</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--lume-mist)', opacity: 0.7 }}>
          {outline.length} section{outline.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {outline.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--lume-mist)', opacity: 0.7 }}>
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

