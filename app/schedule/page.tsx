/**
 * Module: Schedule page
 * Layer:  web-page (client)
 * Context: See COPILOT_CONTEXT.md, IMPLEMENTATION_PLAN.md (Phase 2/3)
 *
 * Purpose: Render the master schedule grid for the selected organization and
 *          term, with client-side filtering and clash badges overlaid on
 *          affected cells. No write actions yet.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { vocab } from '@/lib/vocab';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { AppHeader } from '@/components/layout/AppHeader';
import { FilterBar, ALL, type ScheduleFilters } from '@/components/schedule/FilterBar';
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid';

export default function SchedulePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { organizationId, termId } = useScheduleSelectionStore();
  const [filters, setFilters] = useState<ScheduleFilters>({ unitId: ALL, level: ALL, kind: ALL, venueId: ALL });

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
  }, [authLoading, isAuthenticated, router]);

  const configQuery = useQuery({
    queryKey: ['org-config', organizationId],
    queryFn: () => schedulingApi.getOrgConfig(organizationId),
    enabled: !!organizationId,
  });

  const unitsQuery = useQuery({
    queryKey: ['org-units', organizationId],
    queryFn: () => schedulingApi.listOrgUnits(organizationId),
    enabled: !!organizationId,
  });

  const scheduleQuery = useQuery({
    queryKey: ['schedule', termId],
    queryFn: () => schedulingApi.getSchedule(termId),
    enabled: !!termId,
  });

  const clashesQuery = useQuery({
    queryKey: ['clashes', termId],
    queryFn: () => schedulingApi.getClashes(termId),
    enabled: !!termId,
  });

  const config = configQuery.data;
  const allUnits = useMemo(() => unitsQuery.data ?? [], [unitsQuery.data]);
  const allBookings = useMemo(() => scheduleQuery.data?.bookings ?? [], [scheduleQuery.data]);
  const timeSlots = scheduleQuery.data?.timeSlots ?? [];

  // Leaf units only (the deepest level present) — the bookable tier as columns;
  // full tree navigation is a later refinement.
  const leafUnits = useMemo(() => {
    if (allUnits.length === 0) return [];
    const maxDepth = Math.max(...allUnits.map((u) => u.depth));
    return allUnits.filter((u) => u.depth === maxDepth);
  }, [allUnits]);

  const filteredUnits = useMemo(
    () => (filters.unitId === ALL ? leafUnits : leafUnits.filter((u) => u.id === filters.unitId)),
    [leafUnits, filters.unitId],
  );

  const filteredBookings = useMemo(() => {
    return allBookings.filter((b) => {
      if (filters.unitId !== ALL && b.course.orgUnitId !== filters.unitId) return false;
      if (filters.level !== ALL && String(b.level ?? '') !== filters.level) return false;
      if (filters.kind !== ALL && b.course.kind !== filters.kind) return false;
      if (filters.venueId !== ALL && b.venue?.id !== filters.venueId) return false;
      return true;
    });
  }, [allBookings, filters]);

  if (authLoading || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)]">
        <p className="text-sm text-[var(--color-text-secondary)]">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)] p-6">
      <AppHeader title={vocab(config, 'unit') === 'Ministry' ? 'Service Schedule' : 'Master Schedule'} />

      <section className="mb-4">
        <FilterBar config={config} units={leafUnits} bookings={allBookings} filters={filters} onChange={setFilters} />
      </section>

      {scheduleQuery.isLoading ? (
        <p className="text-sm text-[var(--color-text-secondary)]">Loading schedule…</p>
      ) : scheduleQuery.isError ? (
        <p className="text-sm text-[var(--color-error)]">Failed to load schedule.</p>
      ) : (
        <ScheduleGrid
          timeSlots={timeSlots}
          units={filteredUnits}
          bookings={filteredBookings}
          clashes={clashesQuery.data}
        />
      )}
    </main>
  );
}
