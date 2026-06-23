/**
 * Module: Admin hub
 * Layer:  web-page (client)
 * Context: See COPILOT_CONTEXT.md
 *
 * Purpose: Landing page for ADMIN-only management screens. "Academic affairs"
 *          is just an ADMIN doing this work, not a separate role.
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { AppHeader } from '@/components/layout/AppHeader';

const SECTIONS = [
  {
    href: '/admin/departments',
    title: 'Departments',
    description: 'Create, rename, and archive departments as the real structure becomes known.',
  },
  {
    href: '/admin/coordinators',
    title: 'Department coordinators',
    description: "Grant or revoke a lecturer's permission to manage a specific department's timetable.",
  },
  {
    href: '/admin/subject-mappings',
    title: 'Subject → department mappings',
    description: 'Map a Master Timetable subject code to the department that owns it.',
  },
];

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
    else if (!authLoading && user && user.role !== 'ADMIN') router.replace('/schedule');
  }, [authLoading, isAuthenticated, user, router]);

  if (authLoading || !isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] p-6">
      <AppHeader title="Admin" />
      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 hover:bg-[var(--bg-alternate)]"
          >
            <h2 className="text-base font-semibold text-[var(--fg-primary)]">{s.title}</h2>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">{s.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
