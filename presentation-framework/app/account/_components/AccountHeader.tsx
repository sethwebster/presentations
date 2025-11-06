"use client";

import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

interface AccountHeaderProps {
  userEmail?: string | null;
  userName?: string | null;
}

export function AccountHeader({ userEmail, userName }: AccountHeaderProps) {
  const router = useRouter();

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-light text-white mb-2">Your Workspace</h1>
          <p className="text-[var(--lume-mist)]/70">
            {userEmail || userName || 'Welcome back'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push('/editor/new')}
            className="bg-[var(--lume-primary)] text-[var(--lume-midnight)] hover:bg-[var(--lume-primary)]/90"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Presentation
          </Button>
          <Button
            variant="outline"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="border-white/20 text-[var(--lume-mist)] hover:bg-white/5"
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
