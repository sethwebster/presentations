# LUDS — Lume UI Design System (v1.0)

A modern, elegant, and accessible design system for Lume, the web-first presentation app. Built for React/Next.js, Tailwind 4, shadcn/ui, and Radix Primitives.

## 0. Brand Essence

- **Keywords:** elegant, airy, confident, glassy, calm energy, precision, future-friendly, delightful.
- **Visual DNA:** soft glass surfaces with high-contrast ink on quartz, subtle light blooms, caustic highlights, refined depth layers, crisp typography, micro-motion.
- **Voice & Tone:** direct, empowering, helpful. No jargon. Labels are short verbs and nouns.

## 1. Design Principles

- Clarity first: content dominates chrome. Sparse borders; rely on spacing, elevation, and contrast.
- Graceful depth: layered glass surfaces with restrained shadows; never muddy or heavy.
- Touch-ready: 44×44 px minimum target sizes; tactile toggles and sliders.
- Accessible by default: WCAG AA/AAA text contrast; impeccable focus rings; full keyboard reach.
- Motion with meaning: 120–220 ms for UI; spring for selection/drag; no gratuitous bounces.
- Composable: every piece is a slot; minimal bespoke CSS beyond tokens.

## 2. Design Tokens

Use CSS variables as the single source of truth. Tailwind consumes these via `theme.extend`.

### Base Variables

```css
:root {
  /* Elevation / Surfaces */
  --luds-bg:           0 0% 100%;          /* Quartz */
  --luds-bg-elev-1:    0 0% 100% / 0.72;   /* Glass 1 */
  --luds-bg-elev-2:    0 0% 100% / 0.56;   /* Glass 2 */
  --luds-panel:        220 14% 96%;        /* Mist */
  --luds-canvas:       220 16% 10%;        /* Stage (dark canvas) */

  /* Ink / Text */
  --luds-ink:          222 47% 11%;        /* Near-black */
  --luds-ink-mute:     222 10% 40%;
  --luds-ink-subtle:   222 6% 55%;
  --luds-border:       220 13% 90%;
  --luds-outline:      217 92% 60%;        /* Focus ring */

  /* Brand Accents */
  --luds-primary:      206 94% 52%;        /* Azure */
  --luds-primary-ink:  210 40% 98%;
  --luds-secondary:    267 90% 58%;        /* Helio */
  --luds-success:      160 84% 40%;
  --luds-warning:      43  96% 56%;
  --luds-danger:       0   84% 58%;

  /* Radii / Spacing */
  --radius-xs: 8px;
  --radius-sm: 12px;
  --radius-md: 16px;   /* default */
  --radius-lg: 20px;
  --radius-xl: 28px;

  /* Shadows (use sparingly) */
  --shadow-1: 0 1px 2px hsl(222 47% 11% / 0.04), 0 2px 8px hsl(222 47% 11% / 0.06);
  --shadow-2: 0 6px 24px hsl(222 47% 11% / 0.10), 0 2px 8px hsl(222 47% 11% / 0.06);
  --shadow-3: 0 24px 64px hsl(222 47% 11% / 0.18);

  /* Motion */
  --easing-standard: cubic-bezier(.2, .7, .2, 1);
  --easing-emphasized: cubic-bezier(.2, .9, .2, 1);
  --dur-fast: 120ms;
  --dur-base: 180ms;
  --dur-slow: 240ms;
}
```

### Dark Theme Overrides

```css
.dark {
  --luds-bg:           220 16% 8%;
  --luds-bg-elev-1:    220 16% 8% / 0.64;
  --luds-bg-elev-2:    220 16% 8% / 0.44;
  --luds-panel:        220 14% 12%;
  --luds-canvas:       220 14% 6%;

  --luds-ink:          0 0% 100%;
  --luds-ink-mute:     220 10% 75%;
  --luds-ink-subtle:   220 10% 65%;
  --luds-border:       220 12% 20%;
  --luds-outline:      206 94% 62%;

  --luds-primary:      206 92% 58%;
  --luds-primary-ink:  220 16% 8%;
}
```

### Typography

- **Display:** SF Pro Display → Inter → system-ui.
- **Text:** SF Pro Text → Inter → system-ui.
- **Mono:** SF Mono → ui-monospace → Menlo.

#### Type Scale (rem)

`9xl 6.0`, `7xl 4.0`, `5xl 3.0`, `3xl 2.25`, `2xl 1.75`, `xl 1.375`, `lg 1.125`, `base 1.0`, `sm 0.925`, `xs 0.85`.

- **Line-height:** 1.2 display, 1.35 body, 1.1 controls.

#### Spacing Scale (px)

`4, 8, 12, 16, 20, 24, 32, 40, 56, 72`.

#### Interactive Minimums

- Touch targets ≥ 44×44.
- Gaps ≥ 8.
- Drag handles ≥ 12.

## 3. Tailwind & shadcn Setup

### Tailwind Config

```ts
// tailwind.config.ts
export default {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: "hsl(var(--luds-bg))" },
        panel: { DEFAULT: "hsl(var(--luds-panel))" },
        canvas: { DEFAULT: "hsl(var(--luds-canvas))" },
        ink: {
          DEFAULT: "hsl(var(--luds-ink))",
          mute: "hsl(var(--luds-ink-mute))",
          subtle: "hsl(var(--luds-ink-subtle))",
        },
        border: "hsl(var(--luds-border))",
        primary: {
          DEFAULT: "hsl(var(--luds-primary))",
          foreground: "hsl(var(--luds-primary-ink))",
        },
        success: "hsl(var(--luds-success))",
        warning: "hsl(var(--luds-warning))",
        danger: "hsl(var(--luds-danger))",
      },
      borderRadius: {
        DEFAULT: "var(--radius-md)",
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        soft: "var(--shadow-1)",
        float: "var(--shadow-2)",
        lifted: "var(--shadow-3)",
      },
      backdropBlur: { xs: "4px", sm: "8px", md: "12px" },
      transitionTimingFunction: {
        standard: "var(--easing-standard)",
        emphasized: "var(--easing-emphasized)",
      },
      transitionDuration: {
        fast: "var(--dur-fast)",
        base: "var(--dur-base)",
        slow: "var(--dur-slow)",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

### shadcn/ui Theme Map

- `primary` → `--luds-primary`
- `secondary` → subtly tinted glass (`--luds-bg-elev-1`) with `ink.mute` text
- `muted` → `--luds-panel`
- `accent` → gradient edge (see gradients)
- `destructive` → `--luds-danger`

## 4. Color, Gradients & Glass

- **Glass surfaces:** `bg-white/60` `dark:bg-white/8` `backdrop-blur-sm` `border border-white/40` `dark:border-white/10` `shadow-soft` on light; tune opacity by elevation.
- **Brand gradients:** `linear-gradient(135deg, hsl(206 94% 52%) 0%, hsl(267 90% 58%) 100%)`.
- **Aurora edge:** `border-image: linear-gradient(90deg, transparent, hsl(206 94% 52%/.6), transparent) 1`.
- **Contrast rules:** Body text ≥ 4.5:1; UI icons/labels ≥ 3:1; over imagery use gradient scrims (`from-black/60`) at bottom.

## 5. Layout System

- **App shell:** Header 56 px, glass, sticky with subtle blur.
- **Navigator sidebar:** 288 px (collapsible to 88 px) with scroll-shadow.
- **Inspector panel:** 360–420 px, resizable; snap at 320 / 380 / 420.
- **Stage:** Fills remainder; color = canvas with subtle vignette.

### Rulers & Grid

- Rulers use 12 px ticks; major every 10.
- Snap grid 8 px; optional 4 px subgrid; visible on `⌘'`.

## 6. Core Components

Patterns use Radix primitives, shadcn/ui, and Tailwind tokens.

### Buttons

- **Primary:** Filled, high contrast; use for confirm actions.
- **Quiet:** Glass/tinted with `hover:bg-white/70` `dark:hover:bg-white/10`.
- **Tonal:** Panel-tint fill; use in inspectors.
- **Focus ring:** `outline-2 outline-offset-2 outline-[hsl(var(--luds-outline))]`.

Example:

```tsx
<Button className="h-10 px-4 rounded-lg shadow-soft data-[state=open]:shadow-float">
  Save
</Button>
```

### Icon Button

- 44×44; 12 px corner radius.
- Center icon 20–22 px.
- Tooltip required.

### Segmented Control / Toggle Group

- Rounded container (`radius-lg`), 2 px glass border, active pill with soft glow.

### Toolbar

- Floating glass bar with scrollable region.
- Divider: gradient fade via `after:h-px`.

### Panels (Navigator / Inspector)

- Header: 44 px, medium-weight label.
- Section: accordion with chevron; dense grid (8 px gutters); inputs tonal.

### Color Picker

- Large swatch, hue/sat canvas with radial cursor.
- Numeric inputs, brand swatches, contrast meter.

### Layer List

- Dense, 36 px rows.
- Thumbnail + name + visibility/lock.
- Drag handles appear on hover; subtle zebra striping.

### Properties: Layout Block

- Smart groups: Position, Size, Alignment, Opacity, Blend, Shadow, Corner Radius, Mask.

### Dialogs & Sheets

- Centered glass with `backdrop-blur-md`.
- Scrim `bg-black/60`; Escape and `⌘W` close.

### Command Palette (`⌘K`)

- 720 px wide, large 18 px input, pinned actions, fuzzy search, `kbd` hints on right.

Example:

```tsx
<Command className="w-[720px] rounded-2xl bg-white/80 dark:bg-white/10 backdrop-blur-md shadow-lifted border border-white/40 dark:border-white/10">
  <CommandInput placeholder="Type a command or search…" className="text-lg py-4" />
  <CommandList>
    <CommandEmpty>No results.</CommandEmpty>
    <CommandGroup heading="Slides">
      <CommandItem>New slide</CommandItem>
      <CommandItem>Duplicate</CommandItem>
    </CommandGroup>
  </CommandList>
</Command>
```

### Toasts

- Bottom-right stack; glass; icon + title + optional action.
- Auto dismiss 4 s (success); sticky for errors.

### Reactions & Q&A Overlay

- Particle burst for reactions; refined confetti.
- Q&A docked panel with threaded answers; presenter pin.

### Remote Controls

- Mini floating panel with Prev/Next, Laser, Pointer, Reactions, Timer.
- Haptics on mobile.

## 7. Selection & Canvas

### Selection Handles

- Eight handles (size 10, hit 14).
- Hover grows to 12.
- Keyboard nudges with arrow keys (1 px) / Shift (10 px).

### Bounds

- Blue glow `ring-2 ring-[hsl(var(--luds-primary))] ring-offset-2 ring-offset-transparent`.

### Guides

- Smart guides in primary with 60% opacity.
- Snap animation 120 ms spring.

### Rulers

- Glass inset ruler with ticks and numeric markers.
- `⌘R` toggles.

### Zoom

- Zoom pill at bottom right.
- Fit/Fill options; smooth 180 ms zoom with inertial pan.

## 8. Motion System

### Durations

- Enter: 180 ms.
- Exit: 150 ms.
- Emphasized: 220 ms.

### Easings

- Standard: `var(--easing-standard)`.
- Emphasized for primary CTAs.

### Springs (framer-motion)

- Selection snap: `{ type: "spring", stiffness: 420, damping: 36, mass: 0.6 }`.
- Drag: `{ type: "spring", stiffness: 520, damping: 44, mass: 0.8 }`.

### Micro-interactions

- Hover lift `translate-y-[-1px]` `shadow-float` (80 ms).
- Pressed compress `scale-[.985]`.

### Reduced Motion

- Respect `prefers-reduced-motion`; swap to fades.

## 9. Accessibility

- All controls keyboard reachable in logical order.
- Focus style always visible (never `outline: none`).
- Color contrast: test tokens for AA/AAA; provide High Contrast Mode variant (ink → pure white/black).
- Provide text alternatives for canvases (labels, ARIA live for announcements).
- Animations are decorative unless the user toggles "Expressive" mode.

## 10. Iconography

- Based on `lucide-react` (1.5 px stroke) plus bespoke set (Laser, Pointer, Slide, Grid, Snap, Align, Arrange, Magic, React, Remote).
- Corner rounding matches `radius-sm` for filled shapes.

## 11. Example Patterns

### Floating Toolbar

```tsx
export function FloatingToolbar() {
  return (
    <div className="pointer-events-auto fixed left-1/2 top-6 -translate-x-1/2 backdrop-blur-sm bg-white/70 dark:bg-white/10 border border-white/40 dark:border-white/10 shadow-soft rounded-xl px-2 py-1 flex gap-1">
      <IconButton tooltip="Select" icon={Pointer} />
      <IconButton tooltip="Text" icon={Type} />
      <IconButton tooltip="Shape" icon={Square} />
      <Divider />
      <IconButton tooltip="Magic" icon={Wand2} className="data-[active=true]:bg-primary/10 data-[active=true]:ring-1 data-[active=true]:ring-primary" />
      <Divider />
      <ZoomPill />
    </div>
  );
}
```

### Inspector Section

```tsx
function Section({ title, children }) {
  return (
    <div className="rounded-xl bg-panel/60 border border-white/40 dark:border-white/10 p-3 shadow-soft">
      <div className="text-ink/80 font-medium mb-2 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" /> {title}
      </div>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}
```

## 12. Present Mode

- Cinematic chrome: black glass header with timer and controls.
- Audience reactions as ambient particles above footer line.
- Remote link QR, latency indicator, live caption toggle.
- Question dock with upvote; presenter pin; answers appear as lower-third banners.

## 13. Theming Variants

- **Light (Quartz):** default for authoring.
- **Dark (Nebula):** default for presenting.
- **High Contrast:** togglable; pure surfaces; thicker outlines.
- **Studio:** saturated accent edges for marketing shots (not default in product).

## 14. States & Feedback

- **Hover:** lift + 2% tint.
- **Active:** press + inset shadow.
- **Selected:** 2 px brand ring.
- **Disabled:** 48% opacity + no shadow.
- **Loading:** progress dots or linear bar with subtle aurora gradient.

## 15. Empty States & Illustrations

- Gentle 3D glass orbs and ribbons (subtle caustics) with short friendly copy.
- Use two-tone `ink.mute` + brand accent; respect dark mode.

## 16. Writing Guidelines

- **Buttons:** action-forward ("Add slide", "Generate image").
- **Hints:** concise; avoid exclamation marks.
- **Tooltips:** verb + noun; no punctuation.

## 17. Quality Bar (Apple Design Award Readiness)

- Pixel-perfect spacing; avoid sub-pixel rounding with even numbers.
- Blur layers capped at `backdrop-blur-sm|md` to keep crispness.
- Always ship high-fidelity focus visuals and keyboard docs.
- Motion tuned for 120 Hz; no layout jank during canvas zoom.

## 18. Roadmap (Next)

- Token Studio integration and Figma variables.
- Snapshot tests for visual regressions (Chromatic/Storybook).
- Dark canvas color management for color-accurate export.
- Haptics in mobile remote; sound design (subtle ticks).

## 19. Visual Samples Checklist

- Authoring shell (light) with floating toolbar.
- Inspector detail with color picker and grid.
- Present mode (dark) with reactions and Q&A.
- Command-K plus quick actions.
- High-contrast theme sample.

_End of v1.0._
