# JSConf 2025 - React Foundation Keynote Presentation

An elegant, full-screen keynote-style presentation built with React 19 featuring the View Transitions API and a professional presenter mode.

## Features

- **React 19 with View Transitions API**: Smooth, elegant transitions between slides using the native browser View Transitions API
- **Presenter View**: Professional presenter mode with speaker notes, current slide, next slide preview, and slide thumbnails
- **Window Synchronization**: Main presentation and presenter view stay in sync using BroadcastChannel API
- **Keyboard Navigation**: Full keyboard support for seamless presentation delivery
- **Beautiful Design**: 20 unique slides with custom gradient backgrounds and elegant typography
- **Responsive Controls**: On-screen navigation buttons for mouse/touch control

## Getting Started

### Installation

```bash
npm install
```

### Running the Presentation

```bash
npm run dev
```

The presentation will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
npm run preview
```

## Usage

### Navigation

**Keyboard Controls:**
- `Arrow Right` / `Space` / `Page Down`: Next slide
- `Arrow Left` / `Page Up`: Previous slide
- `Home`: Jump to first slide
- `End`: Jump to last slide
- `1-9`: Jump to specific slide number

**On-Screen Controls:**
- Click "Previous" or "Next" buttons
- Click "Presenter View" to open presenter mode

### Presenter Mode

1. Click the "Presenter View" button in the main presentation
2. A new window will open with:
   - Large preview of current slide
   - Speaker notes for the current slide
   - Preview of the next slide
   - Thumbnail grid of all slides
3. Both windows stay synchronized - navigate in either window and both will update

## Project Structure

```
src/
├── components/
│   └── PresenterView.jsx    # Presenter mode component
├── hooks/
│   ├── usePresentation.js    # Presentation state and navigation
│   ├── useKeyboardNavigation.js  # Keyboard controls
│   └── useWindowSync.js      # Window synchronization
├── styles/
│   └── PresenterView.css     # Presenter view styling
├── slides.jsx                # Slide content and notes
├── App.jsx                   # Main application component
├── App.css                   # Main styling
└── index.css                 # Global styles
```

## Technology Stack

- **React 19**: Latest version with improved performance
- **Vite**: Fast build tool and dev server
- **View Transitions API**: Native browser transitions
- **BroadcastChannel API**: Cross-window communication
- **CSS Gradients**: Beautiful slide backgrounds

## Customization

### Adding/Editing Slides

Edit `src/slides.jsx` to add or modify slides. Each slide object contains:

```javascript
{
  id: 'slide-id',
  className: 'slide-custom-class',
  notes: 'Speaker notes for this slide',
  content: (
    <>
      <h1>Slide Title</h1>
      <p>Slide content...</p>
    </>
  )
}
```

### Styling

- Slide-specific styles: `src/App.css` (look for `.slide-*` classes)
- Presenter view styles: `src/styles/PresenterView.css`
- Global styles: `src/index.css`

## Browser Compatibility

- View Transitions API requires Chrome 111+ or Edge 111+
- Falls back to instant transitions in other browsers
- Presenter mode works in all modern browsers

## License

MIT

## Author

Seth Webster
Executive Director, React Foundation
For JSConf 2025
