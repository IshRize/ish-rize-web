/**
 * Module: AddBookingModal
 * Layer:  web-component (client)
 * Context: See COPILOT_CONTEXT.md, IMPLEMENTATION_PLAN.md (Phase 4)
 *
 * Purpose: Minimal create-booking affordance for coordinators — pick an activity
 *          and optionally a host/venue for the clicked (time slot, org unit)
 *          cell. The backend validates the draft against the org's
 *          configuration; this modal does not duplicate that logic.
 */
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { vocab } from '@/lib/vocab';
import { Select } from '@/components/ui/Select';
import type { OrgConfig } from '@/types/scheduling';

const NONE = '';

interface AddBookingModalProps {
  organizationId: string;
  orgUnitId: string;
  config: OrgConfig | undefined;
  onClose: () => void;
  onSubmit: (input: { courseId: string; hostId?: string; venueId?: string }) => void;
  isSubmitting?: boolean;
  error?: string | null;
}

export function AddBookingModal({
  organizationId,
  orgUnitId,
  config,
  onClose,
  onSubmit,
  isSubmitting,
  error,
}: AddBookingModalProps) {
  const [courseId, setCourseId] = useState('');
  const [hostId, setHostId] = useState(NONE);
  const [venueId, setVenueId] = useState(NONE);

  const activitiesQuery = useQuery({
    queryKey: ['activities', orgUnitId],
    queryFn: () => schedulingApi.listActivities(orgUnitId),
  });
  const hostsQuery = useQuery({
    queryKey: ['hosts', orgUnitId],
    queryFn: () => schedulingApi.listHosts(orgUnitId),
  });
  const venuesQuery = useQuery({
    queryKey: ['venues', organizationId],
    queryFn: () => schedulingApi.listVenues(organizationId),
  });

  function handleSubmit() {
    if (!courseId) return;
    onSubmit({
      courseId,
      hostId: hostId === NONE ? undefined : hostId,
      venueId: venueId === NONE ? undefined : venueId,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
          Add {vocab(config, 'activity').toLowerCase()}
        </h2>

        <Select
          label={vocab(config, 'activity')}
          value={courseId}
          onChange={setCourseId}
          options={[
            { value: '', label: 'Choose…' },
            ...(activitiesQuery.data ?? []).map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` })),
          ]}
        />
        <Select
          label={vocab(config, 'host')}
          value={hostId}
          onChange={setHostId}
          options={[{ value: NONE, label: 'Unassigned' }, ...(hostsQuery.data ?? []).map((h) => ({ value: h.id, label: h.displayName }))]}
        />
        <Select
          label="Venue"
          value={venueId}
          onChange={setVenueId}
          options={[{ value: NONE, label: 'Unassigned' }, ...(venuesQuery.data ?? []).map((v) => ({ value: v.id, label: v.name }))]}
        />

        {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!courseId || isSubmitting}
            className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-inverse)] disabled:opacity-60"
          >
            {isSubmitting ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
