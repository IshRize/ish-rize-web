/**
 * Module: Teaching Load page
 * Layer:  web-page (client)
 * Context: See COPILOT_CONTEXT.md; three-tier timetable refactor Phase 5
 *
 * Purpose: A department coordinator's (or ADMIN's) view of every lecturer's
 *          scheduled hours, course count, and venue spread for a department --
 *          coordinator-management data, so this stays scoped to departments
 *          the user can actually manage rather than opened to everyone the
 *          way department-timetable reads are. "Scheduled hours" is a proxy
 *          for time on campus, not real swipe-based presence.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppShell } from '@/components/layout/AppShell';
import { Select } from '@/components/ui/Select';

function formatHours(minutes: number): string {
  const hours = minutes / 60;
  return hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(1)}h`;
}

export default function TeachingLoadPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { organizationId, termId } = useScheduleSelectionStore();
  const [orgUnitId, setOrgUnitId] = useState('');

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
  }, [authLoading, isAuthenticated, router]);

  const isAdmin = user?.role === 'ADMIN';

  const allUnitsQuery = useQuery({
    queryKey: ['org-units', organizationId],
    queryFn: () => schedulingApi.listOrgUnits(organizationId),
    enabled: !!organizationId && isAdmin,
  });
  const myAssignmentsQuery = useQuery({
    queryKey: ['my-coordinator-assignments'],
    queryFn: () => schedulingApi.listMyCoordinatorAssignments(),
    enabled: !!isAuthenticated && !isAdmin,
  });

  // Unlike department-timetable, this picker only offers departments the
  // user can actually manage -- this is coordinator-management data, not
  // general schedule structure.
  const manageableDepartments = useMemo(() => {
    if (isAdmin) return (allUnitsQuery.data ?? []).map((u) => ({ id: u.id, name: u.name }));
    return (myAssignmentsQuery.data ?? []).map((a) => a.orgUnit);
  }, [isAdmin, allUnitsQuery.data, myAssignmentsQuery.data]);

  useEffect(() => {
    if (!orgUnitId && manageableDepartments.length > 0) setOrgUnitId(manageableDepartments[0].id);
  }, [orgUnitId, manageableDepartments]);

  const loadQuery = useQuery({
    queryKey: ['teaching-load', termId, orgUnitId],
    queryFn: () => schedulingApi.getTeachingLoad(termId, orgUnitId),
    enabled: !!termId && !!orgUnitId,
  });

  if (authLoading || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
      </main>
    );
  }

  return (
    <AppShell>
      <AppHeader title="Teaching Load" />

      <section className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        <Select
          label="Department"
          value={orgUnitId}
          onChange={setOrgUnitId}
          options={manageableDepartments.map((d) => ({ value: d.id, label: d.name }))}
        />
      </section>

      <p className="mb-3 text-xs text-[var(--fg-muted)]">
        Scheduled hours are a proxy for time on campus, not measured attendance.
      </p>

      {!isAdmin && manageableDepartments.length === 0 && (
        <p className="text-sm text-[var(--fg-muted)]">
          You aren&apos;t a department timetable coordinator for any department yet. Ask an admin to assign you one.
        </p>
      )}

      {orgUnitId && (
        <>
          {loadQuery.isLoading ? (
            <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
          ) : (loadQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-[var(--fg-muted)]">No bookings yet for this department this term.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-[var(--accent-secondary)]">
                  <tr>
                    {['Lecturer', 'Hours', 'Courses', 'Venues', 'Bookings'].map((h) => (
                      <th key={h} className="border-b border-[var(--border-default)] px-3 py-2 text-left text-xs font-semibold text-[var(--fg-on-accent-primary)]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(loadQuery.data ?? []).map((entry) => (
                    <tr key={entry.hostId ?? 'unassigned'} className="even:bg-[var(--bg-alternate)]/60 hover:bg-[var(--bg-alternate)]">
                      <td className="border-b border-[var(--border-default)] px-3 py-2 text-[var(--fg-primary)]">{entry.displayName}</td>
                      <td className="border-b border-[var(--border-default)] px-3 py-2 tabular-nums text-[var(--fg-primary)]">
                        {formatHours(entry.totalMinutes)}
                      </td>
                      <td className="border-b border-[var(--border-default)] px-3 py-2 tabular-nums text-[var(--fg-muted)]">{entry.courseCount}</td>
                      <td className="border-b border-[var(--border-default)] px-3 py-2 tabular-nums text-[var(--fg-muted)]">{entry.venueCount}</td>
                      <td className="border-b border-[var(--border-default)] px-3 py-2 tabular-nums text-[var(--fg-muted)]">{entry.bookingCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
