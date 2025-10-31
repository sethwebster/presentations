import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { UserProfileHeader } from './UserProfileHeader';
import { PresentationsList } from './PresentationsList';
import { getUserShowcase } from './getUserShowcase';
import UserShowcaseLoading from './loading';

export default async function UserShowcasePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  
  return (
    <div className="min-h-screen bg-[var(--lume-midnight)] text-[var(--lume-mist)]">
      <Header />
      <main className="px-6 py-12 mx-auto max-w-7xl sm:px-12 pt-28">
        <Suspense fallback={<UserShowcaseLoading />}>
          <UserShowcaseContent username={username} />
        </Suspense>
      </main>
    </div>
  );
}

async function UserShowcaseContent({ username }: { username: string }) {
  const data = await getUserShowcase(username);

  if (!data || !data.profile) {
    notFound();
  }

  const { profile, presentations } = data;

  return (
    <>
      <UserProfileHeader profile={profile} presentationCount={presentations.length} />
      <PresentationsList presentations={presentations} />
    </>
  );
}
