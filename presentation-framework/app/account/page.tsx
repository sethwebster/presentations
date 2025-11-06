import { Suspense } from 'react';
import { Header } from '@/components/Header';
import { AccountDataLoader } from './_components/AccountDataLoader';
import { AccountHeader } from './_components/AccountHeader';
import { PresentationsSection } from './_components/PresentationsSection';
import { AccountLoadingState } from './_components/AccountLoadingState';

/**
 * Account page - Server Component with proper RSC pattern
 *
 * Architecture:
 * - Server Component page (this file) - layout and structure
 * - AccountDataLoader - fetches session and presentations server-side
 * - Client components (AccountHeader, PresentationsSection) - interactive UI
 * - Suspense boundary - streams data with loading state
 */
export default function AccountPage() {
  return (
    <div className="min-h-screen bg-[var(--lume-midnight)] text-[var(--lume-mist)]">
      <Header />

      <main className="max-w-7xl mx-auto px-6 sm:px-12 py-12 pt-28">
        <Suspense fallback={<AccountLoadingState />}>
          <AccountDataLoader>
            {({ session, presentations }) => (
              <>
                <AccountHeader
                  userEmail={session.user.email}
                  userName={session.user.name}
                />

                <PresentationsSection
                  initialPresentations={presentations}
                  userId={session.user.id}
                  userName={session.user.name}
                  userEmail={session.user.email}
                  username={session.user.username}
                />
              </>
            )}
          </AccountDataLoader>
        </Suspense>
      </main>
    </div>
  );
}
