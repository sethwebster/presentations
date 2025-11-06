import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import Link from 'next/link';

export default function UserNotFound() {
  return (
    <div className="min-h-screen bg-[var(--lume-midnight)] text-[var(--lume-mist)]">
      <Header />
      <main className="px-6 py-12 mx-auto max-w-7xl sm:px-12 pt-28">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="bg-white/[0.04] border border-white/10 p-8">
            <CardContent className="text-center">
              <h1 className="mb-4 text-2xl font-light text-white">User Not Found</h1>
              <p className="text-[var(--lume-mist)]/70 mb-6">
                The user you&apos;re looking for doesn&apos;t exist or has no public presentations.
              </p>
              <Link href="/">
                <Button
                  variant="outline"
                  className="border-white/20 text-[var(--lume-mist)] hover:bg-white/5"
                >
                  Go Home
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

