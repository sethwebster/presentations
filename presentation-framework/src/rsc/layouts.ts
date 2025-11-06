import type { ElementDefinition, Bounds } from './types';

/**
 * Layout system for automatic, constraint-based positioning
 * Ensures content always looks polished without manual pixel positioning
 */

const CANVAS = { width: 1280, height: 720 };
const MARGIN = { x: 100, y: 80 };
const CONTENT_AREA = {
  x: MARGIN.x,
  y: MARGIN.y,
  width: CANVAS.width - MARGIN.x * 2,
  height: CANVAS.height - MARGIN.y * 2,
};

export interface LayoutSlot {
  id: string;
  bounds: Bounds;
}

/**
 * Title layout: Large centered title with optional subtitle
 */
export function titleLayout(): {
  title: LayoutSlot;
  subtitle: LayoutSlot;
  body: LayoutSlot;
  footer: LayoutSlot;
} {
  return {
    title: {
      id: 'title-slot',
      bounds: { x: MARGIN.x, y: 200, width: CONTENT_AREA.width, height: 100 },
    },
    subtitle: {
      id: 'subtitle-slot',
      bounds: { x: MARGIN.x, y: 320, width: CONTENT_AREA.width, height: 60 },
    },
    body: {
      id: 'body-slot',
      bounds: { x: MARGIN.x, y: 400, width: CONTENT_AREA.width, height: 80 },
    },
    footer: {
      id: 'footer-slot',
      bounds: { x: MARGIN.x, y: 550, width: CONTENT_AREA.width, height: 60 },
    },
  };
}

/**
 * Two-column layout: Split content with gap
 */
export function twoColumnLayout(options?: { gap?: number; leftWidth?: number }): {
  left: LayoutSlot;
  right: LayoutSlot;
  header: LayoutSlot;
} {
  const gap = options?.gap ?? 40;
  const leftWidthPercent = options?.leftWidth ?? 0.45;
  const leftWidth = CONTENT_AREA.width * leftWidthPercent;
  const rightWidth = CONTENT_AREA.width - leftWidth - gap;

  return {
    header: {
      id: 'header-slot',
      bounds: { x: MARGIN.x, y: MARGIN.y, width: CONTENT_AREA.width, height: 140 },
    },
    left: {
      id: 'left-slot',
      bounds: { x: MARGIN.x, y: MARGIN.y + 160, width: leftWidth, height: CONTENT_AREA.height - 160 },
    },
    right: {
      id: 'right-slot',
      bounds: { x: MARGIN.x + leftWidth + gap, y: MARGIN.y + 160, width: rightWidth, height: CONTENT_AREA.height - 160 },
    },
  };
}

/**
 * Grid layout: Auto-distribute items in grid
 */
export function gridLayout(rows: number, cols: number, options?: { gap?: number; headerHeight?: number }): {
  header: LayoutSlot;
  cells: LayoutSlot[][];
} {
  const gap = options?.gap ?? 30;
  const headerHeight = options?.headerHeight ?? 140;
  const gridArea = {
    x: MARGIN.x,
    y: MARGIN.y + headerHeight,
    width: CONTENT_AREA.width,
    height: CONTENT_AREA.height - headerHeight,
  };

  const cellWidth = (gridArea.width - gap * (cols - 1)) / cols;
  const cellHeight = (gridArea.height - gap * (rows - 1)) / rows;

  const cells: LayoutSlot[][] = [];
  for (let row = 0; row < rows; row++) {
    cells[row] = [];
    for (let col = 0; col < cols; col++) {
      cells[row][col] = {
        id: `cell-${row}-${col}`,
        bounds: {
          x: gridArea.x + col * (cellWidth + gap),
          y: gridArea.y + row * (cellHeight + gap),
          width: cellWidth,
          height: cellHeight,
        },
      };
    }
  }

  return {
    header: {
      id: 'header-slot',
      bounds: { x: MARGIN.x, y: MARGIN.y, width: CONTENT_AREA.width, height: headerHeight },
    },
    cells,
  };
}

/**
 * Full bleed layout: Single content area filling entire canvas with padding
 */
export function fullBleedLayout(padding?: number): {
  content: LayoutSlot;
} {
  const p = padding ?? 60;
  return {
    content: {
      id: 'content-slot',
      bounds: { x: p, y: p, width: CANVAS.width - p * 2, height: CANVAS.height - p * 2 },
    },
  };
}

/**
 * Header + content layout: Title area + flexible content
 */
export function headerContentLayout(headerHeight?: number): {
  header: LayoutSlot;
  content: LayoutSlot;
} {
  const h = headerHeight ?? 140;
  return {
    header: {
      id: 'header-slot',
      bounds: { x: MARGIN.x, y: MARGIN.y, width: CONTENT_AREA.width, height: h },
    },
    content: {
      id: 'content-slot',
      bounds: { x: MARGIN.x, y: MARGIN.y + h + 20, width: CONTENT_AREA.width, height: CONTENT_AREA.height - h - 20 },
    },
  };
}
