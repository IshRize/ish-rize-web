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
  const loadQuery = useQuery({
    queryKey: ['my-teaching-load', termId],
    queryFn: () => schedulingApi.getMyTeachingLoad(termId),
    enabled: !!termId,
  });

  const myHost = myHostQuery.data;
  const myBookings = (scheduleQuery.data?.bookings ?? []).filter((b) => b.host?.id === myHost?.id);
  const load = loadQuery.data;

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

      {load && load.bookingCount > 0 && (
        <section className="mb-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
          <h2 className="text-sm font-semibold text-[var(--fg-primary)]">My teaching load this term</h2>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">Scheduled hours, a proxy for time on campus -- not measured attendance.</p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <span className="text-[var(--fg-primary)]">
              {(load.totalMinutes / 60).toFixed(1)}h total · {load.bookingCount} booking(s)
            </span>
          </div>
          <ul className="mt-2 space-y-1 text-xs text-[var(--fg-muted)]">
            {load.courses.map((c) => (
              <li key={c.courseId}>
                {c.code} — {(c.minutes / 60).toFixed(1)}h ({c.bookingCount} booking(s))
              </li>
            ))}
          </ul>
        </section>
      )}

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
