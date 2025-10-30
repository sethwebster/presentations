"use client";

import { useState, useRef, useEffect } from 'react';
import type { TextElementDefinition } from '@/rsc/types';
import { useEditorStore } from '../store/editorStore';

interface EditableTextElementProps {
  element: TextElementDefinition;
  onBlur: () => void;
}

export function EditableTextElement({ element, onBlur }: EditableTextElementProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(element.content || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const updateElement = useEditorStore((state) => state.updateElement);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    updateElement(element.id, { content });
    onBlur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === 'Escape') {
      setContent(element.content || '');
      setIsEditing(false);
      onBlur();
    }
  };

  if (isEditing) {
    return (
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          outline: '2px solid var(--lume-primary)',
          padding: '8px',
          fontSize: element.style?.fontSize || '16px',
          fontFamily: element.style?.fontFamily || 'inherit',
          color: element.style?.color || '#000000',
          fontWeight: element.style?.fontWeight || 'normal',
          fontStyle: element.style?.fontStyle || 'normal',
          textAlign: element.style?.textAlign || 'left',
          background: 'transparent',
          resize: 'none',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        padding: '8px',
        fontSize: element.style?.fontSize || '16px',
        fontFamily: element.style?.fontFamily || 'inherit',
        color: element.style?.color || '#000000',
        fontWeight: element.style?.fontWeight || 'normal',
        cursor: 'text',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {content || 'Text'}
    </div>
  );
}

