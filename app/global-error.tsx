'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div
          style={{
            display: 'flex',
            minHeight: '100vh',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backgroundColor: 'var(--background, #fff)',
            color: 'var(--foreground, #111)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <AlertTriangle
              size={64}
              style={{ margin: '0 auto 1rem', color: '#ef4444', opacity: 0.6 }}
            />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>
              Something went wrong
            </h1>
            <p style={{ marginTop: '0.5rem', color: '#6b7280' }}>
              A critical error occurred. Please try again.
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: '1.5rem',
                padding: '0.5rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#fff',
                backgroundColor: '#18181b',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
