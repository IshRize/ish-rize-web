/**
 * Module: Master Timetable page
 * Layer:  web-page (client)
 * Context: See COPILOT_CONTEXT.md; three-tier timetable refactor Phase 4
 *
 * Purpose: Read-only view of the Master Timetable -- exactly what the most
 *          recent ingestion produced, with no Course/Host resolved into it.
 *          Visible only to department coordinators and ADMIN (a coordinator
 *          needs this to know what to decompose; everyone else gets the
 *          cleaned-up department/personal timetables instead -- the backend
 *          enforces this too, this is just so non-coordinators never even
 *          see a 403). Editable only by re-uploading via /ingestion
 *          (ADMIN-only there), not inline here.
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useIsCoordinator } from '@/hooks/useIsCoordinator';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppShell } from '@/components/layout/AppShell';
import { MasterTimetableGrid } from '@/components/master-timetable/MasterTimetableGrid';
import { Select } from '@/components/ui/Select';

const ALL_LEVELS = '';

export default function MasterTimetablePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { isCoordinator, isLoading: coordinatorLoading } = useIsCoordinator();
  // Shared across pages (not page-local useState) so switching to Department
  // Timetable and back doesn't reset the filter -- same store organizationId/
  // termId already use for the same reason.
  const { organizationId, termId, levelFilter, setLevelFilter } = useScheduleSelectionStore();
  const [showGridLines, setShowGridLines] = useState(true);
  const [scrollableCells, setScrollableCells] = useState(false);

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && !coordinatorLoading && !isCoordinator) {
      router.replace('/schedule');
    }
  }, [authLoading, isAuthenticated, coordinatorLoading, isCoordinator, router]);

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

  if (authLoading || !isAuthenticated || coordinatorLoading || !isCoordinator) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
      </main>
    );
  }

  return (
    <AppShell>
      <AppHeader
        title="Master Timetable"
        filtersSlot={
          <Select
            label="Level"
            value={levelFilter}
            onChange={setLevelFilter}
            options={[{ value: ALL_LEVELS, label: 'All levels' }, ...levels.map((l) => ({ value: String(l), label: String(l) }))]}
          />
        }
      />

      {slotsQuery.isLoading ? (
        <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
      ) : allSlots.length === 0 ? (
        <p className="text-sm text-[var(--fg-muted)]">No master timetable has been uploaded for this term yet.</p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-4 text-sm text-[var(--fg-muted)]">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showGridLines} onChange={(e) => setShowGridLines(e.target.checked)} />
              Show grid lines
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={scrollableCells} onChange={(e) => setScrollableCells(e.target.checked)} />
              Compact (scrollable) cells
            </label>
          </div>
          <MasterTimetableGrid
            slots={filteredSlots}
            weekDays={configQuery.data?.weekDays ?? []}
            showLevelColumn={levelFilter === ALL_LEVELS}
            showGridLines={showGridLines}
            scrollableCells={scrollableCells}
          />
        </>
      )}
    </AppShell>
  );
}
