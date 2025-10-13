# Presentation Framework Extraction - Summary

## Overview

Successfully extracted the presentation framework from `jsconf-2025/keynote-presentation` into a reusable, standalone presentation engine with the JSConf 2025 content as a separate loadable package.

## New Structure

```
presentations/
├── presentation-framework/        # Reusable presentation engine
│   ├── src/
│   │   ├── components/           # PresenterView component
│   │   ├── hooks/                # usePresentation, useKeyboardNavigation, useWindowSync
│   │   ├── styles/               # Core presentation styles
│   │   ├── Presentation.jsx      # Main presentation wrapper component
│   │   ├── index.js              # Framework exports
│   │   └── main.jsx              # Standalone framework entry point
│   ├── package.json
│   └── README.md
│
├── jsconf-2025-content/          # Content package for JSConf 2025
│   ├── src/
│   │   ├── assets/               # Logos, images, partner assets
│   │   ├── components/           # PartnersSlide (content-specific)
│   │   ├── slides/               # All 20 slides with content & notes
│   │   ├── styles/               # Custom JSConf styles
│   │   ├── App.jsx               # Presentation loader
│   │   └── main.jsx              # Entry point
│   ├── package.json
│   └── README.md
│
└── jsconf-2025/                  # Original (preserved as reference)
    └── keynote-presentation/
```

## What Was Extracted

### Framework Components (`presentation-framework/`)

1. **Core Hooks**
   - `usePresentation.js` - Slide navigation, progress, URL state management
   - `useKeyboardNavigation.js` - Keyboard shortcuts (arrows, space, home/end, numbers)
   - `useWindowSync.js` - BroadcastChannel sync between main and presenter windows

2. **Components**
   - `PresenterView.jsx` - Full presenter mode with notes, previews, thumbnails
   - `Presentation.jsx` - Main presentation wrapper with configuration support

3. **Styles**
   - `Presentation.css` - Core presentation styles (slides, navigation, progress bar)
   - `PresenterView.css` - Presenter mode styles

4. **Features**
   - React 19 experimental with View Transitions API
   - URL-based slide navigation
   - Progress bar
   - Configurable brand logos
   - Custom navigation renderers
   - Slide number customization

### Content Package (`jsconf-2025-content/`)

1. **Slides**
   - All 20 slides from the original presentation
   - Complete speaker notes
   - Custom gradient backgrounds per slide

2. **Custom Components**
   - `PartnersSlide.jsx` - Animated partner logo grid with community reveal

3. **Assets**
   - React logo
   - Partner logos (Meta, Microsoft, Amazon, Expo, Vercel, Callstack, Software Mansion)

4. **Custom Styles**
   - Slide-specific gradients and animations
   - Partner logo animations
   - Social media icons
   - Brand-specific filters

## Key Features Preserved

✅ All 20 slides with original content and speaker notes
✅ Presenter View with notes, current/next preview, thumbnails
✅ Window synchronization via BroadcastChannel
✅ Keyboard navigation (arrows, space, home/end, 1-9)
✅ Progress bar
✅ URL-based slide navigation
✅ View Transitions API animations
✅ React 19 experimental features
✅ Partner logo grid with staggered animations
✅ Custom gradient backgrounds per slide
✅ Social media handles with icons
✅ Brand logo positioning and transitions

## How to Use

### Running the Framework Standalone

```bash
cd presentation-framework
npm install
npm run dev
```

Displays a placeholder screen explaining the framework is ready to load presentations.

### Running the JSConf 2025 Presentation

```bash
cd jsconf-2025-content
npm install
npm run dev
```

Runs the full JSConf 2025 presentation with all features.

### Creating New Presentations

1. Create a new directory (e.g., `my-presentation-content/`)
2. Create slides in JSX format
3. Import `Presentation` component from `../presentation-framework/src/Presentation.jsx`
4. Pass slides and config to the component
5. Add custom styles as needed

Example:

```jsx
import { Presentation } from '../presentation-framework/src/Presentation.jsx';
import '../presentation-framework/src/index.css';
import './custom-styles.css';

const slides = [
  {
    id: 'intro',
    className: 'slide-intro',
    notes: 'Introduction notes...',
    content: <h1>Hello World</h1>
  },
  // More slides...
];

function App() {
  return <Presentation slides={slides} />;
}
```

## Framework API

### Presentation Component Props

```javascript
<Presentation
  slides={Array}        // Required: array of slide objects
  config={{
    brandLogo: Component,              // Optional: brand logo component
    renderSlideNumber: () => JSX,      // Optional: custom slide number
    renderNavigation: () => JSX,       // Optional: custom navigation
  }}
/>
```

### Slide Object Format

```javascript
{
  id: string,              // Required: unique identifier
  className: string,       // Optional: CSS class for styling
  notes: string,           // Optional: speaker notes
  hideBrandLogo: boolean,  // Optional: hide brand logo on this slide
  content: JSX             // Required: slide content
}
```

## Dependencies

Both packages use:
- React 19 experimental (`0.0.0-experimental-ead92181-20251010`)
- React DOM 19 experimental
- Vite 7.1.7
- ESLint with React plugins

## Testing Status

✅ Framework installs successfully
✅ Content package installs successfully
✅ Dev server runs without errors
✅ All original features preserved
✅ File structure is clean and organized

## Notes

- The original `jsconf-2025/keynote-presentation` remains untouched as a reference
- Both new packages are independent and can be moved/deployed separately
- The framework can be published as an npm package for easier reuse
- Content packages reference the framework via relative paths (can be updated to use npm package once published)
