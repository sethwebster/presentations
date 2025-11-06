/**
 * Font Registry - Curated Google Fonts with Next.js font optimization
 *
 * All fonts are automatically:
 * - Downloaded at build time
 * - Self-hosted (no external requests)
 * - Optimized for performance
 * - Available offline
 */

import {
  Inter,
  Roboto,
  Open_Sans,
  Lato,
  Montserrat,
  Source_Sans_3,
  Raleway,
  PT_Sans,
  Nunito,
  Playfair_Display,
  Merriweather,
  Lora,
  Crimson_Text,
  IBM_Plex_Sans,
  IBM_Plex_Serif,
  IBM_Plex_Mono,
  Fira_Code,
  JetBrains_Mono,
  Space_Mono,
  Oswald,
  Bebas_Neue,
  Anton,
  Cinzel,
  Cormorant_Garamond,
} from 'next/font/google';

// Sans-serif fonts
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const roboto = Roboto({ weight: ['300', '400', '500', '700', '900'], subsets: ['latin'], variable: '--font-roboto', display: 'swap' });
const openSans = Open_Sans({ subsets: ['latin'], variable: '--font-open-sans', display: 'swap' });
const lato = Lato({ weight: ['300', '400', '700', '900'], subsets: ['latin'], variable: '--font-lato', display: 'swap' });
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat', display: 'swap' });
const sourceSans = Source_Sans_3({ subsets: ['latin'], variable: '--font-source-sans', display: 'swap' });
const raleway = Raleway({ subsets: ['latin'], variable: '--font-raleway', display: 'swap' });
const ptSans = PT_Sans({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-pt-sans', display: 'swap' });
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito', display: 'swap' });
const ibmPlexSans = IBM_Plex_Sans({ weight: ['300', '400', '500', '600', '700'], subsets: ['latin'], variable: '--font-ibm-plex-sans', display: 'swap' });

// Serif fonts
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' });
const merriweather = Merriweather({ weight: ['300', '400', '700', '900'], subsets: ['latin'], variable: '--font-merriweather', display: 'swap' });
const lora = Lora({ subsets: ['latin'], variable: '--font-lora', display: 'swap' });
const crimsonText = Crimson_Text({ weight: ['400', '600', '700'], subsets: ['latin'], variable: '--font-crimson-text', display: 'swap' });
const ibmPlexSerif = IBM_Plex_Serif({ weight: ['300', '400', '500', '600', '700'], subsets: ['latin'], variable: '--font-ibm-plex-serif', display: 'swap' });
const cormorant = Cormorant_Garamond({ weight: ['300', '400', '500', '600', '700'], subsets: ['latin'], variable: '--font-cormorant', display: 'swap' });

// Monospace fonts
const firaCode = Fira_Code({ subsets: ['latin'], variable: '--font-fira-code', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono', display: 'swap' });
const spaceMono = Space_Mono({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-space-mono', display: 'swap' });
const ibmPlexMono = IBM_Plex_Mono({ weight: ['300', '400', '500', '600', '700'], subsets: ['latin'], variable: '--font-ibm-plex-mono', display: 'swap' });

// Display/Heading fonts
const oswald = Oswald({ subsets: ['latin'], variable: '--font-oswald', display: 'swap' });
const bebasNeue = Bebas_Neue({ weight: ['400'], subsets: ['latin'], variable: '--font-bebas-neue', display: 'swap' });
const anton = Anton({ weight: ['400'], subsets: ['latin'], variable: '--font-anton', display: 'swap' });
const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel', display: 'swap' });

/**
 * Font metadata for UI display and selection
 */
export interface FontMetadata {
  id: string;
  name: string;
  category: 'sans-serif' | 'serif' | 'monospace' | 'display';
  variable: string;
  className: string;
  weights?: number[];
  description?: string;
  popularUse?: string;
}

/**
 * Complete font registry
 */
export const FONT_REGISTRY: FontMetadata[] = [
  // Sans-serif
  {
    id: 'inter',
    name: 'Inter',
    category: 'sans-serif',
    variable: '--font-inter',
    className: inter.className,
    description: 'Modern, highly legible',
    popularUse: 'UI, body text',
  },
  {
    id: 'roboto',
    name: 'Roboto',
    category: 'sans-serif',
    variable: '--font-roboto',
    className: roboto.className,
    weights: [300, 400, 500, 700, 900],
    description: 'Clean, geometric',
    popularUse: 'Android, Material Design',
  },
  {
    id: 'open-sans',
    name: 'Open Sans',
    category: 'sans-serif',
    variable: '--font-open-sans',
    className: openSans.className,
    description: 'Friendly, neutral',
    popularUse: 'Web, mobile',
  },
  {
    id: 'lato',
    name: 'Lato',
    category: 'sans-serif',
    variable: '--font-lato',
    className: lato.className,
    weights: [300, 400, 700, 900],
    description: 'Warm, professional',
    popularUse: 'Corporate, web',
  },
  {
    id: 'montserrat',
    name: 'Montserrat',
    category: 'sans-serif',
    variable: '--font-montserrat',
    className: montserrat.className,
    description: 'Urban, elegant',
    popularUse: 'Headings, branding',
  },
  {
    id: 'source-sans',
    name: 'Source Sans 3',
    category: 'sans-serif',
    variable: '--font-source-sans',
    className: sourceSans.className,
    description: 'Technical, clear',
    popularUse: 'Documentation, UI',
  },
  {
    id: 'raleway',
    name: 'Raleway',
    category: 'sans-serif',
    variable: '--font-raleway',
    className: raleway.className,
    description: 'Elegant, sophisticated',
    popularUse: 'Headings, luxury brands',
  },
  {
    id: 'pt-sans',
    name: 'PT Sans',
    category: 'sans-serif',
    variable: '--font-pt-sans',
    className: ptSans.className,
    weights: [400, 700],
    description: 'Humanist, versatile',
    popularUse: 'Russian texts, multilingual',
  },
  {
    id: 'nunito',
    name: 'Nunito',
    category: 'sans-serif',
    variable: '--font-nunito',
    className: nunito.className,
    description: 'Rounded, friendly',
    popularUse: 'Kids, casual',
  },
  {
    id: 'ibm-plex-sans',
    name: 'IBM Plex Sans',
    category: 'sans-serif',
    variable: '--font-ibm-plex-sans',
    className: ibmPlexSans.className,
    weights: [300, 400, 500, 600, 700],
    description: 'Corporate, technical',
    popularUse: 'IBM, enterprise',
  },

  // Serif
  {
    id: 'playfair',
    name: 'Playfair Display',
    category: 'serif',
    variable: '--font-playfair',
    className: playfair.className,
    description: 'Elegant, high-contrast',
    popularUse: 'Headings, fashion',
  },
  {
    id: 'merriweather',
    name: 'Merriweather',
    category: 'serif',
    variable: '--font-merriweather',
    className: merriweather.className,
    weights: [300, 400, 700, 900],
    description: 'Traditional, readable',
    popularUse: 'Body text, blogs',
  },
  {
    id: 'lora',
    name: 'Lora',
    category: 'serif',
    variable: '--font-lora',
    className: lora.className,
    description: 'Calligraphic, elegant',
    popularUse: 'Books, editorial',
  },
  {
    id: 'crimson-text',
    name: 'Crimson Text',
    category: 'serif',
    variable: '--font-crimson-text',
    className: crimsonText.className,
    weights: [400, 600, 700],
    description: 'Classic, scholarly',
    popularUse: 'Academic, books',
  },
  {
    id: 'ibm-plex-serif',
    name: 'IBM Plex Serif',
    category: 'serif',
    variable: '--font-ibm-plex-serif',
    className: ibmPlexSerif.className,
    weights: [300, 400, 500, 600, 700],
    description: 'Modern serif',
    popularUse: 'IBM, editorial',
  },
  {
    id: 'cormorant',
    name: 'Cormorant Garamond',
    category: 'serif',
    variable: '--font-cormorant',
    className: cormorant.className,
    weights: [300, 400, 500, 600, 700],
    description: 'Display serif, elegant',
    popularUse: 'Headings, luxury',
  },

  // Monospace
  {
    id: 'fira-code',
    name: 'Fira Code',
    category: 'monospace',
    variable: '--font-fira-code',
    className: firaCode.className,
    description: 'Code ligatures',
    popularUse: 'Code blocks, terminal',
  },
  {
    id: 'jetbrains-mono',
    name: 'JetBrains Mono',
    category: 'monospace',
    variable: '--font-jetbrains-mono',
    className: jetbrains.className,
    description: 'Developer-focused',
    popularUse: 'IDEs, code',
  },
  {
    id: 'space-mono',
    name: 'Space Mono',
    category: 'monospace',
    variable: '--font-space-mono',
    className: spaceMono.className,
    weights: [400, 700],
    description: 'Retro, geometric',
    popularUse: 'Code, retro designs',
  },
  {
    id: 'ibm-plex-mono',
    name: 'IBM Plex Mono',
    category: 'monospace',
    variable: '--font-ibm-plex-mono',
    className: ibmPlexMono.className,
    weights: [300, 400, 500, 600, 700],
    description: 'Corporate monospace',
    popularUse: 'IBM, code',
  },

  // Display
  {
    id: 'oswald',
    name: 'Oswald',
    category: 'display',
    variable: '--font-oswald',
    className: oswald.className,
    description: 'Condensed, impactful',
    popularUse: 'Headlines, posters',
  },
  {
    id: 'bebas-neue',
    name: 'Bebas Neue',
    category: 'display',
    variable: '--font-bebas-neue',
    className: bebasNeue.className,
    weights: [400],
    description: 'Bold, condensed',
    popularUse: 'Headings, branding',
  },
  {
    id: 'anton',
    name: 'Anton',
    category: 'display',
    variable: '--font-anton',
    className: anton.className,
    weights: [400],
    description: 'Strong, bold',
    popularUse: 'Posters, impact',
  },
  {
    id: 'cinzel',
    name: 'Cinzel',
    category: 'display',
    variable: '--font-cinzel',
    className: cinzel.className,
    description: 'Classical, Roman-inspired',
    popularUse: 'Luxury, formal',
  },
];

/**
 * Get all font CSS variable classes for global injection
 */
export function getAllFontVariables(): string {
  return [
    inter.variable,
    roboto.variable,
    openSans.variable,
    lato.variable,
    montserrat.variable,
    sourceSans.variable,
    raleway.variable,
    ptSans.variable,
    nunito.variable,
    ibmPlexSans.variable,
    playfair.variable,
    merriweather.variable,
    lora.variable,
    crimsonText.variable,
    ibmPlexSerif.variable,
    cormorant.variable,
    firaCode.variable,
    jetbrains.variable,
    spaceMono.variable,
    ibmPlexMono.variable,
    oswald.variable,
    bebasNeue.variable,
    anton.variable,
    cinzel.variable,
  ].join(' ');
}

/**
 * Get font by ID
 */
export function getFontById(id: string): FontMetadata | undefined {
  return FONT_REGISTRY.find((font) => font.id === id);
}

/**
 * Get fonts by category
 */
export function getFontsByCategory(category: FontMetadata['category']): FontMetadata[] {
  return FONT_REGISTRY.filter((font) => font.category === category);
}

/**
 * Get CSS variable value for a font ID
 */
export function getFontVariable(id: string): string {
  const font = getFontById(id);
  return font ? `var(${font.variable})` : 'inherit';
}
