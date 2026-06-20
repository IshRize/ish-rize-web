/**
 * Module: Free-finder page
 * Layer:  web-page (client)
 * Context: See COPILOT_CONTEXT.md, IMPLEMENTATION_PLAN.md (Phase 3)
 *
 * Purpose: Surface the Availability Engine — free venues at a chosen slot
 *          (with capacity/unit filters), free slots for a cohort, and free
 *          slots for a venue. Each section is an independent query. Results
 *          use the bg-free-slot/fg-free-slot tokens — this page's entire
 *          purpose is the "free" state of the product's 3-state system.
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { vocab } from '@/lib/vocab';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { AppHeader } from '@/components/layout/AppHeader';
import { Select } from '@/components/ui/Select';
import type { TimeSlot } from '@/types/scheduling';

const ALL = 'ALL';

function slotLabel(slot: TimeSlot): string {
  return `${slot.dayOfWeek} · ${slot.label ?? `${slot.startTime}–${slot.endTime}`}`;
}

function TimeSlotList({ slots }: { slots: TimeSlot[] | undefined }) {
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
    queryKey: ['free-venues', slotId, minCapacity, unitFilter],
    queryFn: () =>
      schedulingApi.getFreeVenues({
        slotId,
        minCapacity: minCapacity ? Number(minCapacity) : undefined,
        orgUnitId: unitFilter === ALL ? undefined : unitFilter,
      }),
    enabled: !!slotId,
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
    queryKey: ['free-venue-slots', venueId],
    queryFn: () => schedulingApi.getFreeSlotsForVenue(venueId),
    enabled: !!venueId,
  });

  if (authLoading || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] p-6">
      <AppHeader title="Free Finder" />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
          <h2 className="text-sm font-semibold text-[var(--fg-primary)]">Free venues at a slot</h2>
          <Select
            label="Time slot"
            value={slotId}
            onChange={setSlotId}
            options={[{ value: '', label: 'Choose a slot…' }, ...timeSlots.map((s) => ({ value: s.id, label: slotLabel(s) }))]}
          />
          <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
            Minimum capacity
            <input
              type="number"
              min={0}
              value={minCapacity}
              onChange={(e) => setMinCapacity(e.target.value)}
              className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 py-1.5 text-sm tabular-nums text-[var(--fg-primary)]"
            />
          </label>
          <Select
            label={vocab(config, 'unit')}
            value={unitFilter}
            onChange={setUnitFilter}
            options={[{ value: ALL, label: 'Any unit' }, ...units.map((u) => ({ value: u.id, label: u.name }))]}
          />
          {freeVenuesQuery.data && (
            <ul className="flex flex-col gap-1">
              {freeVenuesQuery.data.length === 0 ? (
                <p className="text-sm text-[var(--fg-muted)]">No free venues.</p>
              ) : (
                freeVenuesQuery.data.map((v) => (
                  <li
                    key={v.id}
                    className="rounded-md border border-[var(--fg-free-slot)]/30 bg-[var(--bg-free-slot)] px-2 py-1 text-sm text-[var(--fg-free-slot)]"
                  >
                    {v.name} <span className="tabular-nums opacity-80">· cap {v.capacity}</span>
                  </li>
                ))
              )}
            </ul>
          )}
        </section>

        <section className="space-y-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
          <h2 className="text-sm font-semibold text-[var(--fg-primary)]">Free slots for a {vocab(config, 'group').toLowerCase()}</h2>
          <Select
            label={vocab(config, 'group')}
            value={groupId}
            onChange={setGroupId}
            options={[{ value: '', label: 'Choose…' }, ...groups.map((g) => ({ value: g.id, label: g.name }))]}
          />
          <TimeSlotList slots={freeGroupSlotsQuery.data} />
        </section>

        <section className="space-y-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
          <h2 className="text-sm font-semibold text-[var(--fg-primary)]">Free slots for a venue</h2>
          <Select
            label="Venue"
            value={venueId}
            onChange={setVenueId}
            options={[{ value: '', label: 'Choose…' }, ...venues.map((v) => ({ value: v.id, label: v.name }))]}
          />
          <TimeSlotList slots={freeVenueSlotsQuery.data} />
        </section>
      </div>
    </main>
  );
}
