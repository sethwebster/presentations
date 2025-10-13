# Presentation Package Format

## Overview

A presentation package consists of:
1. A single `.tsx` file containing all presentation logic, content, and styles
2. An optional assets folder with images, logos, and other media

## File Structure

```
my-presentation.tsx              # Main presentation file
my-presentation-assets/          # Optional assets folder (same name + "-assets")
  ├── logo.svg
  ├── photo1.jpg
  └── partner-logos/
      ├── company1.svg
      └── company2.png
```

## Presentation File Format

Your `.tsx` file must export the following:

### Required Exports

```typescript
// Required: Function that returns array of slide objects
export const getSlides = (assetsPath: string) => {
  return [
    {
      id: 'unique-slide-id',        // Required: unique identifier
      className: 'slide-custom',     // Optional: CSS class for styling
      notes: 'Speaker notes...',     // Optional: presenter notes
      hideBrandLogo: false,          // Optional: hide brand logo on this slide
      content: (                     // Required: JSX content
        <>
          <h1>Slide Title</h1>
          <p>Content here...</p>
        </>
      )
    },
    // More slides...
  ];
};
```

### Optional Exports

```typescript
// Optional: Custom CSS styles as a string
export const customStyles = `
  .my-custom-class {
    background: linear-gradient(135deg, #1a1464 0%, #2d1b5e 100%);
  }
`;

// Optional: Brand logo component
export const getBrandLogo = (assetsPath: string) => {
  return (
    <img
      src={`${assetsPath}/logo.svg`}
      alt="Brand"
      className="brand-logo"
    />
  );
};

// Optional: Presentation metadata
export const presentationConfig = {
  title: 'My Presentation',
  author: 'Your Name',
  event: 'Conference 2025',
  assetsPath: './my-presentation-assets',
};
```

## Custom Components

You can define custom components inline within the same file:

```typescript
import { useState, useEffect } from 'react';

// Define custom components
const AnimatedSlide = ({ title, items }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 500);
  }, []);

  return (
    <div className={visible ? 'fade-in' : 'hidden'}>
      <h1>{title}</h1>
      {items.map(item => <p key={item}>{item}</p>)}
    </div>
  );
};

// Use in slides
export const getSlides = (assetsPath: string) => {
  return [
    {
      id: 'animated',
      content: <AnimatedSlide title="Hello" items={['a', 'b', 'c']} />
    }
  ];
};
```

## Asset References

Always use the `assetsPath` parameter when referencing assets:

```typescript
export const getSlides = (assetsPath: string) => {
  return [
    {
      id: 'with-image',
      content: (
        <>
          <h1>My Slide</h1>
          <img src={`${assetsPath}/photo.jpg`} alt="Photo" />
        </>
      )
    }
  ];
};
```

## External URLs

You can also use external URLs for assets:

```typescript
export const getSlides = () => {
  return [
    {
      id: 'external',
      content: (
        <img src="https://example.com/logo.svg" alt="Logo" />
      )
    }
  ];
};
```

## Loading Your Presentation

### Option 1: URL Parameter

```
http://localhost:5173/?presentation=./my-presentation.tsx
```

### Option 2: File Upload

1. Open the framework in your browser
2. Click "Upload Presentation File"
3. Select your `.tsx` file
4. Place the assets folder in the same directory

### Option 3: Zip Distribution

Create a zip file containing:
```
my-presentation.zip
├── my-presentation.tsx
└── my-presentation-assets/
    └── (asset files)
```

Upload and extract to use.

## Complete Example

```typescript
/**
 * Example Presentation
 * By Your Name
 */

import { useState } from 'react';

// Custom styles
export const customStyles = `
  .slide-intro {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
  .slide-content {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }
`;

// Custom component
const Counter = () => {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  );
};

// Slides
export const getSlides = (assetsPath: string) => {
  return [
    {
      id: 'intro',
      className: 'slide-intro',
      notes: 'Welcome everyone to the presentation',
      content: (
        <>
          <img src={`${assetsPath}/logo.svg`} className="hero-logo" />
          <h1>Welcome to My Presentation</h1>
          <p>A single-file presentation package</p>
        </>
      )
    },
    {
      id: 'interactive',
      className: 'slide-content',
      notes: 'This slide has an interactive component',
      content: (
        <>
          <h1>Interactive Demo</h1>
          <Counter />
        </>
      )
    },
    {
      id: 'closing',
      className: 'slide-intro',
      notes: 'Thank the audience',
      content: (
        <>
          <h1>Thank You!</h1>
          <p>Questions?</p>
        </>
      )
    }
  ];
};

// Brand logo
export const getBrandLogo = (assetsPath: string) => {
  return (
    <img
      src={`${assetsPath}/logo.svg`}
      alt="Brand"
      className="brand-logo"
      style={{ position: 'absolute', bottom: '2rem', right: '2rem', width: '50px' }}
    />
  );
};

// Metadata
export const presentationConfig = {
  title: 'Example Presentation',
  author: 'Your Name',
  event: 'Demo Conference 2025',
};
```

## Tips

1. **Keep it simple**: The entire presentation is one file, so keep it organized
2. **Use comments**: Document your slides and components
3. **Test locally**: Load with `?presentation=./yourfile.tsx` during development
4. **Portable assets**: Use the assets folder for any media you need
5. **Share easily**: Zip the .tsx + assets folder for distribution

## Navigation

The framework provides automatic keyboard navigation:
- **Arrow Right / Space / Page Down**: Next slide
- **Arrow Left / Page Up**: Previous slide
- **Home**: First slide
- **End**: Last slide
- **1-9**: Jump to specific slide

## Presenter Mode

Click "Presenter View" button to open a separate window with:
- Current slide preview
- Speaker notes
- Next slide preview
- Thumbnail grid of all slides
- Synchronized navigation
