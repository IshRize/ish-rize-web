/**
 * Module: CourseDetailModal
 * Layer:  web-component (client)
 * Context: See COPILOT_CONTEXT.md; Coordinator Tooling Round 2 Phase 1
 *
 * Purpose: Opened by clicking a course row in CourseLecturerTable. One place
 *          a coordinator manages a course beyond catalog ownership (the
 *          table's own "Reassign to" select stays where it is) -- starts
 *          with the Core/Elective/None classification; the Groups section
 *          (multi-lecturer groups, cross-department course linking) lands
 *          here too in a later phase.
 */
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { Select } from '@/components/ui/Select';
import type { ActivitySummary } from '@/types/scheduling';

interface CourseDetailModalProps {
  course: ActivitySummary;
  orgUnitId: string;
  onClose: () => void;
}

const COURSE_TYPE_OPTIONS = [
  { value: 'NONE', label: 'None' },
  { value: 'CORE', label: 'Core' },
  { value: 'ELECTIVE', label: 'Elective' },
];

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function CourseDetailModal({ course, orgUnitId, onClose }: CourseDetailModalProps) {
  const queryClient = useQueryClient();
  const [courseType, setCourseType] = useState(course.courseType ?? 'NONE');
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateTypeMutation = useMutation({
    mutationFn: (value: string) => schedulingApi.updateCourse(course.id, { courseType: value }),
    onSuccess: () => {
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: ['activities', orgUnitId] });
    },
    onError: (err) => setSaveError(errorMessage(err, 'Failed to update course type')),
  });

  function handleTypeChange(value: string): void {
    setCourseType(value);
    updateTypeMutation.mutate(value);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-backdrop)] p-4" onClick={onClose}>
      <div
        className="w-full max-w-md space-y-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-sm font-semibold text-[var(--fg-primary)]">
            {course.code} — {course.name}
          </h2>
          <p className="text-xs text-[var(--fg-muted)]">Manage this course</p>
        </div>

        <section className="space-y-2">
          <Select label="Classification" value={courseType} onChange={handleTypeChange} options={COURSE_TYPE_OPTIONS} />
          {updateTypeMutation.isPending && <p className="text-xs text-[var(--fg-muted)]">Saving…</p>}
          {saveError && <p className="text-sm text-[var(--fg-clash)]">{saveError}</p>}
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--border-default)] px-3 py-1.5 text-sm text-[var(--fg-primary)] hover:bg-[var(--bg-alternate)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
