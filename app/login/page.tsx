/**
 * Module: Login page
 * Layer:  web-page (client)
 * Context: See COPILOT_CONTEXT.md
 *
 * Purpose: Authenticate against the backend via the httpOnly-cookie login route,
 *          then redirect to the schedule grid.
 */
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('demo.lecturer@ug.edu.gh');
  const [password, setPassword] = useState('');

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
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6"
      >
        <h1 className="text-lg font-semibold text-[var(--fg-primary)]">IshRize Schedule</h1>
        <p className="text-sm text-[var(--fg-muted)]">Sign in to view the master schedule.</p>

        <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--fg-primary)]"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--fg-primary)]"
          />
        </label>

        {error && <p className="text-sm text-[var(--fg-clash)]">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-[var(--accent-primary)] px-3 py-2 text-sm font-medium text-[var(--fg-on-accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
        >
          {isLoading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
