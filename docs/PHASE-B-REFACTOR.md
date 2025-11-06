# Phase B: Editor Component Refactoring Specification

**Status:** Not Started
**Priority:** Medium
**Estimated Effort:** 2-3 weeks
**Dependencies:** Phase A (Complete)

---

## Table of Contents

1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Current State Analysis](#current-state-analysis)
4. [Implementation Plan](#implementation-plan)
5. [Detailed Steps](#detailed-steps)
6. [Testing Strategy](#testing-strategy)
7. [Success Criteria](#success-criteria)
8. [References](#references)

---

## Overview

Phase B focuses on decomposing the monolithic **Toolbar.tsx** (1,904 lines) and **PropertiesPanel.tsx** (1,590 lines) components into smaller, maintainable, testable units. This refactoring follows React best practices and adheres to the project's CLAUDE.md guidelines.

### Goals

- **Reduce component size** by 60-70% through extraction
- **Improve maintainability** with smaller, focused components
- **Enhance testability** by isolating business logic
- **Follow CLAUDE.md rules** (no direct useEffect in components)
- **Maintain functionality** without breaking existing features

### Non-Goals

- Changing component behavior or functionality
- Rewriting business logic (only relocating it)
- Adding new features

---

## Problem Statement

### Toolbar.tsx Issues

**File:** `src/editor/components/Toolbar.tsx`
**Lines:** 1,904
**Complexity:** Extremely High

**Problems:**

1. **Massive file size** - Nearly 2,000 lines is unmaintainable
2. **Mixed concerns** - UI, business logic, API calls, state management all in one file
3. **Multiple responsibilities** - Handles file ops, element ops, AI features, view controls, etc.
4. **Direct useEffect usage** - Violates CLAUDE.md rule about using custom hooks
5. **Tight coupling** - Hard to test individual features
6. **State complexity** - 9 useState hooks, 4 useRef hooks

**Key Sections:**

- **Image Processing** (Lines 132-595): 464 lines of file handling, compression, library management
- **AI Handlers** (Lines 613-1355): 743 lines of image generation, slide refinement, regeneration
- **Embedded Modals**: ImageBackgroundModal, RefinePanel with complex state
- **Multiple Toolbar Sections**: Insert tools, format controls, layer management, view controls

### PropertiesPanel.tsx Issues

**File:** `src/editor/components/PropertiesPanel.tsx`
**Lines:** 1,590
**Complexity:** Extremely High

**Problems:**

1. **Massive file size** - 1,590 lines
2. **Element type switching** - Single component handles all element types
3. **Form complexity** - Dozens of form controls in one component
4. **Mixed concerns** - Validation, state updates, UI rendering

**Key Sections:**

- Text properties (font, size, color, alignment)
- Shape properties (fill, stroke, dimensions)
- Image properties (scaling, positioning, cropping)
- Animation properties (transitions, effects)

---

## Current State Analysis

### Toolbar.tsx Structure

```
Toolbar.tsx (1,904 lines)
├── State Management (Lines 23-74)
│   ├── 9 useState hooks
│   ├── 4 useRef hooks
│   └── Derived state from useEditor
│
├── Effects (Lines 80-129)
│   ├── Align menu click-outside (Lines 111-122) ❌ Direct useEffect
│   ├── Background modal refresh (Lines 125-129) ❌ Direct useEffect
│   └── Refine conversation load (Lines 80-108) ❌ Direct useEffect
│
├── Image Processing Handlers (Lines 132-595) - 464 lines ⚠️ Extract
│   ├── processImageFiles (220 lines)
│   ├── compressBackgroundFile (57 lines)
│   ├── handleBackgroundFileChange (109 lines)
│   └── Helper functions (78 lines)
│
├── AI Handlers (Lines 613-1355) - 743 lines ⚠️ Extract
│   ├── handleGenerateImage (180 lines)
│   ├── applyFunctionCall (319 lines) - Massive switch statement
│   ├── handleRefine (171 lines)
│   └── handleRegenerate (70 lines)
│
├── Utility Handlers (Lines 1357-1427)
│   ├── handleLibraryRefresh
│   ├── handleSelectLibraryImage
│   └── openPresentation
│
├── UI Sections (Lines 1428-1842)
│   ├── Undo/Redo (Lines 1428-1449)
│   ├── Insert Tools (Lines 1452-1550)
│   ├── Text Formatting (Lines 1552-1632)
│   ├── Layout & Grouping (Lines 1634-1672)
│   ├── Layer Ordering (Lines 1674-1727)
│   ├── Playback Controls (Lines 1730-1766)
│   ├── File Operations (Lines 1767-1789)
│   ├── AI Features (Lines 1792-1820)
│   └── View Controls (Lines 1822-1842)
│
└── Embedded Modals (Lines 1844-1903)
    ├── ImageBackgroundModal (Lines 1844-1882)
    └── RefinePanel (Lines 1884-1903)
```

### Dependencies

**External Components:**
- `ToolbarButton` - Reusable button component
- `DropdownButton` - Dropdown menu component
- `AlignmentTools` - Alignment dropdown (already extracted)
- `ImageBackgroundModal` - Image modal
- `RefinePanel` - AI refine panel

**Services:**
- `getImageGenerationService()` - AI image generation
- `getAlignmentService()` - Element alignment
- `getRefineService()` - AI refinement

**Hooks:**
- `useEditor()` - Main editor state
- `useEditorInstance()` - Editor actions
- `useImageLibrary()` - Image library management
- `useSession()` - NextAuth session

---

## Implementation Plan

### Phase 1: Extract Business Logic (Week 1)

**Goal:** Move complex handlers out of component into custom hooks

#### 1.1 Create `useToolbarImageHandlers` Hook

**New File:** `src/editor/components/toolbar/useToolbarImageHandlers.ts`

**Extract:** Lines 132-595 (464 lines)

**Responsibility:**
- File validation and reading
- Image compression and resizing
- Library integration
- Background/element mode handling

**Interface:**
```typescript
interface UseToolbarImageHandlersParams {
  editor: EditorInstance;
  currentSlideIndex: number;
  addImageToLibrary: (item: AddImageLibraryItemInput) => ImageLibraryItem;
  deckId: string;
  activeSlideId: string | null;
  setBackgroundStatus: (status: BackgroundStatus) => void;
}

interface UseToolbarImageHandlersReturn {
  processImageFiles: (files: File[]) => void;
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  compressBackgroundFile: (file: File) => Promise<string>;
  handleBackgroundFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  triggerBackgroundUpload: (mode: 'background' | 'element') => void;
}

export function useToolbarImageHandlers(
  params: UseToolbarImageHandlersParams
): UseToolbarImageHandlersReturn {
  // Implementation here
}
```

**Benefits:**
- Follows CLAUDE.md rule (custom hook instead of direct useEffect)
- Testable in isolation
- Reusable across components
- Reduces Toolbar.tsx by 464 lines

#### 1.2 Create `useToolbarAIHandlers` Hook

**New File:** `src/editor/components/toolbar/useToolbarAIHandlers.ts`

**Extract:** Lines 613-1355 (743 lines)

**Responsibility:**
- AI image generation (OpenAI/Flux)
- AI function call execution
- Slide refinement
- Presentation regeneration

**Interface:**
```typescript
interface UseToolbarAIHandlersParams {
  deck: DeckDefinition | null;
  deckId: string;
  editor: EditorInstance;
  currentSlideIndex: number;
  activeSlideId: string | null;
  selectedElementIds: Set<string>;
  addImageToLibrary: (item: AddImageLibraryItemInput) => ImageLibraryItem;
  setBackgroundStatus: (status: BackgroundStatus) => void;
  setRefineStatus: (status: RefineStatus) => void;
}

interface UseToolbarAIHandlersReturn {
  handleGenerateImage: (params: GenerateImageParams) => Promise<void>;
  applyFunctionCall: (functionCall: FunctionCall, context: Context) => Promise<void>;
  handleRefine: (message: string, context: RefineContext) => Promise<void>;
  handleRegenerate: () => Promise<void>;
}

export function useToolbarAIHandlers(
  params: UseToolbarAIHandlersParams
): UseToolbarAIHandlersReturn {
  // Implementation here
}
```

**Benefits:**
- Isolates AI logic
- Easier to test AI features
- Reduces Toolbar.tsx by 743 lines
- Better error handling

#### 1.3 Create `useToolbarEffects` Hook

**New File:** `src/editor/components/toolbar/useToolbarEffects.ts`

**Extract:** Lines 80-129

**Responsibility:**
- Align menu click-outside detection
- Background modal library refresh
- Refine conversation history loading

**Interface:**
```typescript
interface UseToolbarEffectsParams {
  showBackgroundModal: boolean;
  showRefineModal: boolean;
  activeSlideId: string | null;
  alignMenuRef: React.RefObject<HTMLDivElement>;
  setShowAlignMenu: (show: boolean) => void;
  refreshImageLibrary: () => Promise<void>;
  loadRefineConversation: (slideId: string) => Promise<void>;
}

export function useToolbarEffects(params: UseToolbarEffectsParams): void {
  // All effects here with proper cleanup
}
```

**Benefits:**
- Follows CLAUDE.md rule (no direct useEffect)
- Centralizes side effects
- Easier cleanup management

**After Phase 1:** Toolbar.tsx reduces from 1,904 → ~900 lines (53% reduction)

---

### Phase 2: Extract Modal Controllers (Week 2)

**Goal:** Create wrapper components that own modal state and logic

#### 2.1 Create `ImageModalController`

**New File:** `src/editor/components/toolbar/ImageModalController.tsx`

**Extract:** Lines 1844-1882 + related state

**Responsibility:**
- Modal open/close state
- Image generation/upload coordination
- Library management
- Status feedback

**Interface:**
```tsx
interface ImageModalControllerProps {
  deckId: string;
  currentSlideIndex: number;
  deck: DeckDefinition | null;
  trigger: React.ReactNode; // The button that opens the modal
  onImageHandlers: UseToolbarImageHandlersReturn;
  onAIHandlers: UseToolbarAIHandlersReturn;
}

export function ImageModalController(props: ImageModalControllerProps) {
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState<BackgroundStatus>({ /* ... */ });
  const [uploadMode, setUploadMode] = useState<'background' | 'element'>('background');

  // All ImageBackgroundModal state and handlers here

  return (
    <>
      {props.trigger({ onClick: () => setShowModal(true) })}
      {showModal && (
        <ImageBackgroundModal
          open={showModal}
          onClose={() => setShowModal(false)}
          // ... other props
        />
      )}
    </>
  );
}
```

**Usage in Toolbar:**
```tsx
<ImageModalController
  deckId={deckId}
  currentSlideIndex={currentSlideIndex}
  deck={deck}
  trigger={(props) => (
    <ToolbarButton {...props} title="Add Background Image">
      {/* Icon */}
    </ToolbarButton>
  )}
  onImageHandlers={imageHandlers}
  onAIHandlers={aiHandlers}
/>
```

**Benefits:**
- Encapsulates modal logic
- Reduces Toolbar.tsx complexity
- Easier to test modal interactions

#### 2.2 Create `RefinePanelController`

**New File:** `src/editor/components/toolbar/RefinePanelController.tsx`

**Extract:** Lines 1882-1903 + refine state

**Responsibility:**
- Refine modal state
- Conversation history management
- Message updates
- Processing status

**Interface:**
```tsx
interface RefinePanelControllerProps {
  activeSlideId: string | null;
  trigger: React.ReactNode;
  onRefine: (message: string) => Promise<void>;
}

export function RefinePanelController(props: RefinePanelControllerProps) {
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState<RefineStatus>({ /* ... */ });
  const [messagesBySlide, setMessagesBySlide] = useState<Map<string, RefineMessage[]>>(new Map());

  // All RefinePanel state and handlers here

  return (
    <>
      {props.trigger({ onClick: () => setShowModal(true) })}
      {showModal && (
        <RefinePanel
          open={showModal}
          onClose={() => setShowModal(false)}
          messages={currentMessages}
          // ... other props
        />
      )}
    </>
  );
}
```

**After Phase 2:** Toolbar.tsx reduces from ~900 → ~600 lines (additional 33% reduction)

---

### Phase 3: Extract Toolbar Sections (Week 3)

**Goal:** Split UI rendering into focused section components

#### 3.1 Create Section Components

##### `ToolbarInsertSection.tsx`

**Extract:** Lines 1452-1550

**Responsibility:** Text, image, and shape insertion buttons

```tsx
interface ToolbarInsertSectionProps {
  activeSlideId: string | null;
  currentSlideIndex: number;
  lastShapeStyle: ShapeStyle;
  onInsertText: () => void;
  onInsertImage: () => void;
  onInsertShape: (type: 'rect' | 'ellipse') => void;
}

export function ToolbarInsertSection(props: ToolbarInsertSectionProps) {
  return (
    <div className="flex items-center gap-1">
      <ToolbarButton onClick={props.onInsertText} title="Add Text">
        {/* Text icon */}
      </ToolbarButton>
      <ToolbarButton onClick={props.onInsertImage} title="Add Image">
        {/* Image icon */}
      </ToolbarButton>
      {/* Shape buttons */}
    </div>
  );
}
```

##### `ToolbarFormatSection.tsx`

**Extract:** Lines 1552-1632

**Responsibility:** Text formatting (bold, italic, alignment)

```tsx
interface ToolbarFormatSectionProps {
  selectedElementIds: Set<string>;
  deck: DeckDefinition | null;
  currentSlideIndex: number;
  onFormatChange: (format: TextFormat) => void;
}

export function ToolbarFormatSection(props: ToolbarFormatSectionProps) {
  // Text formatting buttons
}
```

##### `ToolbarLayoutSection.tsx`

**Extract:** Lines 1634-1672

**Responsibility:** Grouping and alignment tools

```tsx
interface ToolbarLayoutSectionProps {
  selectedElementIds: Set<string>;
  onGroup: () => void;
  onUngroup: () => void;
  onAlign: (alignment: AlignmentType) => void;
}

export function ToolbarLayoutSection(props: ToolbarLayoutSectionProps) {
  // Group/ungroup and AlignmentTools dropdown
}
```

##### `ToolbarLayerSection.tsx`

**Extract:** Lines 1674-1727

**Responsibility:** Layer ordering (bring to front, send to back, etc.)

```tsx
interface ToolbarLayerSectionProps {
  selectedElementIds: Set<string>;
  onBringToFront: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onSendToBack: () => void;
}

export function ToolbarLayerSection(props: ToolbarLayerSectionProps) {
  // Layer ordering buttons
}
```

##### `ToolbarViewSection.tsx`

**Extract:** Lines 1822-1842

**Responsibility:** View controls (grid, timeline toggles)

```tsx
interface ToolbarViewSectionProps {
  showGrid: boolean;
  onToggleGrid: () => void;
  onToggleTimeline: () => void;
}

export function ToolbarViewSection(props: ToolbarViewSectionProps) {
  // Grid and timeline toggle buttons
}
```

#### 3.2 Final Toolbar.tsx Structure

After all extractions, Toolbar.tsx becomes a composition component (~300-400 lines):

```tsx
export function Toolbar({ deckId, onToggleTimeline }: ToolbarProps) {
  const state = useEditor();
  const editor = useEditorInstance();
  const { data: session } = useSession();

  // Use custom hooks for logic
  const imageHandlers = useToolbarImageHandlers({ /* params */ });
  const aiHandlers = useToolbarAIHandlers({ /* params */ });
  useToolbarEffects({ /* params */ });

  // Minimal local state for UI
  const [showAlignMenu, setShowAlignMenu] = useState(false);
  const alignMenuRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex h-14 items-center gap-1 border-b bg-background px-2">
      {/* File operations */}
      <ToolbarButton onClick={() => editor.saveDeck()} title="Save">
        <SaveIcon />
      </ToolbarButton>

      {/* Undo/Redo */}
      <ToolbarButton onClick={() => editor.undo()} title="Undo">
        <UndoIcon />
      </ToolbarButton>

      {/* Insert section */}
      <ToolbarInsertSection
        activeSlideId={state.selectedSlideId}
        currentSlideIndex={state.currentSlideIndex}
        lastShapeStyle={state.lastShapeStyle}
        onInsertText={() => editor.addTextElement(/* ... */)}
        onInsertImage={() => fileInputRef.current?.click()}
        onInsertShape={(type) => editor.addShape(type, /* ... */)}
      />

      {/* Format section */}
      <ToolbarFormatSection
        selectedElementIds={state.selectedElementIds}
        deck={state.deck}
        currentSlideIndex={state.currentSlideIndex}
        onFormatChange={(format) => editor.updateTextFormat(format)}
      />

      {/* Layout section */}
      <ToolbarLayoutSection
        selectedElementIds={state.selectedElementIds}
        onGroup={() => editor.groupElements(/* ... */)}
        onUngroup={() => editor.ungroupElements(/* ... */)}
        onAlign={(alignment) => getAlignmentService().alignElements(alignment)}
      />

      {/* Layer section */}
      <ToolbarLayerSection
        selectedElementIds={state.selectedElementIds}
        onBringToFront={() => editor.bringToFront(/* ... */)}
        onBringForward={() => editor.bringForward(/* ... */)}
        onSendBackward={() => editor.sendBackward(/* ... */)}
        onSendToBack={() => editor.sendToBack(/* ... */)}
      />

      {/* View section */}
      <ToolbarViewSection
        showGrid={state.showGrid}
        onToggleGrid={() => editor.toggleGrid()}
        onToggleTimeline={onToggleTimeline}
      />

      {/* Modal controllers */}
      <ImageModalController
        deckId={deckId}
        currentSlideIndex={state.currentSlideIndex}
        deck={state.deck}
        trigger={(props) => <ToolbarButton {...props}>Image</ToolbarButton>}
        onImageHandlers={imageHandlers}
        onAIHandlers={aiHandlers}
      />

      <RefinePanelController
        activeSlideId={state.selectedSlideId}
        trigger={(props) => <ToolbarButton {...props}>Refine</ToolbarButton>}
        onRefine={aiHandlers.handleRefine}
      />
    </div>
  );
}
```

**After Phase 3:** Toolbar.tsx reduces from ~600 → ~350 lines (total 82% reduction from original)

---

### Phase 4: Extract PropertiesPanel (Optional, if time permits)

**Goal:** Split PropertiesPanel.tsx (1,590 lines) into property-type-specific components

#### File Structure

```
src/editor/components/properties/
├── PropertiesPanel.tsx (300 lines - main container)
├── TextProperties.tsx (400 lines)
├── ShapeProperties.tsx (350 lines)
├── ImageProperties.tsx (350 lines)
├── AnimationProperties.tsx (200 lines)
└── usePropertyHandlers.ts (custom hook for shared logic)
```

#### 4.1 Main Container

**PropertiesPanel.tsx** becomes a router component:

```tsx
export function PropertiesPanel() {
  const state = useEditor();
  const editor = useEditorInstance();

  const selectedElement = getSelectedElement(state);

  if (!selectedElement) {
    return <EmptyState />;
  }

  // Route to appropriate property component based on element type
  switch (selectedElement.type) {
    case 'text':
      return <TextProperties element={selectedElement} editor={editor} />;
    case 'rect':
    case 'ellipse':
      return <ShapeProperties element={selectedElement} editor={editor} />;
    case 'image':
      return <ImageProperties element={selectedElement} editor={editor} />;
    default:
      return <GenericProperties element={selectedElement} editor={editor} />;
  }
}
```

#### 4.2 Property Components

Each component handles one element type:

**TextProperties.tsx:**
- Font family, size, weight
- Text color, alignment
- Line height, letter spacing
- Text decorations

**ShapeProperties.tsx:**
- Fill color, opacity
- Stroke color, width, style
- Border radius
- Dimensions, position

**ImageProperties.tsx:**
- Scaling, positioning
- Cropping controls
- Filters, effects
- Background image specific controls

**AnimationProperties.tsx:**
- Transition effects
- Animation timing
- Keyframe controls

#### 4.3 Shared Logic Hook

**usePropertyHandlers.ts:**

```typescript
export function usePropertyHandlers(elementId: string, editor: EditorInstance) {
  const updateProperty = useCallback((property: string, value: any) => {
    editor.updateElement(elementId, { [property]: value });
  }, [elementId, editor]);

  const updateStyle = useCallback((style: Partial<CSSProperties>) => {
    editor.updateElementStyle(elementId, style);
  }, [elementId, editor]);

  return { updateProperty, updateStyle };
}
```

---

## Detailed Steps

### Step 1: Create Directory Structure

```bash
mkdir -p src/editor/components/toolbar
mkdir -p src/editor/components/properties
```

### Step 2: Extract Image Handlers Hook

1. Create `src/editor/components/toolbar/useToolbarImageHandlers.ts`
2. Copy lines 132-595 from Toolbar.tsx
3. Convert to hook with proper parameters and return type
4. Add JSDoc comments
5. Write unit tests

**Implementation Checklist:**
- [ ] Create hook file
- [ ] Define TypeScript interfaces
- [ ] Extract processImageFiles function
- [ ] Extract compressBackgroundFile function
- [ ] Extract handleBackgroundFileChange function
- [ ] Extract triggerBackgroundUpload function
- [ ] Add error handling
- [ ] Add JSDoc documentation
- [ ] Write unit tests
- [ ] Update Toolbar.tsx to use hook

**Testing:**
```typescript
// useToolbarImageHandlers.test.ts
describe('useToolbarImageHandlers', () => {
  it('should process valid image files', async () => {
    const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const handlers = useToolbarImageHandlers(mockParams);
    await handlers.processImageFiles([mockFile]);
    expect(mockAddImageToLibrary).toHaveBeenCalled();
  });

  it('should reject non-image files', async () => {
    const mockFile = new File([''], 'test.txt', { type: 'text/plain' });
    const handlers = useToolbarImageHandlers(mockParams);
    await handlers.processImageFiles([mockFile]);
    expect(mockAddImageToLibrary).not.toHaveBeenCalled();
  });

  // More tests...
});
```

### Step 3: Extract AI Handlers Hook

1. Create `src/editor/components/toolbar/useToolbarAIHandlers.ts`
2. Copy lines 613-1355 from Toolbar.tsx
3. Convert to hook with proper parameters and return type
4. Add JSDoc comments
5. Write unit tests

**Implementation Checklist:**
- [ ] Create hook file
- [ ] Define TypeScript interfaces
- [ ] Extract handleGenerateImage function
- [ ] Extract applyFunctionCall function
- [ ] Extract handleRefine function
- [ ] Extract handleRegenerate function
- [ ] Add error handling
- [ ] Add JSDoc documentation
- [ ] Write unit tests
- [ ] Update Toolbar.tsx to use hook

### Step 4: Extract Effects Hook

1. Create `src/editor/components/toolbar/useToolbarEffects.ts`
2. Move all useEffect calls into this hook
3. Ensure proper cleanup
4. Add JSDoc comments

**Implementation Checklist:**
- [ ] Create hook file
- [ ] Move align menu click-outside effect
- [ ] Move background modal refresh effect
- [ ] Move refine conversation load effect
- [ ] Add proper cleanup functions
- [ ] Add JSDoc documentation
- [ ] Update Toolbar.tsx to use hook

### Step 5: Extract Modal Controllers

1. Create `ImageModalController.tsx`
2. Create `RefinePanelController.tsx`
3. Move related state and handlers
4. Update Toolbar.tsx to use controllers

**Implementation Checklist:**
- [ ] Create ImageModalController component
- [ ] Move ImageBackgroundModal state
- [ ] Implement render props pattern for trigger
- [ ] Create RefinePanelController component
- [ ] Move RefinePanel state
- [ ] Update Toolbar.tsx
- [ ] Test modal open/close
- [ ] Test modal interactions

### Step 6: Extract Section Components

For each section:

1. Create component file
2. Define prop interface
3. Extract JSX from Toolbar.tsx
4. Convert to self-contained component
5. Update Toolbar.tsx to use component
6. Test rendering and interactions

**Implementation Checklist:**
- [ ] Create ToolbarInsertSection
- [ ] Create ToolbarFormatSection
- [ ] Create ToolbarLayoutSection
- [ ] Create ToolbarLayerSection
- [ ] Create ToolbarViewSection
- [ ] Update Toolbar.tsx to compose sections
- [ ] Test all section interactions

### Step 7: Update Toolbar.tsx

1. Import new hooks and components
2. Replace extracted code with hook calls
3. Compose section components
4. Verify all functionality works
5. Remove unused imports and code

### Step 8: Extract PropertiesPanel (Optional)

Follow similar pattern as Toolbar.tsx:

1. Create properties directory
2. Extract property-type-specific components
3. Create shared hooks
4. Update PropertiesPanel to route to components

---

## Testing Strategy

### Unit Tests

**Custom Hooks:**
```typescript
// useToolbarImageHandlers.test.ts
describe('useToolbarImageHandlers', () => {
  it('should compress large images');
  it('should add images to library');
  it('should handle upload errors');
  it('should support background and element modes');
});

// useToolbarAIHandlers.test.ts
describe('useToolbarAIHandlers', () => {
  it('should generate images with OpenAI');
  it('should generate images with Flux');
  it('should apply function calls');
  it('should handle refine requests');
  it('should handle regeneration');
});
```

**Section Components:**
```typescript
// ToolbarInsertSection.test.tsx
describe('ToolbarInsertSection', () => {
  it('should render all insert buttons');
  it('should call onInsertText when text button clicked');
  it('should call onInsertImage when image button clicked');
  it('should call onInsertShape when shape button clicked');
});
```

### Integration Tests

**Toolbar Integration:**
```typescript
describe('Toolbar Integration', () => {
  it('should compose all sections correctly');
  it('should handle image upload flow end-to-end');
  it('should handle AI generation flow end-to-end');
  it('should maintain toolbar state across re-renders');
});
```

### Manual Testing Checklist

- [ ] Can insert text elements
- [ ] Can insert image elements
- [ ] Can insert shape elements
- [ ] Can format text (bold, italic, alignment)
- [ ] Can group/ungroup elements
- [ ] Can align elements
- [ ] Can reorder layers
- [ ] Can toggle grid
- [ ] Can toggle timeline
- [ ] Can upload images
- [ ] Can generate AI images
- [ ] Can refine slides with AI
- [ ] Can regenerate presentation
- [ ] Modal controllers work correctly
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] No hydration errors

---

## Success Criteria

### Code Metrics

**Before:**
- Toolbar.tsx: 1,904 lines
- PropertiesPanel.tsx: 1,590 lines
- Total: 3,494 lines

**After (Target):**
- Toolbar.tsx: ~350 lines (-82%)
- useToolbarImageHandlers.ts: ~500 lines (new)
- useToolbarAIHandlers.ts: ~800 lines (new)
- useToolbarEffects.ts: ~100 lines (new)
- Modal Controllers: ~300 lines (new)
- Section Components: ~500 lines (new)
- PropertiesPanel.tsx: ~300 lines (-81%)
- Property Components: ~1,300 lines (new)
- Total: 4,150 lines (+656 lines)

**Note:** Total lines increase due to:
- Additional interfaces and type definitions
- Separation boundaries (imports, exports)
- JSDoc documentation
- Better code organization

**But maintainability increases dramatically.**

### Quality Metrics

- [ ] No file exceeds 500 lines
- [ ] All custom hooks have unit tests
- [ ] All components have unit tests
- [ ] Test coverage ≥ 80%
- [ ] Zero TypeScript errors
- [ ] Zero ESLint warnings
- [ ] Follows CLAUDE.md guidelines
- [ ] All functionality preserved
- [ ] Performance maintained or improved

### Documentation

- [ ] All hooks have JSDoc comments
- [ ] All components have JSDoc comments
- [ ] All interfaces documented
- [ ] README updated with new structure
- [ ] Migration guide written

---

## Migration Guide (for future implementer)

### Before You Start

1. **Create a feature branch** from main:
   ```bash
   git checkout -b feat/phase-b-toolbar-refactor
   ```

2. **Ensure Phase A is merged** - This work builds on Phase A

3. **Review CLAUDE.md** - Understand project conventions

4. **Set up testing** - Ensure test suite runs

### Implementation Order

**Week 1: Hooks**
- Day 1-2: useToolbarImageHandlers
- Day 3-4: useToolbarAIHandlers
- Day 5: useToolbarEffects + testing

**Week 2: Controllers & Tests**
- Day 1-2: Modal controllers
- Day 3-5: Testing and bug fixes

**Week 3: Sections & Integration**
- Day 1-3: Section components
- Day 4-5: Integration testing and documentation

### Commit Strategy

Make small, focused commits:

```bash
git commit -m "refactor: extract image handlers to custom hook"
git commit -m "refactor: extract AI handlers to custom hook"
git commit -m "refactor: extract effects to custom hook"
git commit -m "refactor: create ImageModalController"
git commit -m "refactor: create RefinePanelController"
git commit -m "refactor: extract toolbar section components"
git commit -m "docs: update README with new Toolbar structure"
```

### If You Get Stuck

1. **Reference Phase A commits** - See patterns used
2. **Check this spec** - Detailed examples provided
3. **Test incrementally** - Don't extract everything at once
4. **Keep functionality working** - Extract then verify
5. **Ask for review** - Don't hesitate to get feedback

---

## References

### Related Files

- `src/editor/components/Toolbar.tsx` - Main file to refactor
- `src/editor/components/PropertiesPanel.tsx` - Secondary target
- `src/editor/hooks/useEditor.ts` - Editor state hook pattern
- `app/editor/[deckId]/_components/` - Phase A examples

### Related Documentation

- Project's `CLAUDE.md` - Development guidelines
- `docs/NEW-DOCUMENT-FORMAT-CRDTs.md` - CRDT implementation
- React Hooks documentation
- Next.js App Router documentation

### Phase A Commits (Examples)

- `e332293` - Global React type declarations
- `7cd7a42` - Decompose page.tsx into components
- `c8987d7` - Push "use client" to leaf components
- `2a7ffdc` - Server-side data loading with Suspense

Study these commits to understand the refactoring patterns used.

---

## Appendix: Code Examples

### A. Custom Hook Pattern

```typescript
// useToolbarImageHandlers.ts
import { useCallback } from 'react';

export function useToolbarImageHandlers(params: Params): Return {
  // Extract dependencies
  const { editor, addImageToLibrary, setStatus } = params;

  // Define handlers with useCallback for stability
  const processImageFiles = useCallback((files: File[]) => {
    files.forEach((file) => {
      // Processing logic here
    });
  }, [editor, addImageToLibrary]);

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processImageFiles(files);
  }, [processImageFiles]);

  return {
    processImageFiles,
    handleUpload,
  };
}
```

### B. Modal Controller Pattern

```typescript
// ImageModalController.tsx
interface Props {
  trigger: (props: TriggerProps) => React.ReactNode;
  onGenerate: (params: GenerateParams) => Promise<void>;
}

export function ImageModalController({ trigger, onGenerate }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>({ /* ... */ });

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setStatus({ isGenerating: false, error: null });
  };

  return (
    <>
      {trigger({ onClick: handleOpen })}
      {open && (
        <ImageBackgroundModal
          open={open}
          onClose={handleClose}
          onGenerate={onGenerate}
          status={status}
        />
      )}
    </>
  );
}
```

### C. Section Component Pattern

```typescript
// ToolbarInsertSection.tsx
interface Props {
  activeSlideId: string | null;
  onInsertText: () => void;
  onInsertImage: () => void;
  onInsertShape: (type: ShapeType) => void;
}

export function ToolbarInsertSection(props: Props) {
  const { activeSlideId, onInsertText, onInsertImage, onInsertShape } = props;

  const disabled = !activeSlideId;

  return (
    <div className="flex items-center gap-1 border-r pr-2">
      <ToolbarButton
        onClick={onInsertText}
        disabled={disabled}
        title="Add Text (T)"
      >
        <TextIcon />
      </ToolbarButton>

      <ToolbarButton
        onClick={onInsertImage}
        disabled={disabled}
        title="Add Image (I)"
      >
        <ImageIcon />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => onInsertShape('rect')}
        disabled={disabled}
        title="Add Rectangle (R)"
      >
        <RectIcon />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => onInsertShape('ellipse')}
        disabled={disabled}
        title="Add Circle (C)"
      >
        <CircleIcon />
      </ToolbarButton>
    </div>
  );
}
```

---

## Questions & Answers

**Q: Why not refactor Toolbar and PropertiesPanel at the same time?**
A: They're independent. Focus on Toolbar first (higher complexity). PropertiesPanel can be Phase C if needed.

**Q: What if I break functionality during extraction?**
A: Extract incrementally. Test after each extraction. Keep commits small. Easy to revert if needed.

**Q: Should I refactor the extracted code while moving it?**
A: No. Move first, then refactor. Don't mix concerns. Easier to review and debug.

**Q: How do I handle the massive applyFunctionCall switch statement?**
A: Consider a function registry pattern or keep as-is initially. That's a separate refactor.

**Q: What about performance?**
A: Custom hooks and components have negligible overhead. Proper memoization prevents re-renders.

**Q: Do all tests need to be written during extraction?**
A: Write tests for custom hooks immediately. Component tests can come after. Integration tests last.

---

## Conclusion

Phase B is a significant but manageable refactoring effort that will dramatically improve the maintainability of the editor codebase. By following this specification incrementally and testing thoroughly, the Toolbar and PropertiesPanel will transform from monolithic components into well-organized, testable, maintainable modules.

The estimated 2-3 week timeline assumes dedicated focus. It can be done faster with parallel work or slower if done part-time.

**Good luck, and happy refactoring!** 🚀
