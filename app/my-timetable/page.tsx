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

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { useScheduleSocket } from '@/hooks/useScheduleSocket';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppShell } from '@/components/layout/AppShell';
import { LiveSyncIndicator } from '@/components/ui/LiveSyncIndicator';
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid';
import { dayLabel } from '@/lib/dayNames';

const ALL_ORGS = '';

export default function MyTimetablePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { organizationId, termId } = useScheduleSelectionStore();
  // Per-page UI preference, not shared global state -- "all my orgs" is a
  // view mode for this page only, not a context every other page should
  // inherit (Schedule/Master Timetable/etc. stay single-org via the
  // Sidebar's OrgSwitcher).
  const [unified, setUnified] = useState(false);
  const [orgFilter, setOrgFilter] = useState(ALL_ORGS);

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
  }, [authLoading, isAuthenticated, router]);

  // Live: my own grid and scheduled hours update when a coordinator changes
  // any of my bookings in this term.
  const { connected } = useScheduleSocket(termId);

  const myHostQuery = useQuery({
    queryKey: ['my-host', organizationId],
    queryFn: () => schedulingApi.getMyHost(organizationId),
    enabled: !!isAuthenticated && !!organizationId,
  });
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
  const unifiedQuery = useQuery({
    queryKey: ['my-timetable-unified'],
    queryFn: () => schedulingApi.getMyUnifiedTimetable(),
    enabled: unified && !!isAuthenticated,
  });

  const myHost = myHostQuery.data;
  const myBookings = (scheduleQuery.data?.bookings ?? []).filter((b) => b.host?.id === myHost?.id);
  const load = loadQuery.data;
  const unifiedOrgs = useMemo(() => unifiedQuery.data ?? [], [unifiedQuery.data]);
  const visibleUnifiedOrgs = useMemo(
    () => (orgFilter === ALL_ORGS ? unifiedOrgs : unifiedOrgs.filter((o) => o.organizationId === orgFilter)),
    [unifiedOrgs, orgFilter],
  );

  if (authLoading || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
      </main>
    );
  }

  return (
    <AppShell>
      <AppHeader title="My Timetable" endSlot={<LiveSyncIndicator connected={connected} />} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-md border border-[var(--border-default)] text-xs">
          <button
            type="button"
            onClick={() => setUnified(false)}
            className={`px-3 py-1.5 ${!unified ? 'bg-[var(--accent-primary)] text-[var(--fg-on-accent-primary)]' : 'text-[var(--fg-muted)]'}`}
          >
            This organization
          </button>
          <button
            type="button"
            onClick={() => setUnified(true)}
            className={`px-3 py-1.5 ${unified ? 'bg-[var(--accent-primary)] text-[var(--fg-on-accent-primary)]' : 'text-[var(--fg-muted)]'}`}
          >
            All my organizations
          </button>
        </div>
        {unified && unifiedOrgs.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setOrgFilter(ALL_ORGS)}
              className={`rounded-full border px-2.5 py-1 text-xs ${orgFilter === ALL_ORGS ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]' : 'border-[var(--border-default)] text-[var(--fg-muted)]'}`}
            >
              All
            </button>
            {unifiedOrgs.map((o) => (
              <button
                key={o.organizationId}
                type="button"
                onClick={() => setOrgFilter(o.organizationId)}
                className={`rounded-full border px-2.5 py-1 text-xs ${orgFilter === o.organizationId ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]' : 'border-[var(--border-default)] text-[var(--fg-muted)]'}`}
              >
                {o.organizationName}
              </button>
            ))}
          </div>
        )}
      </div>

      {unified ? (
        unifiedQuery.isLoading ? (
          <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
        ) : visibleUnifiedOrgs.every((o) => o.bookings.length === 0) ? (
          <p className="text-sm text-[var(--fg-muted)]">No teaching assignments found across your organizations.</p>
        ) : (
          <div className="space-y-4">
            {visibleUnifiedOrgs.map((o) => (
              <section key={o.organizationId} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
                <h2 className="text-sm font-semibold text-[var(--fg-primary)]">
                  {o.organizationName} {o.termName && <span className="text-xs font-normal text-[var(--fg-muted)]">· {o.termName}</span>}
                </h2>
                {o.bookings.length === 0 ? (
                  <p className="mt-2 text-xs text-[var(--fg-muted)]">No teaching assignments here.</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-xs text-[var(--fg-muted)]">
                    {o.bookings.map((b) => (
                      <li key={b.id}>
                        <span className="font-medium text-[var(--fg-primary)]">{b.course.code}</span> — {dayLabel(b.timeSlot.dayOfWeek)}{' '}
                        {b.timeSlot.startTime}–{b.timeSlot.endTime} · {b.venue?.name ?? 'TBD'}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )
      ) : (
        <>
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
        </>
      )}
    </AppShell>
  );
}
