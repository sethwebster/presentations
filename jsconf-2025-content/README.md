# JSConf 2025 - React Foundation Keynote

This is a presentation content package for the Presentation Framework, containing the keynote presentation announcing the React Foundation.

## About

This presentation was delivered at JSConf 2025 by Seth Webster, Executive Director of the React Foundation. It tells the story of React's evolution, the importance of open-source collaboration, and introduces the newly formed React Foundation.

## Running the Presentation

### Prerequisites

1. Ensure the presentation-framework is available in the parent directory
2. Install dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

The presentation will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
npm run preview
```

## Presentation Content

The presentation includes 20 slides covering:

1. **Opening** - How We Build, Why We Build
2. **The Declarative Shift** - Components, State, Time
3. **The Ecosystem** - React, Vue, Svelte, and the modern JavaScript landscape
4. **The Truth** - Collaboration over Code
5. **Open Source Spirit** - Our Superpower
6. **Introduction** - Seth Webster, Executive Director
7. **First Encounter** - More Than Technology
8. **North Star** - Helping Others Bring Ideas to Life
9. **Six Years Journey** - Millions of Apps, Every Major Platform
10. **Shaping People** - How React Has Influenced Development
11. **The Question** - How Do We Protect What We've Built?
12. **The React Foundation** - Independent, Open, For Everyone
13. **Partners** - Meta, Microsoft, Amazon, Expo, Vercel, Callstack, Software Mansion + Community
14. **More Than Governance** - A Promise
15. **You Build the Future**
16. **Your Invitation** - Help Shape What Comes Next
17. **Bring Your Ideas** - Experiments and Opinions
18. **My Ask** - Why Do You Build?
19. **The Why** - To Help Others Bring Ideas to Life
20. **Closing** - Let's Build the Next Chapter

## Navigation

**Keyboard Controls:**
- `Arrow Right` / `Space` / `Page Down`: Next slide
- `Arrow Left` / `Page Up`: Previous slide
- `Home`: Jump to first slide
- `End`: Jump to last slide
- `1-9`: Jump to specific slide number

**Presenter Mode:**
- Click "Presenter View" button to open a separate presenter window
- Includes speaker notes, current/next slide previews, and thumbnail navigation
- Both windows stay synchronized

## Customization

### Slides
Edit slides in `src/slides/slides.jsx`

### Styling
Custom styles are in `src/styles/custom.css`

### Components
Special slide components (like PartnersSlide) are in `src/components/`

### Assets
Images and logos are in `src/assets/`

## Technology Stack

- React 19 (experimental build with View Transitions)
- Vite 7.1.7
- Presentation Framework (custom built)
- View Transitions API
- BroadcastChannel API for window sync

## Speaker

**Seth Webster**
- Executive Director, React Foundation
- Twitter/X: @sethwebster
- Instagram: @sethwebsterphoto

## License

MIT
