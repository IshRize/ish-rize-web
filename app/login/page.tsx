/**
 * Module: Login page
 * Layer:  web-page (client)
 * Context: See COPILOT_CONTEXT.md; UI/UX redesign Phase 4
 *
 * Purpose: Authenticate against the backend via the httpOnly-cookie login route,
 *          then redirect to the schedule grid. Icon-prefixed inputs, a
 *          show/hide password toggle, and an error banner all mirror the
 *          mobile app's LoginScreen (icon names, the error-banner's tinted
 *          background using the existing --bg-clash/--fg-clash tokens) --
 *          the mobile app has no self-registration/forgot-password flow for
 *          this app's roles either, so neither is added here.
 */
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Icons } from '@/lib/icons';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('demo.lecturer@ug.edu.gh');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      router.push('/schedule');
    } catch {
      // error is already set on the store
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--fg-primary)]">IshRize</h1>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">Sign in to view the master schedule.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6"
        >
          <h2 className="text-base font-semibold text-[var(--fg-primary)]">Sign In</h2>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-[var(--fg-clash)]/30 bg-[var(--bg-clash)] px-3 py-2">
              <Icons.alertCircle size={18} className="mt-0.5 shrink-0 text-[var(--fg-clash)]" />
              <p className="text-sm text-[var(--fg-clash)]">{error}</p>
            </div>
          )}

          <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
            Email
            <div className="relative">
              <Icons.email size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] py-2 pl-9 pr-3 text-sm text-[var(--fg-primary)]"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
            Password
            <div className="relative">
              <Icons.lock size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] py-2 pl-9 pr-9 text-sm text-[var(--fg-primary)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
              >
                {showPassword ? <Icons.eyeOff size={18} /> : <Icons.eye size={18} />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-[var(--accent-primary)] px-3 py-2 text-sm font-medium text-[var(--fg-on-accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
          >
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
