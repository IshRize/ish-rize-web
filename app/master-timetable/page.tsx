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
import { useStructuralSocket } from '@/hooks/useStructuralSocket';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppShell } from '@/components/layout/AppShell';
import { MasterTimetableGrid } from '@/components/master-timetable/MasterTimetableGrid';
import { MasterSlotEditModal } from '@/components/master-timetable/MasterSlotEditModal';
import { Select } from '@/components/ui/Select';
import type { MasterSlotRow } from '@/types/scheduling';

const ALL_LEVELS = '';
const ALL_SUBJECTS = '';
const ALL_VENUES = '';

export default function MasterTimetablePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { isCoordinator, isLoading: coordinatorLoading } = useIsCoordinator();
  // Shared across pages (not page-local useState) so switching to Department
  // Timetable and back doesn't reset the filter -- same store organizationId/
  // termId already use for the same reason.
  const { organizationId, termId, levelFilter, setLevelFilter } = useScheduleSelectionStore();
  const [showGridLines, setShowGridLines] = useState(true);
  const [scrollableCells, setScrollableCells] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState(ALL_SUBJECTS);
  const [venueFilter, setVenueFilter] = useState(ALL_VENUES);
  const [editingSlot, setEditingSlot] = useState<MasterSlotRow | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
  }, [authLoading, isAuthenticated, router]);

  useStructuralSocket(organizationId);

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
  const subjects = Array.from(new Set(allSlots.map((s) => s.subjectCode))).sort();
  const venues = Array.from(new Map(allSlots.filter((s) => s.venue).map((s) => [s.venue!.id, s.venue!.name])).entries()).sort((a, b) =>
    a[1].localeCompare(b[1]),
  );
  // Every distinct TimeSlot currently in use on this term's master timetable --
  // there's no dedicated listTimeSlots endpoint, and the master file is
  // exhaustive over the org's periods, so this covers every real option the
  // edit modal's Time field needs without a new endpoint.
  const timeSlots = Array.from(new Map(allSlots.map((s) => [s.timeSlot.id, s.timeSlot])).values()).sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );
  const filteredSlots = allSlots.filter(
    (s) =>
      (levelFilter === ALL_LEVELS || String(s.level ?? '') === levelFilter) &&
      (subjectFilter === ALL_SUBJECTS || s.subjectCode === subjectFilter) &&
      (venueFilter === ALL_VENUES || s.venue?.id === venueFilter),
  );

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
        showOrganization={false}
        filtersSlot={
          <>
            <Select
              label="Level"
              value={levelFilter}
              onChange={setLevelFilter}
              options={[{ value: ALL_LEVELS, label: 'All levels' }, ...levels.map((l) => ({ value: String(l), label: String(l) }))]}
            />
            <Select
              label="Subject"
              value={subjectFilter}
              onChange={setSubjectFilter}
              options={[{ value: ALL_SUBJECTS, label: 'All subjects' }, ...subjects.map((s) => ({ value: s, label: s }))]}
            />
            <Select
              label="Venue"
              value={venueFilter}
              onChange={setVenueFilter}
              options={[{ value: ALL_VENUES, label: 'All venues' }, ...venues.map(([id, name]) => ({ value: id, label: name }))]}
            />
          </>
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
            onEntryClick={isAdmin ? setEditingSlot : undefined}
          />
        </>
      )}

      {editingSlot && (
        <MasterSlotEditModal
          slot={editingSlot}
          organizationId={organizationId}
          weekDays={configQuery.data?.weekDays ?? []}
          timeSlots={timeSlots}
          onClose={() => setEditingSlot(null)}
        />
      )}
    </AppShell>
  );
}
