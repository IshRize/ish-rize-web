/**
 * Module: serverAuth
 * Layer:  lib (server-only)
 * Context: See COPILOT_CONTEXT.md, ARCHITECTURE.md §8 (auth & real-time at the edge)
 *
 * Purpose: Shared constants for the httpOnly session cookie used by the
 *          login/logout route handlers and the API proxy. The JWT never reaches
 *          client-side JS — only Next.js route handlers (server) read this cookie.
 */
export const SESSION_COOKIE = 'irw_token';

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24, // 24h, mirrors the backend's default JWT_EXPIRES_IN
};

export function backendBaseUrl(): string {
  const url = process.env.API_BASE_URL;
  if (!url) {
    throw new Error('API_BASE_URL is not set. Copy .env.example to .env.local and set it.');
  }
  return url.replace(/\/$/, '');
}
