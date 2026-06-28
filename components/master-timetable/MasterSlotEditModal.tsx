/**
 * Module: MasterSlotEditModal
 * Layer:  web-component (client)
 * Context: See COPILOT_CONTEXT.md; Phase 2 of the cross-role fixes plan
 *
 * Purpose: ADMIN-only edit surface for a single Master Timetable entry,
 *          opened by clicking it on the grid. Two distinct actions, kept
 *          visually separate because their blast radius is very different:
 *            - Edit fields (subject code, level, venue, day/time) change only
 *              THIS one entry.
 *            - "Reallocate to a different department" edits the org-wide
 *              SubjectDepartmentMapping for this entry's subject code, which
 *              affects EVERY entry sharing that code, everywhere -- not just
 *              this row. Shown with that scope spelled out, not implied.
 *          Delete and any field edit are both blocked by the backend (409)
 *          when a coordinator has already decomposed this slot into real
 *          Bookings -- surfaced here verbatim, not re-derived client-side, so
 *          the count is always the backend's own truth at the moment of the
 *          attempt.
 */
'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { dayLabel } from '@/lib/dayNames';
import { Select } from '@/components/ui/Select';
import type { MasterSlotRow, TimeSlot } from '@/types/scheduling';

interface MasterSlotEditModalProps {
  slot: MasterSlotRow;
  organizationId: string;
  weekDays: string[];
  timeSlots: TimeSlot[];
  onClose: () => void;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function MasterSlotEditModal({ slot, organizationId, weekDays, timeSlots, onClose }: MasterSlotEditModalProps) {
  const queryClient = useQueryClient();

  const [subjectCode, setSubjectCode] = useState(slot.subjectCode);
  const [level, setLevel] = useState(slot.level != null ? String(slot.level) : '');
  const [venueId, setVenueId] = useState(slot.venueId ?? '');
  const [dayOfWeek, setDayOfWeek] = useState(slot.dayOfWeek);
  const [timeSlotId, setTimeSlotId] = useState(slot.timeSlotId);
  const [reallocateOrgUnitId, setReallocateOrgUnitId] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [reallocateError, setReallocateError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const venuesQuery = useQuery({
    queryKey: ['venues', organizationId],
    queryFn: () => schedulingApi.listVenues(organizationId),
    enabled: !!organizationId,
  });
  const unitsQuery = useQuery({
    queryKey: ['org-units', organizationId],
    queryFn: () => schedulingApi.listOrgUnits(organizationId, false, true),
    enabled: !!organizationId,
  });
  const mappingsQuery = useQuery({
    queryKey: ['subject-department-mappings', organizationId],
    queryFn: () => schedulingApi.listSubjectDepartmentMappings(organizationId),
    enabled: !!organizationId,
  });
  const currentMapping = (mappingsQuery.data ?? []).find((m) => m.subjectCode === slot.subjectCode);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['master-slots'] });
  }

  const updateMutation = useMutation({
    mutationFn: () =>
      schedulingApi.updateMasterSlot(slot.id, {
        subjectCode: subjectCode.trim(),
        level: level.trim() ? Number(level) : null,
        venueId: venueId || null,
        dayOfWeek,
        timeSlotId,
      }),
    onSuccess: () => {
      setEditError(null);
      invalidate();
      onClose();
    },
    onError: (err) => setEditError(errorMessage(err, 'Failed to update this slot')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => schedulingApi.deleteMasterSlot(slot.id),
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (err) => setDeleteError(errorMessage(err, 'Failed to delete this slot')),
  });

  const reallocateMutation = useMutation({
    mutationFn: () =>
      schedulingApi.upsertSubjectDepartmentMapping({ organizationId, subjectCode: slot.subjectCode, orgUnitId: reallocateOrgUnitId }),
    onSuccess: () => {
      setReallocateError(null);
      setReallocateOrgUnitId('');
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['subject-department-mappings', organizationId] });
    },
    onError: (err) => setReallocateError(errorMessage(err, 'Failed to reallocate this subject')),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-backdrop)] p-4" onClick={onClose}>
      <div
        className="w-full max-w-md space-y-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold text-[var(--fg-primary)]">Edit master timetable entry</h2>

        <section className="space-y-3">
          <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
            Subject code
            <input
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
              className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--fg-primary)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
            Level
            <input
              type="number"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder="e.g. 100"
              className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm tabular-nums text-[var(--fg-primary)]"
            />
          </label>
          <Select
            label="Venue"
            value={venueId}
            onChange={setVenueId}
            options={[{ value: '', label: 'No venue' }, ...(venuesQuery.data ?? []).map((v) => ({ value: v.id, label: v.name }))]}
          />
          <Select label="Day" value={dayOfWeek} onChange={setDayOfWeek} options={weekDays.map((d) => ({ value: d, label: dayLabel(d) }))} />
          <Select
            label="Time"
            value={timeSlotId}
            onChange={setTimeSlotId}
            options={timeSlots.map((t) => ({ value: t.id, label: `${t.startTime}–${t.endTime}` }))}
          />
          {editError && <p className="text-sm text-[var(--fg-clash)]">{editError}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => updateMutation.mutate()}
              disabled={!subjectCode.trim() || updateMutation.isPending}
              className="rounded-md bg-[var(--accent-primary)] px-3 py-1.5 text-sm font-medium text-[var(--fg-on-accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
            >
              {updateMutation.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </section>

        <section className="space-y-2 border-t border-[var(--border-default)] pt-3">
          <p className="text-xs text-[var(--fg-muted)]">
            Reallocate department -- changes which department <strong>every</strong> &quot;{slot.subjectCode}&quot; entry on the whole
            master timetable belongs to, not just this row.
            {currentMapping && (
              <>
                {' '}
                Currently: <strong>{currentMapping.orgUnit.name}</strong>.
              </>
            )}
          </p>
          <div className="flex gap-2">
            <Select
              label="New department"
              value={reallocateOrgUnitId}
              onChange={setReallocateOrgUnitId}
              options={[{ value: '', label: 'Choose…' }, ...(unitsQuery.data ?? []).map((u) => ({ value: u.id, label: u.name }))]}
            />
            <button
              type="button"
              onClick={() => reallocateMutation.mutate()}
              disabled={!reallocateOrgUnitId || reallocateMutation.isPending}
              className="self-end rounded-md border border-[var(--border-default)] px-3 py-1.5 text-sm text-[var(--fg-primary)] hover:bg-[var(--bg-alternate)] disabled:opacity-60"
            >
              {reallocateMutation.isPending ? 'Reallocating…' : 'Reallocate'}
            </button>
          </div>
          {reallocateError && <p className="text-sm text-[var(--fg-clash)]">{reallocateError}</p>}
        </section>

        <section className="flex items-center justify-between border-t border-[var(--border-default)] pt-3">
          {confirmingDelete ? (
            <div className="flex w-full items-center justify-between gap-2">
              <p className="text-sm text-[var(--fg-clash)]">Delete this entry permanently?</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmingDelete(false)} className="text-xs text-[var(--fg-muted)] hover:underline">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="rounded-md bg-[var(--fg-clash)] px-3 py-1.5 text-xs font-medium text-[var(--fg-on-accent-primary)] disabled:opacity-60"
                >
                  {deleteMutation.isPending ? 'Deleting…' : 'Confirm delete'}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmingDelete(true)} className="text-sm text-[var(--fg-clash)] hover:underline">
              Delete entry
            </button>
          )}
          <button type="button" onClick={onClose} className="rounded-md border border-[var(--border-default)] px-3 py-1.5 text-sm text-[var(--fg-muted)]">
            Close
          </button>
        </section>
        {deleteError && <p className="text-sm text-[var(--fg-clash)]">{deleteError}</p>}
      </div>
    </div>
  );
}
