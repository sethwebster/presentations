import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Link,
  Section,
  Img,
  Hr,
} from '@react-email/components';
import * as React from 'react';

interface VerificationEmailProps {
  url: string;
  baseUrl?: string;
}

function VerificationEmail({ url, baseUrl = 'http://localhost:3000' }: VerificationEmailProps) {
  return (
    <Html>
      <Head />
      <Body
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          backgroundColor: '#0f0f1e',
          color: '#e0e0e0',
          margin: 0,
          padding: 0,
        }}
      >
        <Container
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '40px 20px',
          }}
        >
          {/* Header with logo */}
          <Section style={{ textAlign: 'center', marginBottom: '40px' }}>
            <Img
              src={`${baseUrl}/assets/logo-small.png`}
              alt="Lume"
              width="48"
              height="48"
              style={{
                marginBottom: '16px',
                borderRadius: '8px',
              }}
            />
            <Text
              style={{
                fontSize: '12px',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: '#16c2c7',
                margin: 0,
                fontWeight: '500',
              }}
            >
              Lume Presentation Studio
            </Text>
          </Section>

          {/* Main content card */}
          <Section
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              borderRadius: '16px',
              padding: '48px 40px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            }}
          >
            <Heading
              style={{
                color: '#ffffff',
                fontSize: '28px',
                fontWeight: '300',
                marginBottom: '16px',
                marginTop: 0,
                lineHeight: '1.3',
              }}
            >
              Sign in to your account
            </Heading>

            <Text
              style={{
                color: '#b0b0b0',
                fontSize: '16px',
                lineHeight: '1.6',
                marginBottom: '32px',
                marginTop: 0,
              }}
            >
              Click the button below to securely sign in to Lume. This magic link will expire in 24 hours and can only be used once.
            </Text>

            {/* CTA Button */}
            <Section style={{ textAlign: 'center', marginBottom: '32px' }}>
              <Link
                href={url}
                style={{
                  display: 'inline-block',
                  backgroundColor: '#16c2c7',
                  color: '#0f0f1e',
                  padding: '16px 32px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '16px',
                  letterSpacing: '0.02em',
                  boxShadow: '0 8px 24px rgba(22, 194, 199, 0.35)',
                  transition: 'all 0.2s ease',
                }}
              >
                Sign in to Lume
              </Link>
            </Section>

            {/* Alternative link */}
            <Section style={{ marginBottom: '32px' }}>
              <Text
                style={{
                  color: '#808080',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  margin: 0,
                  textAlign: 'center',
                }}
              >
                Or copy and paste this link into your browser:
              </Text>
              <Text
                style={{
                  color: '#16c2c7',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  margin: '8px 0 0 0',
                  wordBreak: 'break-all',
                  textAlign: 'center',
                  fontFamily: 'monospace',
                }}
              >
                {url}
              </Text>
            </Section>

            <Hr
              style={{
                borderColor: 'rgba(255, 255, 255, 0.1)',
                margin: '32px 0',
              }}
            />

            {/* Footer */}
            <Text
              style={{
                color: '#666',
                fontSize: '13px',
                lineHeight: '1.5',
                margin: 0,
                textAlign: 'center',
              }}
            >
              If you didn&apos;t request this email, you can safely ignore it. This link will expire in 24 hours.
            </Text>
          </Section>

          {/* Bottom branding */}
          <Section style={{ marginTop: '40px', textAlign: 'center' }}>
            <Text
              style={{
                color: '#666',
                fontSize: '12px',
                lineHeight: '1.5',
                margin: 0,
              }}
            >
              © {new Date().getFullYear()} Lume. Crafted for storytellers.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default VerificationEmail;

