/**
 * Module: Clashes report page
 * Layer:  web-page (client)
 * Context: See COPILOT_CONTEXT.md, IMPLEMENTATION_PLAN.md (Phase 3)
 *
 * Purpose: List every clash the backend's Clash Detection Engine finds for the
 *          selected term — venue, host, and group conflicts — with enough detail
 *          to act on. The grid shows the same data inline via ClashBadge; this
 *          page is the dedicated report view.
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppShell } from '@/components/layout/AppShell';
import type { Clash } from '@/types/scheduling';

const CLASH_LABEL: Record<Clash['type'], string> = {
  VENUE: 'Venue clash',
  HOST: 'Host clash',
  GROUP: 'Group clash',
};

function ClashRow({ clash }: { clash: Clash }) {
  const who = clash.detail.venueName ?? clash.detail.hostName ?? clash.detail.groupName;
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--fg-clash)]/30 bg-[var(--bg-clash)] px-4 py-3">
      <div>
        <span className="rounded-full bg-[var(--fg-clash)] px-2 py-0.5 text-xs font-semibold text-[var(--fg-on-accent-primary)]">
          {CLASH_LABEL[clash.type]}
        </span>
        {who && <span className="ml-2 text-sm font-medium text-[var(--fg-clash)]">{who}</span>}
      </div>
      <div className="text-sm text-[var(--fg-clash)]">{clash.detail.activityCodes.join(' vs ')}</div>
    </div>
  );
}

export default function ClashesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { termId } = useScheduleSelectionStore();

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
  }, [authLoading, isAuthenticated, router]);

  const clashesQuery = useQuery({
    queryKey: ['clashes', termId],
    queryFn: () => schedulingApi.getClashes(termId),
    enabled: !!termId,
  });

  if (authLoading || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
      </main>
    );
  }

  const clashes = clashesQuery.data ?? [];

  return (
    <AppShell>
      <AppHeader title="Clash Report" />

      {clashesQuery.isLoading ? (
        <p className="text-sm text-[var(--fg-muted)]">Checking for clashes…</p>
      ) : clashesQuery.isError ? (
        <p className="text-sm text-[var(--fg-clash)]">Failed to load clashes.</p>
      ) : clashes.length === 0 ? (
        <p className="text-sm text-[var(--fg-free-slot)]">No clashes for this term.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {clashes.map((clash, i) => (
            <ClashRow key={`${clash.type}-${clash.timeSlotId}-${i}`} clash={clash} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
