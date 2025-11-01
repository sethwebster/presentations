"use client";

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const githubIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

export default function SignInPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/account';
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGitHubSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn('github', { callbackUrl });
    } catch {
      setIsLoading(false);
      setError('GitHub sign-in failed. Please try again.');
    }
  };

  const handleMagicLink = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage(null);
    setError(null);
    try {
      const result = await signIn('email', {
        email,
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      setSuccessMessage('Magic link sent! Check your inbox to continue.');
      setEmail('');
    } catch {
      setError('Unable to send magic link right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--lume-midnight)] text-[var(--lume-mist)] relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute -top-24 -left-32 h-72 w-72 rounded-full bg-[rgba(22,194,199,0.25)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[32rem] w-[32rem] rounded-full bg-[rgba(200,75,210,0.2)] blur-[160px]" />
      </div>

      <div className="relative flex flex-col min-h-screen lg:flex-row">
        <div className="flex-col justify-between hidden px-16 py-20 lg:flex lg:w-1/2 text-white/90">
          <Link href="/" className="flex items-center gap-3">
            <span className="relative inline-flex items-center justify-center">
              <span className="absolute inset-0 bg-[var(--lume-primary)]/35 blur-xl rounded-full" />
              <Image
                src="/assets/logo-small.png"
                alt="Lume logo"
                width={44}
                height={44}
                className="relative h-11 w-11"
                priority
              />
            </span>
            <span className="text-sm uppercase tracking-[0.4em] text-[var(--lume-primary)]/80">Lume</span>
          </Link>

          <div className="space-y-8">
            <h1 className="text-5xl font-light leading-tight">
              Welcome back to the presentation editor built for designers and visionaries.
            </h1>
            <p className="text-[var(--lume-mist)]/75 text-base max-w-xl leading-relaxed">
              Sign in to continue crafting live, AI-assisted experiences. Your decks, assets, and collaboration tools are ready
              where you left them.
            </p>
          </div>

          <div className="space-y-2 text-xs text-[var(--lume-mist)]/60">
            <p>Need an account? Request early access at hello@lume.studio</p>
            <p>Protecting your team’s story with secure, modern authentication.</p>
          </div>
        </div>

        <div className="flex items-center justify-center flex-1 px-6 py-12">
          <Card className="w-full max-w-md border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_25px_60px_rgba(15,15,30,0.35)]">
            <CardContent className="p-8 space-y-8 sm:p-10">
              <div className="flex justify-center">
                <Link href="/" aria-label="Lume home" className="relative inline-flex items-center justify-center">
                  <span className="absolute inset-0 bg-[var(--lume-primary)]/35 blur-xl rounded-full" />
                  <Image
                    src="/assets/logo-small.png"
                    alt="Lume logo"
                    width={56}
                    height={56}
                    className="relative h-14 w-14"
                  />
                </Link>
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-light text-white">Sign in to Lume</h2>
                <p className="text-sm text-[var(--lume-mist)]/70">
                  Continue with GitHub or request a magic link. You’ll be back in the editor in seconds.
                </p>
              </div>

              <div className="space-y-4">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleGitHubSignIn}
                  className={cn(
                    'w-full inline-flex items-center justify-center gap-3 rounded-full px-5 py-3 text-sm font-medium',
                    'bg-white text-[var(--lume-midnight)] shadow-[0_18px_40px_rgba(255,255,255,0.25)] transition-all duration-200',
                    'hover:shadow-[0_22px_50px_rgba(255,255,255,0.35)] hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed'
                  )}
                >
                  {githubIcon}
                  Continue with GitHub
                </button>

                <div className="relative flex items-center text-xs uppercase tracking-[0.4em] text-[var(--lume-mist)]/40">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="px-4">or</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <form onSubmit={handleMagicLink} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs uppercase tracking-[0.3em] text-[var(--lume-mist)]/60">
                      Work email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@studio.com"
                      required
                      disabled={isLoading}
                      className="bg-white/[0.08] border border-white/15 text-white placeholder:text-[var(--lume-mist)]/40"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !email}
                    className={cn(
                      'w-full rounded-full px-5 py-3 text-sm font-medium transition-all duration-200',
                      'bg-[var(--lume-primary)] text-[var(--lume-midnight)] shadow-[0_18px_40px_rgba(22,194,199,0.35)]',
                      'hover:shadow-[0_22px_50px_rgba(22,194,199,0.45)] hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed'
                    )}
                  >
                    {isLoading ? 'Sending magic link…' : 'Send magic link'}
                  </button>
                </form>
              </div>

              {successMessage && (
                <div className="rounded-lg border border-[var(--lume-primary)]/40 bg-[var(--lume-primary)]/10 px-4 py-3 text-sm text-[var(--lume-primary)]">
                  {successMessage}
                </div>
              )}

              {error && (
                <div className="px-4 py-3 text-sm text-red-300 border rounded-lg border-red-400/40 bg-red-500/10">
                  {error}
                </div>
              )}

              <div className="text-xs text-[var(--lume-mist)]/50 text-center leading-relaxed">
                By signing in you agree to our{' '}
                <Link href="/legal/terms" className="text-[var(--lume-primary)] hover:text-[var(--lume-accent)]">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/legal/privacy" className="text-[var(--lume-primary)] hover:text-[var(--lume-accent)]">
                  Privacy Policy
                </Link>
                .
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

