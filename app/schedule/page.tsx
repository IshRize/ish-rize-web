/**
 * Module: Schedule page
 * Layer:  web-page (client)
 * Context: See COPILOT_CONTEXT.md, IMPLEMENTATION_PLAN.md (Phase 2)
 *
 * Purpose: Render the read-only master schedule grid for a chosen organization
 *          and term, with client-side filtering. No write actions in Phase 2.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { vocab } from '@/lib/vocab';
import { useAuthStore } from '@/stores/authStore';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Select } from '@/components/ui/Select';
import { FilterBar, ALL, type ScheduleFilters } from '@/components/schedule/FilterBar';
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid';

export default function SchedulePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, loadUser, logout } = useAuthStore();

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
  }, [authLoading, isAuthenticated, router]);

  const [organizationId, setOrganizationId] = useState<string>('');
  const [termId, setTermId] = useState<string>('');
  const [filters, setFilters] = useState<ScheduleFilters>({ unitId: ALL, level: ALL, kind: ALL, venueId: ALL });

  const orgsQuery = useQuery({
    queryKey: ['organizations'],
    queryFn: schedulingApi.listOrganizations,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!organizationId && orgsQuery.data?.[0]) setOrganizationId(orgsQuery.data[0].id);
  }, [organizationId, orgsQuery.data]);

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

  const termsQuery = useQuery({
    queryKey: ['terms', organizationId],
    queryFn: () => schedulingApi.listTerms(organizationId),
    enabled: !!organizationId,
  });

  useEffect(() => {
    if (termsQuery.data?.length) {
      const stillValid = termsQuery.data.some((t) => t.id === termId);
      if (!stillValid) setTermId(termsQuery.data[0].id);
    }
  }, [termId, termsQuery.data]);

  const scheduleQuery = useQuery({
    queryKey: ['schedule', termId],
    queryFn: () => schedulingApi.getSchedule(termId),
    enabled: !!termId,
  });

  const config = configQuery.data;
  const allUnits = useMemo(() => unitsQuery.data ?? [], [unitsQuery.data]);
  const allBookings = useMemo(() => scheduleQuery.data?.bookings ?? [], [scheduleQuery.data]);
  const timeSlots = scheduleQuery.data?.timeSlots ?? [];

  // Leaf units only (the deepest level present) — Phase 2 shows the bookable
  // tier as columns; full tree navigation is a later refinement.
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
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            {vocab(config, 'unit') === 'Ministry' ? 'Service Schedule' : 'Master Schedule'}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Signed in as {user?.firstName} {user?.lastName} ({user?.role})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => logout().then(() => router.push('/login'))}
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="mb-4 flex flex-wrap gap-3">
        <Select
          label="Organization"
          value={organizationId}
          onChange={setOrganizationId}
          options={(orgsQuery.data ?? []).map((o) => ({ value: o.id, label: o.name }))}
        />
        <Select
          label="Term"
          value={termId}
          onChange={setTermId}
          options={(termsQuery.data ?? []).map((t) => ({ value: t.id, label: t.name }))}
        />
      </section>

      <section className="mb-4">
        <FilterBar config={config} units={leafUnits} bookings={allBookings} filters={filters} onChange={setFilters} />
      </section>

      {scheduleQuery.isLoading ? (
        <p className="text-sm text-[var(--color-text-secondary)]">Loading schedule…</p>
      ) : scheduleQuery.isError ? (
        <p className="text-sm text-[var(--color-error)]">Failed to load schedule.</p>
      ) : (
        <ScheduleGrid timeSlots={timeSlots} units={filteredUnits} bookings={filteredBookings} />
      )}
    </main>
  );
}
