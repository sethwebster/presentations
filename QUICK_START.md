# Quick Start Guide

## Running the JSConf 2025 Presentation

### 1. Install Dependencies

```bash
cd presentation-framework
npm install
```

### 2. Start the Framework

```bash
npm run dev
```

The framework will start on `http://localhost:5173`

### 3. Load the Presentation

Open your browser to:

```
http://localhost:5173/?presentation=/presentations/jsconf-2025-react-foundation.jsx
```

### 4. Navigate the Presentation

**Keyboard Shortcuts:**
- `→` / `Space` / `Page Down` - Next slide
- `←` / `Page Up` - Previous slide
- `Home` - First slide
- `End` - Last slide
- `1-9` - Jump to specific slide

**Presenter Mode:**
- Click "Presenter View" button
- New window opens with notes and thumbnails
- Windows stay synchronized

## File Locations

The presentation files are in:

```
presentation-framework/
└── public/
    └── presentations/
        ├── jsconf-2025-react-foundation.jsx        # The presentation
        └── jsconf-2025-react-foundation-assets/    # Assets folder
            ├── react_logo_dark.svg
            ├── callstack-logo.svg
            ├── expo-logo-wordmark.svg
            ├── software-mansion.svg
            └── vercel-logotype-light.png
```

## Creating Your Own Presentation

### 1. Copy the Template

```bash
cd presentation-framework/public/presentations
cp jsconf-2025-react-foundation.jsx my-talk.jsx
```

### 2. Create Assets Folder (optional)

```bash
mkdir my-talk-assets
cp your-logo.svg my-talk-assets/
```

### 3. Edit Your Presentation

Open `my-talk.jsx` and modify:
- `getSlides()` - Your slide content
- `customStyles` - Your custom CSS
- `presentationConfig` - Metadata

### 4. Load and Present

```
http://localhost:5173/?presentation=/presentations/my-talk.jsx
```

## Presentation File Structure

```javascript
// my-talk.jsx
import { useState } from 'react';

// Configuration
export const presentationConfig = {
  title: 'My Talk',
  author: 'Your Name',
  event: 'Conference 2025',
};

// Custom CSS
export const customStyles = `
  .slide-intro {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
`;

// Slides
export const getSlides = (assetsPath) => {
  return [
    {
      id: 'intro',
      className: 'slide-intro',
      notes: 'Welcome everyone!',
      content: (
        <>
          <h1>My Talk Title</h1>
          <img src={`${assetsPath}/logo.svg`} />
        </>
      )
    },
    // More slides...
  ];
};

// Brand Logo (optional)
export const getBrandLogo = (assetsPath) => {
  return <img src={`${assetsPath}/logo.svg`} className="brand-logo" />;
};
```

## Tips

1. **Hot Reload**: Vite automatically reloads when you edit your presentation
2. **Custom Components**: Define components inline in your presentation file
3. **Animations**: Use CSS animations in `customStyles`
4. **External Images**: You can use external URLs for images
5. **Presenter Notes**: Add notes to each slide for presenter mode

## Troubleshooting

### Presentation Won't Load

Check:
1. File is in `public/presentations/` directory
2. URL parameter is correct: `?presentation=/presentations/your-file.jsx`
3. File has proper exports (`getSlides`, etc.)
4. No TypeScript syntax (use `.jsx` not `.tsx`)

### Assets Not Loading

Check:
1. Assets folder matches presentation name: `my-talk.jsx` → `my-talk-assets/`
2. Assets folder is in `public/presentations/`
3. Using `assetsPath` parameter in code: `${assetsPath}/image.jpg`

### Page is Blank

Check browser console for errors. Common issues:
- JSX syntax error
- Missing React import
- Invalid export structure

## Next Steps

See `PRESENTATION_PACKAGE_FORMAT.md` for complete API documentation.
