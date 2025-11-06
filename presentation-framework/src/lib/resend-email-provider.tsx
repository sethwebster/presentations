import type { EmailConfig, EmailUserConfig } from 'next-auth/providers/email';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import React from 'react';
import VerificationEmail from '@/emails/VerificationEmail';

/**
 * Custom Resend-based Email provider for NextAuth
 * This bypasses nodemailer completely
 */
export function ResendEmailProvider(
  options: EmailUserConfig
): EmailConfig {
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

  return {
    id: 'email',
    type: 'email',
    name: 'Email',
    from: options.from || process.env.EMAIL_FROM || process.env.RESEND_FROM || 'noreply@example.com',
    maxAge: options.maxAge || 24 * 60 * 60, // 24 hours
    async sendVerificationRequest({ identifier: email, url, provider, theme }) {
      if (!resend) {
        throw new Error('Resend API key not configured. Set RESEND_API_KEY in your environment variables.');
      }

      try {
        const emailHtml = await render(<VerificationEmail url={url} />);
        
        await resend.emails.send({
          from: provider.from as string,
          to: email,
          subject: 'Sign in to Lume',
          html: emailHtml,
        });
      } catch (error) {
        console.error('Failed to send verification email:', error);
        throw new Error(`Failed to send verification email: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    options,
  };
}

