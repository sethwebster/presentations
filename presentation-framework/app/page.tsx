import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

const highlightFeatures = [
  {
    title: 'Pixel-Perfect Editing',
    description:
      'Design slides with absolute precision. Smart guides, snapping, and AI-assisted layout keep everything aligned and beautiful.',
  },
  {
    title: 'AI That Understands Design',
    description:
      'Let Lume suggest palettes, typography, and layouts—or hand the canvas to AI entirely. Every element remains editable.',
  },
  {
    title: 'Realtime Collaboration',
    description:
      'Present live, gather feedback, and sync decks across teams instantly with Redis-backed realtime infrastructure.',
  },
];

const workflowSteps = [
  {
    step: '01',
    title: 'Ideate with AI',
    description:
      'Ask Lume to outline your story. Generate structure, talking points, and visual direction in minutes.',
  },
  {
    step: '02',
    title: 'Design in the Editor',
    description:
      'Craft every slide with full control: gradients, typography, imagery, and animation—no “template lock-in.”',
  },
  {
    step: '03',
    title: 'Present Effortlessly',
    description:
      'Go live with presenter mode, share polished decks, and keep audiences engaged with reactions and automation.',
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--lume-midnight)] text-[var(--lume-mist)]">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[rgba(22,194,199,0.12)] via-transparent to-[rgba(200,75,210,0.18)] blur-3xl" />

        <header className="relative px-6 sm:px-12 pt-16 pb-24 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-14">
            <Link href="/" className="flex items-center gap-3">
              <span className="relative inline-flex items-center justify-center">
                <span className="absolute inset-0 bg-[var(--lume-primary)]/40 blur-xl rounded-full" />
                <Image
                  src="/assets/logo-small.png"
                  alt="Lume logo"
                  width={48}
                  height={48}
                  className="relative h-12 w-12"
                  priority
                />
              </span>
              <span className="text-sm uppercase tracking-[0.4em] text-[var(--lume-primary)]/80">Lume</span>
            </Link>
            <div className="hidden sm:flex items-center gap-6 text-xs text-[var(--lume-mist)]/70">
              <Link href="/auth/signin" className="hover:text-white transition-colors">
                Sign in
              </Link>
              <Link href="/account" className="hover:text-white transition-colors">
                Workspace
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-6 max-w-3xl">
              <span className="uppercase tracking-[0.3em] text-xs sm:text-sm text-[var(--lume-primary)]/80">
                Lume Presentation Studio
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light leading-tight text-white">
                Presentations that feel<span className="text-[var(--lume-primary)]"> handcrafted</span>
                <br className="hidden sm:block" />—even when AI leads the way.
              </h1>
              <p className="text-base sm:text-lg text-[var(--lume-mist)]/80 max-w-2xl">
                Design pixel-perfect slides, collaborate in real time, and let AI adapt to your creative flow. Lume blends
                craft, automation, and performance into a single, elegant editor.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
              <Link
                href="/auth/signin"
                className="group inline-flex items-center justify-center px-6 py-3 rounded-full bg-[var(--lume-primary)] text-[var(--lume-midnight)] font-medium shadow-[0_20px_60px_rgba(22,194,199,0.45)] transition-transform hover:-translate-y-0.5"
              >
                Sign in to build
                <svg
                  className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="M13 18l6-6-6-6" />
                </svg>
              </Link>
              <Link
                href="/present/demo-rsc-deck"
                className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-white/15 text-[var(--lume-mist)]/80 hover:text-white hover:border-white/30 transition-colors"
              >
                Watch a live deck
              </Link>
            </div>
          </div>

          <div className="mt-16 grid sm:grid-cols-3 gap-6">
            {highlightFeatures.map((feature) => (
              <Card
                key={feature.title}
                className="bg-white/[0.04] border border-white/10 backdrop-blur-sm shadow-lg shadow-[rgba(15,15,30,0.2)]"
              >
                <CardContent className="p-6 flex flex-col gap-3">
                  <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                  <p className="text-sm text-[var(--lume-mist)]/70 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </header>

        <section className="relative max-w-6xl mx-auto px-6 sm:px-12 py-20 border-t border-white/10">
          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-16 items-center">
            <div className="space-y-6">
              <span className="uppercase tracking-[0.3em] text-xs sm:text-sm text-[var(--lume-accent)]/80">Workflow</span>
              <h2 className="text-3xl sm:text-4xl text-white font-light">
                From idea to standing ovation—one canvas, every detail under your control.
              </h2>
              <p className="text-base text-[var(--lume-mist)]/75 max-w-2xl">
                Lume is engineered for storytellers. Bring in AI to accelerate ideation, then dial in design with pixel-perfect
                tools. Present, share, and iterate without leaving the platform.
              </p>
            </div>
            <Card className="bg-white/[0.03] border border-white/10 backdrop-blur-sm">
              <CardContent className="p-8 space-y-6">
                {workflowSteps.map((step) => (
                  <div key={step.step} className="flex gap-4">
                    <span className="text-[var(--lume-primary)] font-semibold tracking-[0.4em] text-xs mt-1">
                      {step.step}
                    </span>
                    <div className="space-y-1">
                      <h3 className="text-lg text-white font-medium">{step.title}</h3>
                      <p className="text-sm text-[var(--lume-mist)]/70 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="relative max-w-6xl mx-auto px-6 sm:px-12 pb-24">
          <div className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(22,194,199,0.12),_rgba(15,15,30,0.9))] overflow-hidden">
            <div className="px-8 sm:px-12 py-16 flex flex-col lg:flex-row lg:items-center gap-10">
              <div className="flex-1 space-y-4">
                <span className="uppercase tracking-[0.3em] text-xs sm:text-sm text-[var(--lume-primary)]/80">For teams</span>
                <h3 className="text-3xl text-white font-light max-w-xl">
                  Beautiful decks. Shared sources of truth. Presenter tools worthy of the room.
                </h3>
                <p className="text-sm sm:text-base text-[var(--lume-mist)]/70 max-w-2xl leading-relaxed">
                  Build a library of reusable slides, protect brand systems, and keep everyone aligned in real time. Lume blends
                  craft and collaboration so your story always lands.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/account"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-white/20 text-white hover:border-white/40 transition"
                >
                  View workspace
                </Link>
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-white text-[var(--lume-midnight)] font-medium shadow-lg shadow-[rgba(255,255,255,0.2)] hover:shadow-[rgba(255,255,255,0.35)] transition"
                >
                  Start building today
                </Link>
              </div>
            </div>
          </div>
        </section>

        <footer className="relative border-t border-white/10 py-12">
          <div className="max-w-6xl mx-auto px-6 sm:px-12 flex flex-col sm:flex-row justify-between gap-6 text-xs sm:text-sm text-[var(--lume-mist)]/60">
            <div>&copy; {new Date().getFullYear()} Lume. Crafted for storytellers.</div>
            <div className="flex gap-4">
              <Link href="/account" className="hover:text-white transition-colors">
                Account
              </Link>
              <Link href="/auth/signin" className="hover:text-white transition-colors">
                Sign in
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
