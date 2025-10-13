# Presentations

Personal presentations repository featuring a reusable React-based presentation framework.

## Structure

```
presentations/
├── presentation-framework/      # Reusable presentation engine
├── jsconf-2025/                # Original JSConf 2025 presentation (reference)
└── docs/                       # Documentation
```

## Quick Start

### Run the JSConf 2025 Presentation

```bash
cd presentation-framework
npm install
npm run dev
```

Then open:
```
http://localhost:5173/?presentation=jsconf-2025-react-foundation
```

### Features

- **React 19** with View Transitions API
- **Presenter View** with synchronized windows, notes, and thumbnails
- **Keyboard Navigation** (arrows, space, home/end, number keys)
- **Single-File Presentations** - Each presentation is one `.jsx` file
- **Dynamic Loading** - Load presentations via URL parameter
- **Hot Reload** - Vite auto-reloads when you edit presentations

## Documentation

- [Quick Start Guide](docs/QUICK_START.md)
- [Presentation Package Format](docs/PRESENTATION_PACKAGE_FORMAT.md)
- [Loading Presentations](docs/LOADING_PRESENTATIONS.md)
- [Refactoring Summary](docs/REFACTORING_SUMMARY.md)

## Creating New Presentations

1. Copy the template:
```bash
cp presentation-framework/src/presentations/jsconf-2025-react-foundation.jsx \
   presentation-framework/src/presentations/my-talk.jsx
```

2. Register it in `presentation-framework/src/presentations/index.js`:
```javascript
export const presentations = {
  'jsconf-2025-react-foundation': () => import('./jsconf-2025-react-foundation.jsx'),
  'my-talk': () => import('./my-talk.jsx'),
};
```

3. Add assets (optional):
```bash
mkdir presentation-framework/public/presentations/my-talk-assets
```

4. Load and present:
```
http://localhost:5173/?presentation=my-talk
```

## Presentations Included

### JSConf 2025 - React Foundation Keynote
- 20 slides announcing the React Foundation
- Custom animations and partner logos
- Speaker: Seth Webster, Executive Director, React Foundation

## License

MIT
