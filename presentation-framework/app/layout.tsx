import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Presentation Framework',
  description: 'AI-assisted presentation authoring and runtime',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="light">
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
