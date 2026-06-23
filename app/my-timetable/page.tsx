/**
 * Module: My Timetable page
 * Layer:  web-page (client)
 * Context: See COPILOT_CONTEXT.md; three-tier timetable refactor Phase 4
 *
 * Purpose: A lecturer's personal, read-only timetable -- exactly the existing
 *          schedule filtered to Bookings where host.id is their own Host
 *          record, across whichever departments they teach in. Reuses
 *          ScheduleGrid as-is (canEdit=false) rather than a separate grid
 *          component -- this is the same axis model, just a narrower row set.
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { AppHeader } from '@/components/layout/AppHeader';
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid';

export default function MyTimetablePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { organizationId, termId } = useScheduleSelectionStore();

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
  }, [authLoading, isAuthenticated, router]);

  const myHostQuery = useQuery({ queryKey: ['my-host'], queryFn: () => schedulingApi.getMyHost(), enabled: !!isAuthenticated });
  const configQuery = useQuery({
    queryKey: ['org-config', organizationId],
    queryFn: () => schedulingApi.getOrgConfig(organizationId),
    enabled: !!organizationId,
  });
  const scheduleQuery = useQuery({
    queryKey: ['schedule', termId],
    queryFn: () => schedulingApi.getSchedule(termId),
    enabled: !!termId,
  });

  const myHost = myHostQuery.data;
  const myBookings = (scheduleQuery.data?.bookings ?? []).filter((b) => b.host?.id === myHost?.id);

  if (authLoading || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] p-6">
      <AppHeader title="My Timetable" />

      {myHostQuery.isLoading || scheduleQuery.isLoading ? (
        <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
      ) : !myHost ? (
        <p className="text-sm text-[var(--fg-muted)]">You don&apos;t have a teaching record for this organization.</p>
      ) : myBookings.length === 0 ? (
        <p className="text-sm text-[var(--fg-muted)]">No teaching assignments yet for this term.</p>
      ) : (
        <ScheduleGrid timeSlots={scheduleQuery.data?.timeSlots ?? []} weekDays={configQuery.data?.weekDays ?? []} bookings={myBookings} canEdit={false} />
      )}
    </main>
  );
}
