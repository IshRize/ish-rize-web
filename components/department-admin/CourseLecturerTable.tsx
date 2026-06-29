/**
 * Module: CourseLecturerTable
 * Layer:  web-component (client)
 * Context: See COPILOT_CONTEXT.md; Coordinator Hub Phase 2
 *
 * Purpose: The Coordinator Hub's "Courses" tab -- reassign which lecturer
 *          owns each course in the department's catalog (Course.lecturerId).
 *          Distinct from Department Timetable's existing per-booking
 *          reassign dropdown (Booking.hostId) -- that one stays untouched;
 *          this is catalog-level ownership, independent of any specific
 *          scheduled session.
 *
 *          Course.lecturerId is a User FK, not a Host FK -- only a Host
 *          that's linked to a real account (userId set) can be picked here.
 *          A bare placeholder Host can still teach specific bookings, but
 *          can't "own" a course until it's linked to an account.
 */
'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { CourseDetailModal } from '@/components/department-admin/CourseDetailModal';
import type { ActivitySummary } from '@/types/scheduling';

interface CourseLecturerTableProps {
  orgUnitId: string;
}

export function CourseLecturerTable({ orgUnitId }: CourseLecturerTableProps) {
  const queryClient = useQueryClient();
  const [detailCourse, setDetailCourse] = useState<ActivitySummary | null>(null);

  const coursesQuery = useQuery({
    queryKey: ['activities', orgUnitId],
    queryFn: () => schedulingApi.listActivities(orgUnitId),
    enabled: !!orgUnitId,
  });
  const hostsQuery = useQuery({
    queryKey: ['hosts', orgUnitId],
    queryFn: () => schedulingApi.listHosts(orgUnitId),
    enabled: !!orgUnitId,
  });

  const courses = coursesQuery.data ?? [];
  const linkedHosts = (hostsQuery.data ?? []).filter((h) => !!h.userId);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['activities', orgUnitId] });
  }

  const reassignMutation = useMutation({
    mutationFn: ({ courseId, lecturerId }: { courseId: string; lecturerId: string }) =>
      schedulingApi.updateCourse(courseId, { lecturerId }),
    onSuccess: invalidate,
  });

  if (coursesQuery.isLoading) {
    return <p className="text-sm text-[var(--fg-muted)]">Loading…</p>;
  }
  if (courses.length === 0) {
    return <p className="text-sm text-[var(--fg-muted)]">No courses in this department yet.</p>;
  }

  return (
    <div>
      {linkedHosts.length === 0 && (
        <p className="mb-3 text-xs text-[var(--fg-muted)]">
          No lecturer in this department has a linked account yet — link one in the Lecturers tab before reassigning a course.
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-[var(--accent-secondary)]">
            <tr>
              {['Code', 'Name', 'Type', 'Current lecturer', 'Reassign to', ''].map((h) => (
                <th key={h} className="border-b border-[var(--border-default)] px-3 py-2 text-left text-xs font-semibold text-[var(--fg-on-accent-primary)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => {
              // The course's current lecturer may not be a Host linked in
              // THIS department (e.g. set incidentally by whoever committed
              // the ingestion) -- show them as a disabled option rather than
              // letting the select render blank/unselected.
              const currentIsLinkedHere = c.lecturerId ? linkedHosts.some((h) => h.userId === c.lecturerId) : true;
              return (
                <tr key={c.id} className="even:bg-[var(--bg-alternate)]/60 hover:bg-[var(--bg-alternate)]">
                  <td className="border-b border-[var(--border-default)] px-3 py-2 text-[var(--fg-primary)]">{c.code}</td>
                  <td className="border-b border-[var(--border-default)] px-3 py-2 text-[var(--fg-primary)]">{c.name}</td>
                  <td className="border-b border-[var(--border-default)] px-3 py-2 text-[var(--fg-muted)]">{c.courseType ?? 'NONE'}</td>
                  <td className="border-b border-[var(--border-default)] px-3 py-2 text-[var(--fg-muted)]">
                    {c.lecturer ? `${c.lecturer.firstName} ${c.lecturer.lastName}` : '—'}
                  </td>
                  <td className="border-b border-[var(--border-default)] px-3 py-2">
                    <select
                      value={c.lecturerId ?? ''}
                      onChange={(e) => e.target.value && reassignMutation.mutate({ courseId: c.id, lecturerId: e.target.value })}
                      disabled={linkedHosts.length === 0}
                      className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-xs text-[var(--fg-primary)] disabled:opacity-60"
                    >
                      {!c.lecturerId && <option value="">Unassigned</option>}
                      {!currentIsLinkedHere && c.lecturer && (
                        <option value={c.lecturerId} disabled>
                          {c.lecturer.firstName} {c.lecturer.lastName} (not a linked lecturer here)
                        </option>
                      )}
                      {linkedHosts.map((h) => (
                        <option key={h.userId} value={h.userId!}>
                          {h.displayName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border-b border-[var(--border-default)] px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setDetailCourse(c)}
                      className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detailCourse && <CourseDetailModal course={detailCourse} orgUnitId={orgUnitId} onClose={() => setDetailCourse(null)} />}
    </div>
  );
}
