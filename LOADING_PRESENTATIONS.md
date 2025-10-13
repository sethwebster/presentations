# Loading Presentations

## Primary Method: URL Parameter

The presentation framework loads presentations via URL query parameters:

```
http://localhost:5173/?presentation=../jsconf-2025-react-foundation.jsx
```

### Steps

1. **Start the framework:**
```bash
cd presentation-framework
npm run dev
```

2. **Add the presentation parameter to URL:**
```
http://localhost:5173/?presentation=../your-presentation.jsx
```

3. **The path is relative to the framework's public directory**

### File Structure

```
presentations/
├── presentation-framework/          # Framework running on localhost:5173
├── my-presentation.jsx             # Your presentation file
└── my-presentation-assets/         # Assets folder (optional)
    └── images/
```

### Example URLs

**Load JSConf presentation:**
```
http://localhost:5173/?presentation=../jsconf-2025-react-foundation.jsx
```

**Load from subdirectory:**
```
http://localhost:5173/?presentation=../talks/my-talk.jsx
```

## Presentation File Format

Your `.jsx` file must use ES6 module syntax:

```javascript
// jsconf-2025-react-foundation.jsx
import { useState } from 'react';

export const getSlides = (assetsPath) => {
  return [
    {
      id: 'intro',
      content: <h1>Hello</h1>
    }
  ];
};

export const customStyles = `/* CSS */`;
export const getBrandLogo = (assetsPath) => {/* JSX */};
export const presentationConfig = {/* metadata */};
```

## Assets

Place assets in a folder with the same name as your presentation + "-assets":

```
my-presentation.jsx
my-presentation-assets/
  ├── logo.svg
  └── photo.jpg
```

Reference in your code:

```javascript
export const getSlides = (assetsPath) => {
  return [{
    id: 'slide1',
    content: <img src={`${assetsPath}/logo.svg`} />
  }];
};
```

## Common Issues

### 1. Module Not Found

**Problem:** `Failed to load presentation: Cannot find module`

**Solution:** Check the path is correct relative to the framework directory:
```
?presentation=../your-file.jsx  ✓ (correct - goes up one level)
?presentation=./your-file.jsx   ✗ (wrong - looks in framework dir)
```

### 2. TypeScript Syntax Error

**Problem:** `Unexpected token ':'`

**Solution:** Use `.jsx` not `.tsx`, and remove TypeScript syntax:
```javascript
// ✗ Wrong (TypeScript)
export const getSlides = (assetsPath: string) => {

// ✓ Correct (JavaScript)
export const getSlides = (assetsPath) => {
```

### 3. Assets Not Loading

**Problem:** Images show broken

**Solution:** Ensure assets folder naming matches:
```
my-talk.jsx → my-talk-assets/     ✓
my-talk.jsx → assets/              ✗
```

## Development Workflow

1. Create your presentation file
2. Start framework: `cd presentation-framework && npm run dev`
3. Open browser: `http://localhost:5173/?presentation=../your-file.jsx`
4. Edit your presentation file
5. Vite will hot-reload automatically

## Distribution

### Option 1: Zip File

Create a zip with presentation + assets:
```bash
zip -r my-talk.zip my-talk.jsx my-talk-assets/
```

Recipient extracts and loads via URL parameter.

### Option 2: Git Repository

```bash
git clone https://example.com/my-talk
cd my-talk
# Edit path in README to match
```

### Option 3: Copy Files

Simply copy the `.jsx` file and assets folder to the presentations directory.

## Future Enhancements

Planned improvements:
- Drag & drop file upload
- Zip file extraction
- Presentation gallery/browser
- Cloud storage integration

For now, URL-based loading is the most reliable method.
