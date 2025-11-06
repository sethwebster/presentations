import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/Header';

export default function UserShowcaseLoading() {
  return (
    <div className="min-h-screen bg-[var(--lume-midnight)] text-[var(--lume-mist)]">
      <Header />
      <main className="px-6 py-12 mx-auto max-w-7xl sm:px-12 pt-28">
        <div className="mb-12">
          <div className="mb-6">
            <div className="h-10 w-64 bg-white/5 rounded animate-pulse mb-2" />
            <div className="h-6 w-48 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="bg-white/[0.04] border border-white/10 overflow-hidden">
              <CardContent className="p-0">
                <div className="w-full aspect-video bg-white/5 animate-pulse" />
                <div className="p-6">
                  <div className="h-6 w-3/4 bg-white/5 rounded animate-pulse mb-2" />
                  <div className="h-4 w-1/2 bg-white/5 rounded animate-pulse mb-4" />
                  <div className="h-9 w-full bg-white/5 rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

