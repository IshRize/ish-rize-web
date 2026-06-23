/**
 * Module: Master Timetable page
 * Layer:  web-page (client)
 * Context: See COPILOT_CONTEXT.md; three-tier timetable refactor Phase 4
 *
 * Purpose: Read-only view of the Master Timetable -- exactly what the most
 *          recent ingestion produced, with no Course/Host resolved into it.
 *          Visible to everyone (a lecturer needs this to know time/venue
 *          before a department coordinator has decomposed their subject into
 *          a named offering); editable only by re-uploading via /ingestion
 *          (ADMIN-only there), not inline here.
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { AppHeader } from '@/components/layout/AppHeader';
import { MasterTimetableGrid } from '@/components/master-timetable/MasterTimetableGrid';
import { Select } from '@/components/ui/Select';

const ALL_LEVELS = '';

export default function MasterTimetablePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { organizationId, termId } = useScheduleSelectionStore();
  const [levelFilter, setLevelFilter] = useState(ALL_LEVELS);

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
  const slotsQuery = useQuery({
    queryKey: ['master-slots', termId],
    queryFn: () => schedulingApi.listMasterSlots(termId),
    enabled: !!termId,
  });

  const allSlots = slotsQuery.data ?? [];
  const levels = Array.from(new Set(allSlots.map((s) => s.level).filter((l): l is number => l != null))).sort((a, b) => a - b);
  const filteredSlots = levelFilter === ALL_LEVELS ? allSlots : allSlots.filter((s) => String(s.level ?? '') === levelFilter);

  if (authLoading || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] p-6">
      <AppHeader title="Master Timetable" />

      <section className="mb-4 flex flex-wrap gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
        <Select
          label="Level"
          value={levelFilter}
          onChange={setLevelFilter}
          options={[{ value: ALL_LEVELS, label: 'All levels' }, ...levels.map((l) => ({ value: String(l), label: String(l) }))]}
        />
      </section>

      {slotsQuery.isLoading ? (
        <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
      ) : allSlots.length === 0 ? (
        <p className="text-sm text-[var(--fg-muted)]">No master timetable has been uploaded for this term yet.</p>
      ) : (
        <MasterTimetableGrid slots={filteredSlots} weekDays={configQuery.data?.weekDays ?? []} />
      )}
    </main>
  );
}
