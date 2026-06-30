/**
 * Module: Free-finder page
 * Layer:  web-page (client)
 * Context: See COPILOT_CONTEXT.md, IMPLEMENTATION_PLAN.md (Phase 3); Coordinator
 *          Tooling Round 2 Phase 4
 *
 * Purpose: Surface the Availability Engine — free venues at a chosen slot
 *          (with capacity/unit filters), free slots for a cohort, free slots
 *          for a venue, and venues with zero master-timetable allocation at
 *          all. The venue-facing sections are now MasterSlot-aware on the
 *          backend: a space assigned to a department in the master file
 *          reads as occupied even before it's decomposed into a real
 *          Booking, which is what makes "free" here trustworthy. Results use
 *          the bg-free-slot/fg-free-slot tokens — this page's entire purpose
 *          is the "free" state of the product's 3-state system.
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { vocab } from '@/lib/vocab';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { useStructuralSocket } from '@/hooks/useStructuralSocket';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppShell } from '@/components/layout/AppShell';
import { Select } from '@/components/ui/Select';
import { dayLabel } from '@/lib/dayNames';
import type { TimeSlot } from '@/types/scheduling';

const ALL = 'ALL';

function slotLabel(slot: TimeSlot): string {
  return `${dayLabel(slot.dayOfWeek)} · ${slot.startTime}–${slot.endTime}`;
}

function FinderCard({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
      <div>
        <h2 className="text-sm font-semibold text-[var(--fg-primary)]">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-[var(--fg-muted)]">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function TimeSlotList({ slots, loading }: { slots: TimeSlot[] | undefined; loading?: boolean }) {
  if (loading) return <p className="text-sm text-[var(--fg-muted)]">Loading…</p>;
  if (!slots) return null;
  if (slots.length === 0) {
    return <p className="text-sm text-[var(--fg-muted)]">No free slots.</p>;
  }
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {slots.map((slot) => (
        <li
          key={slot.id}
          className="rounded-md border border-[var(--fg-free-slot)]/30 bg-[var(--bg-free-slot)] px-2 py-1 text-xs tabular-nums text-[var(--fg-free-slot)]"
        >
          {slotLabel(slot)}
        </li>
      ))}
    </ul>
  );
}

export default function FreeFinderPage() {
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

  useStructuralSocket(organizationId);

  const configQuery = useQuery({
    queryKey: ['org-config', organizationId],
    queryFn: () => schedulingApi.getOrgConfig(organizationId),
    enabled: !!organizationId,
  });
  const unitsQuery = useQuery({
    queryKey: ['org-units', organizationId],
    queryFn: () => schedulingApi.listOrgUnits(organizationId, false, true),
    enabled: !!organizationId,
  });
  const venuesQuery = useQuery({
    queryKey: ['venues', organizationId],
    queryFn: () => schedulingApi.listVenues(organizationId),
    enabled: !!organizationId,
  });
  const groupsQuery = useQuery({
    queryKey: ['groups', termId],
    queryFn: () => schedulingApi.listGroups(termId),
    enabled: !!termId,
  });
  // Reuses the schedule response purely for its org-wide time slot list.
  const scheduleQuery = useQuery({
    queryKey: ['schedule', termId],
    queryFn: () => schedulingApi.getSchedule(termId),
    enabled: !!termId,
  });
  const timeSlots = scheduleQuery.data?.timeSlots ?? [];
  const config = configQuery.data;
  const units = unitsQuery.data ?? [];
  const venues = venuesQuery.data ?? [];
  const groups = groupsQuery.data ?? [];

  // Section A: free venues at a slot.
  const [slotId, setSlotId] = useState('');
  const [minCapacity, setMinCapacity] = useState('');
  const [unitFilter, setUnitFilter] = useState(ALL);
  const freeVenuesQuery = useQuery({
    queryKey: ['free-venues', termId, slotId, minCapacity, unitFilter],
    queryFn: () =>
      schedulingApi.getFreeVenues({
        termId,
        slotId,
        minCapacity: minCapacity ? Number(minCapacity) : undefined,
        orgUnitId: unitFilter === ALL ? undefined : unitFilter,
      }),
    enabled: !!slotId && !!termId,
  });

  // Section B: free slots for a group.
  const [groupId, setGroupId] = useState('');
  const freeGroupSlotsQuery = useQuery({
    queryKey: ['free-group-slots', groupId],
    queryFn: () => schedulingApi.getFreeSlotsForGroup(groupId),
    enabled: !!groupId,
  });

  // Section C: free slots for a venue.
  const [venueId, setVenueId] = useState('');
  const freeVenueSlotsQuery = useQuery({
    queryKey: ['free-venue-slots', venueId, termId],
    queryFn: () => schedulingApi.getFreeSlotsForVenue(venueId, termId),
    enabled: !!venueId && !!termId,
  });

  // Section D: venues with zero master-timetable allocation this term.
  const unusedVenuesQuery = useQuery({
    queryKey: ['unused-venues', termId, organizationId],
    queryFn: () => schedulingApi.getUnusedVenues(termId, organizationId),
    enabled: !!termId && !!organizationId,
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
      <AppHeader title="Free Finder" />

      <p className="mb-4 text-xs text-[var(--fg-muted)]">
        Availability reflects the master timetable, not just confirmed offerings — a venue assigned to a department
        there reads as busy here even before that slot is decomposed into a named course.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <FinderCard title="Free venues at a slot" hint="Pick a time slot to see which venues have no allocation there.">
          <Select
            label="Time slot"
            value={slotId}
            onChange={setSlotId}
            options={[{ value: '', label: 'Choose a slot…' }, ...timeSlots.map((s) => ({ value: s.id, label: slotLabel(s) }))]}
          />
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-xs text-[var(--fg-muted)]">
              Minimum capacity
              <input
                type="number"
                min={0}
                value={minCapacity}
                onChange={(e) => setMinCapacity(e.target.value)}
                className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 py-1.5 text-sm tabular-nums text-[var(--fg-primary)]"
              />
            </label>
            <div className="flex-1">
              <Select
                label={vocab(config, 'unit')}
                value={unitFilter}
                onChange={setUnitFilter}
                options={[{ value: ALL, label: 'Any unit' }, ...units.map((u) => ({ value: u.id, label: u.name }))]}
              />
            </div>
          </div>
          {!slotId ? (
            <p className="text-sm text-[var(--fg-muted)]">Choose a time slot to see free venues.</p>
          ) : freeVenuesQuery.isLoading ? (
            <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {(freeVenuesQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-[var(--fg-muted)]">No free venues at this slot.</p>
              ) : (
                freeVenuesQuery.data!.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between rounded-md border border-[var(--fg-free-slot)]/30 bg-[var(--bg-free-slot)] px-2 py-1 text-sm text-[var(--fg-free-slot)]"
                  >
                    <span>{v.name}</span>
                    <span className="tabular-nums opacity-80">cap {v.capacity}</span>
                  </li>
                ))
              )}
            </ul>
          )}
        </FinderCard>

        <FinderCard title={`Free slots for a ${vocab(config, 'group').toLowerCase()}`} hint="Pick a cohort to see when none of its linked courses clash.">
          <Select
            label={vocab(config, 'group')}
            value={groupId}
            onChange={setGroupId}
            options={[{ value: '', label: 'Choose…' }, ...groups.map((g) => ({ value: g.id, label: g.name }))]}
          />
          {!groupId ? (
            <p className="text-sm text-[var(--fg-muted)]">Choose a {vocab(config, 'group').toLowerCase()} to see free slots.</p>
          ) : (
            <TimeSlotList slots={freeGroupSlotsQuery.data} loading={freeGroupSlotsQuery.isLoading} />
          )}
        </FinderCard>

        <FinderCard title="Free slots for a venue" hint="Pick a venue to see which time slots have no allocation there this term.">
          <Select
            label="Venue"
            value={venueId}
            onChange={setVenueId}
            options={[{ value: '', label: 'Choose…' }, ...venues.map((v) => ({ value: v.id, label: v.name }))]}
          />
          {!venueId ? (
            <p className="text-sm text-[var(--fg-muted)]">Choose a venue to see free slots.</p>
          ) : (
            <TimeSlotList slots={freeVenueSlotsQuery.data} loading={freeVenueSlotsQuery.isLoading} />
          )}
        </FinderCard>

        <FinderCard
          title="Unused venues this term"
          hint="No department has been assigned any slot in these venues at all — strong candidates for new offerings."
        >
          {unusedVenuesQuery.isLoading ? (
            <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
          ) : (unusedVenuesQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-[var(--fg-muted)]">Every venue has at least one master timetable allocation this term.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {unusedVenuesQuery.data!.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between rounded-md border border-[var(--fg-free-slot)]/30 bg-[var(--bg-free-slot)] px-2 py-1 text-sm text-[var(--fg-free-slot)]"
                >
                  <span>{v.name}</span>
                  <span className="tabular-nums opacity-80">cap {v.capacity}</span>
                </li>
              ))}
            </ul>
          )}
        </FinderCard>
      </div>
    </AppShell>
  );
}
