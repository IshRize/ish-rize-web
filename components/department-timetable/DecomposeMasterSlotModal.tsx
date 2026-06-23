/**
 * Module: DecomposeMasterSlotModal
 * Layer:  web-component (client)
 * Context: See COPILOT_CONTEXT.md; three-tier timetable refactor Phase 3
 *
 * Purpose: Turn an undecomposed MasterSlot into a real, lecturer-assigned
 *          offering -- pick an existing Course and Host from the department,
 *          create a Booking linked back to the MasterSlot. Day/time/venue are
 *          inherited from the slot itself (the master timetable already says
 *          where/when); the only decision here is which course and lecturer.
 */
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { Select } from '@/components/ui/Select';
import type { DepartmentTimetableSlot } from '@/types/scheduling';

const NONE = '';

interface DecomposeMasterSlotModalProps {
  orgUnitId: string;
  slot: DepartmentTimetableSlot;
  onClose: () => void;
  onSubmit: (input: { courseId: string; hostId?: string }) => void;
  isSubmitting?: boolean;
  error?: string | null;
}

export function DecomposeMasterSlotModal({ orgUnitId, slot, onClose, onSubmit, isSubmitting, error }: DecomposeMasterSlotModalProps) {
  const [courseId, setCourseId] = useState('');
  const [hostId, setHostId] = useState(NONE);

  const activitiesQuery = useQuery({ queryKey: ['activities', orgUnitId], queryFn: () => schedulingApi.listActivities(orgUnitId) });
  const hostsQuery = useQuery({ queryKey: ['hosts', orgUnitId], queryFn: () => schedulingApi.listHosts(orgUnitId) });

  function handleSubmit() {
    if (!courseId) return;
    onSubmit({ courseId, hostId: hostId === NONE ? undefined : hostId });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-backdrop)] p-4" onClick={onClose}>
      <div className="w-full max-w-sm space-y-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-sm font-semibold text-[var(--fg-primary)]">
          Assign course &amp; lecturer — {slot.subjectCode} {slot.level ?? ''}
        </h2>
        <p className="text-xs text-[var(--fg-muted)]">
          {slot.dayOfWeek} · {slot.timeSlot.label ?? `${slot.timeSlot.startTime}–${slot.timeSlot.endTime}`}
          {slot.venue ? ` · ${slot.venue.name}` : ''}
        </p>

        <Select
          label="Course"
          value={courseId}
          onChange={setCourseId}
          options={[{ value: '', label: 'Choose…' }, ...(activitiesQuery.data ?? []).map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }))]}
        />
        <Select
          label="Lecturer"
          value={hostId}
          onChange={setHostId}
          options={[{ value: NONE, label: 'Unassigned' }, ...(hostsQuery.data ?? []).map((h) => ({ value: h.id, label: h.displayName }))]}
        />

        {error && <p className="text-sm text-[var(--fg-clash)]">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md border border-[var(--border-default)] px-3 py-1.5 text-sm text-[var(--fg-muted)]">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!courseId || isSubmitting}
            className="rounded-md bg-[var(--accent-primary)] px-3 py-1.5 text-sm font-medium text-[var(--fg-on-accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
          >
            {isSubmitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
