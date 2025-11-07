import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { getAllFontVariables } from '@/lib/fonts';

export const metadata: Metadata = {
  title: 'Presentation Framework',
  description: 'AI-assisted presentation authoring and runtime',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`light ${getAllFontVariables()}`}>
      <body className="bg-background text-foreground antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
