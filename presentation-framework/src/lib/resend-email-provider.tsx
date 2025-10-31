import type { EmailConfig, EmailUserConfig } from 'next-auth/providers/email';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import React from 'react';
import { VerificationEmail } from '../emails/VerificationEmail';

/**
 * Custom Resend-based Email provider for NextAuth
 * This bypasses nodemailer completely
 */
export function ResendEmailProvider(
  options: EmailUserConfig
): EmailConfig {
  const defaultFromAddress = process.env.EMAIL_FROM || process.env.RESEND_FROM || 'onboarding@resend.dev';

  return {
    id: 'email',
    type: 'email',
    name: 'Email',
    from: options.from || defaultFromAddress,
    maxAge: options.maxAge || 24 * 60 * 60, // 24 hours
    async sendVerificationRequest({ identifier: email, url, provider }) {
      console.log('[Lume] sendVerificationRequest called:', { email, url: url.substring(0, 50) + '...' });
      
      // Initialize Resend client inside the function to ensure env vars are available
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        console.warn('[Lume] RESEND_API_KEY not set. Logging magic link URL for development:', url);
        console.log('[Lume] Magic link URL:', url);
        return;
      }

      const resend = new Resend(apiKey);
      const fromAddress = (provider.from as string) || defaultFromAddress;

      console.log('[Lume] Sending email via Resend:', { from: fromAddress, to: email });

      try {
        // Add email to URL in obfuscated form (base64 encoded) so we can extract it in the callback
        // This ensures we can capture the email even if NextAuth doesn't pass it correctly
        const urlObj = new URL(url);
        const emailEncoded = Buffer.from(email).toString('base64url');
        urlObj.searchParams.set('e', emailEncoded); // 'e' for email (obfuscated)
        
        const urlWithEmail = urlObj.toString();
        console.log('[Lume] URL with obfuscated email:', urlWithEmail.substring(0, 100) + '...');
        
        // Get base URL for logo images
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const emailHtml = await render(<VerificationEmail url={urlWithEmail} baseUrl={baseUrl} />);
        
        const result = await resend.emails.send({
          from: fromAddress,
          to: email,
          subject: 'Sign in to Lume',
          html: emailHtml,
        });

        console.log('[Lume] Resend API response:', result);
        
        if (result.error) {
          console.error('[Lume] Resend API error:', result.error);
          throw new Error(`Resend API error: ${JSON.stringify(result.error)}`);
        }

        console.log('[Lume] Email sent successfully! Message ID:', result.data?.id);
      } catch (error) {
        console.error('[Lume] Failed to send verification email:', error);
        if (error instanceof Error) {
          console.error('[Lume] Error details:', {
            message: error.message,
            stack: error.stack,
          });
        }
        throw new Error(`Failed to send verification email: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    options,
  };
}

