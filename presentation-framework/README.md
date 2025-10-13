# Presentation Framework

A reusable, elegant presentation framework built with React 19 featuring the View Transitions API and professional presenter mode.

## Features

- **React 19 with View Transitions API**: Smooth, elegant transitions between slides
- **Presenter View**: Professional presenter mode with speaker notes, current/next slide preview, and thumbnails
- **Window Synchronization**: Main presentation and presenter view stay in sync using BroadcastChannel API
- **Keyboard Navigation**: Full keyboard support for seamless presentation delivery
- **Dynamic Loading**: Upload or load `.tsx` presentation files on-the-fly
- **Single-File Packages**: Presentations are self-contained `.tsx` files with optional assets
- **Responsive Controls**: On-screen navigation buttons

## Installation

```bash
npm install
```

## Usage

### Running the Framework

Start the development server:

```bash
npm run dev
```

The framework will display a loader screen where you can:
1. Upload a `.tsx` presentation file
2. Load a presentation via URL parameter: `?presentation=./path/to/file.tsx`

### Creating a Presentation

Presentations are single `.tsx` files with an optional assets folder.

**File structure:**
```
my-presentation.tsx              # Your presentation
my-presentation-assets/          # Optional assets (same name + "-assets")
  ├── logo.svg
  └── images/
      └── photo.jpg
```

**Minimal presentation example:**

```typescript
export const getSlides = (assetsPath: string) => {
  return [
    {
      id: 'intro',
      className: 'slide-intro',
      notes: 'Welcome to the presentation',
      content: (
        <>
          <h1>Hello World</h1>
          <p>My first slide</p>
        </>
      )
    },
    {
      id: 'closing',
      content: <h1>Thank You!</h1>
    }
  ];
};

export const customStyles = `
  .slide-intro {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
`;
```

See [PRESENTATION_PACKAGE_FORMAT.md](../PRESENTATION_PACKAGE_FORMAT.md) for complete documentation.

## Slide Object Structure

Each slide object should contain:

```javascript
{
  id: 'unique-slide-id',           // Required: unique identifier
  className: 'slide-custom-class',  // Optional: CSS class for styling
  notes: 'Speaker notes text',      // Optional: notes for presenter view
  hideBrandLogo: false,             // Optional: hide brand logo on this slide
  content: (                        // Required: React component/JSX
    <>
      <h1>Title</h1>
      <p>Content</p>
    </>
  )
}
```

## Configuration Options

The `config` object supports:

```javascript
{
  brandLogo: <Component />,                    // Brand logo to display
  renderSlideNumber: () => <Component />,      // Custom slide number renderer
  renderNavigation: () => <Component />,       // Custom navigation renderer
  customStyles: '/path/to/styles.css',         // Additional styles
}
```

## Navigation

**Keyboard Controls:**
- `Arrow Right` / `Space` / `Page Down`: Next slide
- `Arrow Left` / `Page Up`: Previous slide
- `Home`: Jump to first slide
- `End`: Jump to last slide
- `1-9`: Jump to specific slide number

**Presenter Mode:**
- Click "Presenter View" button to open presenter window
- Both windows stay synchronized automatically

## API Reference

### Hooks

#### `usePresentation(totalSlides)`
Core presentation state management.

Returns: `{ currentSlide, nextSlide, prevSlide, goToSlide, isFirst, isLast, progress }`

#### `useKeyboardNavigation(nextSlide, prevSlide, goToSlide, totalSlides)`
Handles keyboard input for navigation.

#### `useWindowSync(currentSlide, setCurrentSlide)`
Manages window synchronization between main and presenter views.

Returns: `{ openPresenterView, presenterWindowOpen }`

### Components

#### `<Presentation />`
Main presentation wrapper component.

Props:
- `slides` (Array, required): Array of slide objects
- `config` (Object, optional): Configuration options

#### `<PresenterView />`
Presenter mode component (used internally).

## Browser Compatibility

- View Transitions API requires Chrome 111+ or Edge 111+
- Falls back to instant transitions in other browsers
- Presenter mode works in all modern browsers

## License

MIT

## Author

Seth Webster
