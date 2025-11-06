"use client";

import Link from 'next/link';
import { useSession } from 'next-auth/react';

export function Header() {
  const { data: session, status } = useSession();

  return (
    <header className="fixed top-0 left-0 right-0 border-b backdrop-blur-sm"
            style={{
              borderColor: 'rgba(236, 236, 236, 0.1)',
              background: 'rgba(11, 16, 34, 0.8)',
              zIndex: 40
            }}>
      <div className="px-6 py-4 flex items-center relative">
        <Link href="/" className="flex items-center gap-3">
          <div className="lume-mark"></div>
          <div className="lume-word">Lume</div>
        </Link>

        {/* GitHub and Account links integrated in header */}
        <div className="absolute right-0 top-0 h-full flex items-center gap-6 px-6" style={{ zIndex: 50 }}>
          <a
            href="https://github.com/sethwebster/presentations"
            target="_blank"
            rel="noopener noreferrer"
            className="group"
            aria-label="View source on GitHub"
          >
            <svg className="w-6 h-6 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--lume-primary)' }}>
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
          
          {status === 'authenticated' && session?.user && (
            <Link
              href="/account/profile"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--lume-primary)]/10 border border-[var(--lume-primary)]/20 text-[var(--lume-primary)] hover:bg-[var(--lume-primary)]/20 transition-colors text-sm"
            >
              {(session.user as any).image ? (
                <img
                  src={(session.user as any).image}
                  alt={session.user.name || session.user.email || 'User'}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[var(--lume-primary)]/20 flex items-center justify-center">
                  <span className="text-xs font-medium">
                    {session.user.name?.[0] || session.user.email?.[0] || '?'}
                  </span>
                </div>
              )}
              <span>{session.user.username || session.user.email?.split('@')[0] || 'Account'}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
