/**
 * Module: CourseDetailModal
 * Layer:  web-component (client)
 * Context: See COPILOT_CONTEXT.md; Coordinator Tooling Round 2 Phases 1–2
 *
 * Purpose: Opened by clicking a course row in CourseLecturerTable. Manages
 *          classification (Core/Elective/None) and Groups for the course.
 *          Groups are term-scoped; termId comes from scheduleSelectionStore
 *          (same source as Teaching Load and the timetable grid) so there's
 *          no extra picker here.
 */
'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { Select } from '@/components/ui/Select';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import type { ActivitySummary, GroupSummary, ManagedHost } from '@/types/scheduling';

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

function errMsg(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function CourseDetailModal({ course, orgUnitId, onClose }: CourseDetailModalProps) {
  const queryClient = useQueryClient();
  const { termId } = useScheduleSelectionStore();

  const [courseType, setCourseType] = useState(course.courseType ?? 'NONE');
  const [typeError, setTypeError] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const groupsQuery = useQuery({
    queryKey: ['groups', termId],
    queryFn: () => schedulingApi.listGroups(termId),
    enabled: !!termId,
  });
  const hostsQuery = useQuery({
    queryKey: ['hosts', orgUnitId],
    queryFn: () => schedulingApi.listHosts(orgUnitId),
    enabled: !!orgUnitId,
  });

  const groups: GroupSummary[] = groupsQuery.data ?? [];
  const hosts: ManagedHost[] = hostsQuery.data ?? [];
  // Groups that include this course
  const courseGroups = groups.filter((g) => g.courseLinks.some((cl) => cl.courseId === course.id));
  // Groups owned by this department that don't yet include this course
  const addableGroups = groups.filter(
    (g) => g.orgUnitId === orgUnitId && !g.courseLinks.some((cl) => cl.courseId === course.id),
  );

  function invalidateGroups() {
    queryClient.invalidateQueries({ queryKey: ['groups', termId] });
  }

  // ── Classification mutation ────────────────────────────────────────────────
  const updateTypeMutation = useMutation({
    mutationFn: (value: string) => schedulingApi.updateCourse(course.id, { courseType: value }),
    onSuccess: () => {
      setTypeError(null);
      queryClient.invalidateQueries({ queryKey: ['activities', orgUnitId] });
    },
    onError: (err) => setTypeError(errMsg(err, 'Failed to update course type')),
  });

  function handleTypeChange(value: string) {
    setCourseType(value);
    updateTypeMutation.mutate(value);
  }

  // ── Group mutations ────────────────────────────────────────────────────────
  const createGroupMutation = useMutation({
    mutationFn: (name: string) => schedulingApi.createGroup({ termId, orgUnitId, name }),
    onSuccess: (newGroup) => {
      setCreateError(null);
      setNewGroupName('');
      // Auto-link this course into the new group
      schedulingApi.addCourseToGroup(newGroup.id, course.id).then(invalidateGroups).catch(() => invalidateGroups());
    },
    onError: (err) => setCreateError(errMsg(err, 'Failed to create group')),
  });

  const addToGroupMutation = useMutation({
    mutationFn: (groupId: string) => schedulingApi.addCourseToGroup(groupId, course.id),
    onSuccess: invalidateGroups,
  });

  const removeFromGroupMutation = useMutation({
    mutationFn: (groupId: string) => schedulingApi.removeCourseFromGroup(groupId, course.id),
    onSuccess: invalidateGroups,
  });

  const addHostMutation = useMutation({
    mutationFn: ({ groupId, hostId }: { groupId: string; hostId: string }) =>
      schedulingApi.addHostToGroup(groupId, { hostId, courseId: course.id }),
    onSuccess: invalidateGroups,
  });

  const removeHostMutation = useMutation({
    mutationFn: ({ groupId, hostId }: { groupId: string; hostId: string }) =>
      schedulingApi.removeHostFromGroup(groupId, hostId, course.id),
    onSuccess: invalidateGroups,
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: string) => schedulingApi.deleteGroup(groupId),
    onSuccess: invalidateGroups,
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-backdrop)] p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--fg-primary)]">
            {course.code} — {course.name}
          </h2>
          <p className="text-xs text-[var(--fg-muted)]">Manage this course</p>
        </div>

        {/* Classification */}
        <section className="space-y-1.5">
          <p className="text-xs font-medium text-[var(--fg-muted)] uppercase tracking-wide">Classification</p>
          <Select label="" value={courseType} onChange={handleTypeChange} options={COURSE_TYPE_OPTIONS} />
          {updateTypeMutation.isPending && <p className="text-xs text-[var(--fg-muted)]">Saving…</p>}
          {typeError && <p className="text-xs text-[var(--fg-clash)]">{typeError}</p>}
        </section>

        {/* Groups */}
        <section className="space-y-3">
          <p className="text-xs font-medium text-[var(--fg-muted)] uppercase tracking-wide">Groups</p>

          {!termId && (
            <p className="text-xs text-[var(--fg-muted)]">Select a term in the header to manage groups.</p>
          )}

          {termId && (
            <>
              {/* Existing groups this course belongs to */}
              {courseGroups.length === 0 ? (
                <p className="text-xs text-[var(--fg-muted)]">This course isn&apos;t in any group yet.</p>
              ) : (
                <div className="space-y-3">
                  {courseGroups.map((g) => {
                    const groupHosts = g.hostLinks.filter((hl) => hl.courseId === course.id);
                    const assignedHostIds = new Set(groupHosts.map((hl) => hl.hostId));
                    const availableHosts = hosts.filter((h) => !assignedHostIds.has(h.id));

                    return (
                      <div
                        key={g.id}
                        className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-[var(--fg-primary)]">{g.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFromGroupMutation.mutate(g.id)}
                            disabled={removeFromGroupMutation.isPending}
                            className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg-clash)] disabled:opacity-50"
                          >
                            Remove course
                          </button>
                        </div>

                        {/* Cross-dept courses in this group */}
                        {g.courseLinks.length > 1 && (
                          <div className="flex flex-wrap gap-1">
                            {g.courseLinks
                              .filter((cl) => cl.courseId !== course.id)
                              .map((cl) => (
                                <span
                                  key={cl.courseId}
                                  className="rounded px-1.5 py-0.5 text-xs bg-[var(--accent-secondary)] text-[var(--fg-on-accent-primary)]"
                                >
                                  {cl.course.code}
                                  {cl.course.orgUnit ? ` (${cl.course.orgUnit.name})` : ''}
                                </span>
                              ))}
                          </div>
                        )}

                        {/* Hosts for this course in this group */}
                        <div className="space-y-1">
                          {groupHosts.length === 0 ? (
                            <p className="text-xs text-[var(--fg-muted)]">No lecturers assigned.</p>
                          ) : (
                            groupHosts.map((hl) => (
                              <div key={hl.hostId} className="flex items-center justify-between">
                                <span className="text-xs text-[var(--fg-primary)]">{hl.host.displayName}</span>
                                <button
                                  type="button"
                                  onClick={() => removeHostMutation.mutate({ groupId: g.id, hostId: hl.hostId })}
                                  disabled={removeHostMutation.isPending}
                                  className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg-clash)] disabled:opacity-50"
                                >
                                  Remove
                                </button>
                              </div>
                            ))
                          )}
                          {/* Add host select */}
                          {availableHosts.length > 0 && (
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  addHostMutation.mutate({ groupId: g.id, hostId: e.target.value });
                                  e.target.value = '';
                                }
                              }}
                              className="mt-1 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-xs text-[var(--fg-primary)]"
                            >
                              <option value="">Add lecturer…</option>
                              {availableHosts.map((h) => (
                                <option key={h.id} value={h.id}>
                                  {h.displayName}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Delete group */}
                        <button
                          type="button"
                          onClick={() => deleteGroupMutation.mutate(g.id)}
                          disabled={deleteGroupMutation.isPending}
                          className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg-clash)] disabled:opacity-50"
                        >
                          Delete group
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add to an existing group from this department */}
              {addableGroups.length > 0 && (
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      addToGroupMutation.mutate(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-xs text-[var(--fg-primary)]"
                >
                  <option value="">Add to existing group…</option>
                  {addableGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Create new group */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New group name (e.g. G1)"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newGroupName.trim()) {
                      createGroupMutation.mutate(newGroupName.trim());
                    }
                  }}
                  className="flex-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-xs text-[var(--fg-primary)] placeholder:text-[var(--fg-muted)]"
                />
                <button
                  type="button"
                  onClick={() => newGroupName.trim() && createGroupMutation.mutate(newGroupName.trim())}
                  disabled={!newGroupName.trim() || createGroupMutation.isPending}
                  className="rounded-md border border-[var(--border-default)] px-3 py-1 text-xs text-[var(--fg-primary)] hover:bg-[var(--bg-alternate)] disabled:opacity-50"
                >
                  {createGroupMutation.isPending ? 'Creating…' : 'Create'}
                </button>
              </div>
              {createError && <p className="text-xs text-[var(--fg-clash)]">{createError}</p>}
            </>
          )}
        </section>

        {/* Footer */}
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
