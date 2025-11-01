"use client";

import { useState, useMemo } from 'react';
import { useEditor, useEditorInstance } from '../hooks/useEditor';
import type { TimelineDefinition, TimelineSegmentDefinition, AnimationDefinition } from '@/rsc/types';
import { Button } from '@/components/ui/button';
import { Panel, PanelHeader, PanelTitle, PanelBody } from '@/components/ui/panel';

interface TimelineEditorProps {
  deckId: string;
}

const ANIMATION_TYPES: Array<{ value: string; label: string }> = [
  { value: 'fade', label: 'Fade' },
  { value: 'scale', label: 'Scale' },
  { value: 'slide', label: 'Slide' },
  { value: 'rise-up', label: 'Rise Up' },
  { value: 'reveal', label: 'Reveal' },
  { value: 'fade-out', label: 'Fade Out' },
  { value: 'staggered-reveal', label: 'Staggered Reveal' },
  { value: 'zoom', label: 'Zoom' },
];

const TRIGGER_TYPES: Array<{ value: string; label: string }> = [
  { value: 'auto', label: 'Auto' },
  { value: 'interaction', label: 'On Click' },
  { value: 'voice', label: 'Voice Cue' },
  { value: 'custom', label: 'Custom' },
];

export function TimelineEditor({ deckId: _deckId }: TimelineEditorProps) {
  const state = useEditor();
  const editor = useEditorInstance();
  
  const currentSlide = state.deck?.slides[state.currentSlideIndex];
  const timeline = currentSlide?.timeline || { tracks: [] };
  
  const allElements = useMemo(() => {
    if (!currentSlide) return [];
    return [
      ...(currentSlide.elements || []),
      ...(currentSlide.layers?.flatMap(l => l.elements) || []),
    ];
  }, [currentSlide]);

  const [editingSegment, setEditingSegment] = useState<{
    segmentId: string;
    trackId: string;
  } | null>(null);

  const handleAddSegment = (trackId: string) => {
    const newSegment: TimelineSegmentDefinition = {
      id: `segment-${Date.now()}`,
      start: 0,
      duration: 0.5,
      targets: state.selectedElementIds.size > 0 ? Array.from(state.selectedElementIds) : [],
      animation: {
        type: 'fade',
        duration: 0.5,
        easing: 'ease-in-out',
      },
      trigger: 'auto',
    };

    if (currentSlide?.id) {
      editor.addTimelineSegment(currentSlide.id, trackId, newSegment);
      setEditingSegment({ segmentId: newSegment.id, trackId });
    }
  };

  const handleDeleteSegment = (trackId: string, segmentId: string) => {
    if (currentSlide?.id) {
      editor.removeTimelineSegment(currentSlide.id, trackId, segmentId);
    }
  };

  const handleUpdateSegment = (trackId: string, segmentId: string, updates: Partial<TimelineSegmentDefinition>) => {
    if (!currentSlide?.id || !timeline) return;

    const track = timeline.tracks.find(t => t.id === trackId);
    if (!track) return;

    const segment = track.segments.find(s => s.id === segmentId);
    if (!segment) return;

    const updatedSegment = { ...segment, ...updates };
    const updatedTrack = {
      ...track,
      segments: track.segments.map(s => s.id === segmentId ? updatedSegment : s),
    };

    const updatedTracks = timeline.tracks.map(t => t.id === trackId ? updatedTrack : t);
    editor.updateSlideTimeline(currentSlide.id, { tracks: updatedTracks });
  };

  if (!currentSlide) {
    return (
      <Panel className="h-full">
        <PanelHeader>
          <PanelTitle>Timeline</PanelTitle>
        </PanelHeader>
        <PanelBody>
          <div className="text-center text-muted-foreground py-8">
            No slide selected
          </div>
        </PanelBody>
      </Panel>
    );
  }

  // Get or create default animation track
  const animationTrack = timeline.tracks.find(t => t.trackType === 'animation') || {
    id: 'animation-track',
    trackType: 'animation' as const,
    segments: [],
  };

  return (
    <Panel className="h-full flex flex-col">
      <PanelHeader>
        <PanelTitle>Timeline - {currentSlide.title || `Slide ${state.currentSlideIndex + 1}`}</PanelTitle>
      </PanelHeader>
      <PanelBody className="flex-1 overflow-auto">
        <div className="space-y-4">
          {/* Animation Track */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Animation Track</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddSegment(animationTrack.id)}
              >
                Add Segment
              </Button>
            </div>

            {animationTrack.segments.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8 border border-border/25 rounded-lg">
                No animation segments. Click "Add Segment" to create one.
              </div>
            ) : (
              <div className="space-y-2">
                {animationTrack.segments.map((segment) => {
                  const isEditing = editingSegment?.segmentId === segment.id && editingSegment?.trackId === animationTrack.id;
                  const targetElements = segment.targets
                    .map(id => allElements.find(el => el.id === id))
                    .filter(Boolean);

                  return (
                    <div
                      key={segment.id}
                      className="border border-border/30 rounded-lg p-3 bg-card/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              Start: {segment.start}s
                            </span>
                            <span className="text-xs font-medium text-muted-foreground">
                              Duration: {segment.duration}s
                            </span>
                            <span className="text-xs font-medium text-muted-foreground">
                              Type: {segment.animation.type}
                            </span>
                          </div>

                          {targetElements.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Targets: {targetElements.map(el => el?.id).filter(Boolean).join(', ')}
                            </div>
                          )}

                          {isEditing && (
                            <div className="space-y-2 pt-2 border-t border-border/25">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs text-muted-foreground block mb-1">
                                    Start (s)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={segment.start}
                                    onChange={(e) =>
                                      handleUpdateSegment(
                                        animationTrack.id,
                                        segment.id,
                                        { start: parseFloat(e.target.value) || 0 }
                                      )
                                    }
                                    className="w-full px-2 py-1 text-xs border border-border/30 rounded bg-card"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground block mb-1">
                                    Duration (s)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={segment.duration}
                                    onChange={(e) =>
                                      handleUpdateSegment(
                                        animationTrack.id,
                                        segment.id,
                                        { duration: parseFloat(e.target.value) || 0.5 }
                                      )
                                    }
                                    className="w-full px-2 py-1 text-xs border border-border/30 rounded bg-card"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="text-xs text-muted-foreground block mb-1">
                                  Animation Type
                                </label>
                                <select
                                  value={segment.animation.type}
                                  onChange={(e) =>
                                    handleUpdateSegment(animationTrack.id, segment.id, {
                                      animation: {
                                        ...segment.animation,
                                        type: e.target.value,
                                      },
                                    })
                                  }
                                  className="w-full px-2 py-1 text-xs border border-border/30 rounded bg-card"
                                >
                                  {ANIMATION_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>
                                      {type.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-xs text-muted-foreground block mb-1">
                                  Trigger
                                </label>
                                <select
                                  value={segment.trigger || 'auto'}
                                  onChange={(e) =>
                                    handleUpdateSegment(animationTrack.id, segment.id, {
                                      trigger: e.target.value as any,
                                    })
                                  }
                                  className="w-full px-2 py-1 text-xs border border-border/30 rounded bg-card"
                                >
                                  {TRIGGER_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>
                                      {type.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setEditingSegment(
                                isEditing
                                  ? null
                                  : { segmentId: segment.id, trackId: animationTrack.id }
                              )
                            }
                          >
                            {isEditing ? 'Done' : 'Edit'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteSegment(animationTrack.id, segment.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </PanelBody>
    </Panel>
  );
}
