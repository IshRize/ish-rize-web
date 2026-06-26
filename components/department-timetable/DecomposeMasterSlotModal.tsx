/**
 * Module: DecomposeMasterSlotModal
 * Layer:  web-component (client)
 * Context: See COPILOT_CONTEXT.md; three-tier timetable refactor Phase 3;
 *          dept-coordinator tooling (course-code detection)
 *
 * Purpose: Turn an undecomposed MasterSlot into a real, lecturer-assigned
 *          offering -- pick an existing Course and Host from the department,
 *          create a Booking linked back to the MasterSlot. Day/time/venue are
 *          inherited from the slot itself (the master timetable already says
 *          where/when); the only decision here is which course and lecturer.
 *
 *          A bare subject code ("MATH (C)") is just a placeholder -- which
 *          specific course this period is still needs a human decision. But
 *          a code that already combines letters+digits ("NURS467") IS a
 *          specific course code already: if it exists in this department,
 *          auto-select it; if not, offer to create it right here instead of
 *          making the coordinator go hunt for a course-creation screen that
 *          doesn't otherwise exist in this app.
 */
'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { Select } from '@/components/ui/Select';
import { dayLabel } from '@/lib/dayNames';
import { parseCourseCode } from '@/lib/courseCode';
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
  const [newCourseName, setNewCourseName] = useState('');
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const queryClient = useQueryClient();

  const activitiesQuery = useQuery({ queryKey: ['activities', orgUnitId], queryFn: () => schedulingApi.listActivities(orgUnitId) });
  const hostsQuery = useQuery({ queryKey: ['hosts', orgUnitId], queryFn: () => schedulingApi.listHosts(orgUnitId) });

  const parsedCode = parseCourseCode(slot.subjectCode);
  const matchingCourse = parsedCode ? (activitiesQuery.data ?? []).find((a) => a.code === parsedCode.code) : undefined;

  // The master slot already names a specific course -- auto-select it the
  // moment the department's course list resolves, instead of making the
  // coordinator search for what the slot already told us.
  useEffect(() => {
    if (!hasAutoSelected && matchingCourse) {
      setCourseId(matchingCourse.id);
      setHasAutoSelected(true);
    }
  }, [hasAutoSelected, matchingCourse]);

  const createCourseMutation = useMutation({
    mutationFn: () => {
      if (!parsedCode) throw new Error('No course code to create');
      return schedulingApi.createCourse({ code: parsedCode.code, name: newCourseName, orgUnitId, level: parsedCode.level });
    },
    onSuccess: (course) => {
      queryClient.invalidateQueries({ queryKey: ['activities', orgUnitId] });
      setCourseId(course.id);
      setHasAutoSelected(true);
    },
  });

  function handleSubmit() {
    if (!courseId) return;
    onSubmit({ courseId, hostId: hostId === NONE ? undefined : hostId });
  }

  const showQuickCreate = !!parsedCode && !matchingCourse && !activitiesQuery.isLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-backdrop)] p-4" onClick={onClose}>
      <div className="w-full max-w-sm space-y-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-sm font-semibold text-[var(--fg-primary)]">
          Assign course &amp; lecturer — {slot.subjectCode} {slot.level ?? ''}
        </h2>
        <p className="text-xs text-[var(--fg-muted)]">
          {dayLabel(slot.dayOfWeek)} · {slot.timeSlot.startTime}–{slot.timeSlot.endTime}
          {slot.venue ? ` · ${slot.venue.name}` : ''}
        </p>

        {showQuickCreate && (
          <div className="space-y-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] p-3">
            <p className="text-xs text-[var(--fg-muted)]">
              The master timetable already names this course as <span className="font-medium text-[var(--fg-primary)]">{parsedCode!.code}</span> (level{' '}
              {parsedCode!.level}) -- create it now instead of picking from the list below.
            </p>
            <input
              type="text"
              placeholder="Course name"
              value={newCourseName}
              onChange={(e) => setNewCourseName(e.target.value)}
              className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--fg-primary)]"
            />
            {createCourseMutation.error && (
              <p className="text-xs text-[var(--fg-clash)]">
                {createCourseMutation.error instanceof Error ? createCourseMutation.error.message : 'Failed to create course'}
              </p>
            )}
            <button
              type="button"
              onClick={() => createCourseMutation.mutate()}
              disabled={!newCourseName.trim() || createCourseMutation.isPending}
              className="w-full rounded-md bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-medium text-[var(--fg-on-accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
            >
              {createCourseMutation.isPending ? 'Creating…' : `Create ${parsedCode!.code}`}
            </button>
          </div>
        )}

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
