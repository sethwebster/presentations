"use client";

import { useSearchParams } from 'next/navigation';

export default function VerifyRequestPage() {
  const searchParams = useSearchParams();
  const email = searchParams?.get('email') || 'your email';

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--lume-midnight)', color: 'var(--lume-mist)' }}>
      <div className="max-w-md w-full p-8 text-center" style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px' }}>
        <div className="mb-6">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-3xl font-light mb-4">Check your email</h1>
        <p className="mb-6" style={{ color: 'var(--lume-mist)', opacity: 0.8 }}>
          A sign in link has been sent to <strong>{email}</strong>
        </p>
        <p className="text-sm" style={{ color: 'var(--lume-mist)', opacity: 0.6 }}>
          Click the link in the email to sign in. The link will expire in 24 hours.
        </p>
      </div>
    </div>
  );
}

