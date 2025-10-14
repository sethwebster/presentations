# Presentations Directory

Place your presentation files here to load them in the framework.

## Structure

```
src/presentations/
├── my-presentation.tsx              # Your presentation code
└── another-talk.tsx

public/presentations/
├── my-presentation-assets/          # Assets folder
│   ├── logo.svg
│   └── images/
└── another-talk-assets/
```

**Note:** Presentation `.tsx` files go in `src/presentations/`, but assets go in `public/presentations/` so they can be served as static files.

## Loading a Presentation

Add the query parameter to the URL:

```
http://localhost:5173/?presentation=./presentations/jsconf-2025-react-foundation.tsx
```

## Example Presentation

The `jsconf-2025-react-foundation.tsx` file is included as an example.

## Creating Your Own

1. Copy `jsconf-2025-react-foundation.tsx` as a template
2. Edit the slides, styles, and components
3. Add assets to a matching `-assets` folder
4. Load via URL parameter

See the main documentation for full presentation file format details.
