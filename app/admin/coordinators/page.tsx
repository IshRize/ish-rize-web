/**
 * Module: Department coordinators admin page
 * Layer:  web-page (client)
 * Context: See COPILOT_CONTEXT.md
 *
 * Purpose: ADMIN-only screen to grant or revoke "department timetable
 *          coordinator" -- a scoped permission on a specific LECTURER for a
 *          specific department, not a role change. One lecturer can hold this
 *          for zero, one, or several departments.
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, schedulingApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { useStructuralSocket } from '@/hooks/useStructuralSocket';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppShell } from '@/components/layout/AppShell';

export default function CoordinatorsAdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { organizationId } = useScheduleSelectionStore();
  const queryClient = useQueryClient();

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedOrgUnitId, setSelectedOrgUnitId] = useState('');
  const [assignError, setAssignError] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
    else if (!authLoading && user && user.role !== 'ADMIN') router.replace('/schedule');
  }, [authLoading, isAuthenticated, user, router]);

  useStructuralSocket(organizationId);

  const usersQuery = useQuery({ queryKey: ['admin-users'], queryFn: adminApi.listUsers });
  const unitsQuery = useQuery({
    queryKey: ['org-units', organizationId],
    queryFn: () => schedulingApi.listOrgUnits(organizationId, false, true),
    enabled: !!organizationId,
  });
  const assignmentsQuery = useQuery({
    queryKey: ['coordinator-assignments', organizationId],
    queryFn: () => schedulingApi.listCoordinatorAssignments(organizationId),
    enabled: !!organizationId,
  });

  const lecturers = (usersQuery.data ?? []).filter((u) => u.role === 'LECTURER');

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['coordinator-assignments', organizationId] });
  }

  const assignMutation = useMutation({
    mutationFn: () => schedulingApi.assignCoordinator({ userId: selectedUserId, orgUnitId: selectedOrgUnitId }),
    onSuccess: () => {
      setAssignError(null);
      invalidate();
    },
    onError: (err) => setAssignError(err instanceof Error ? err.message : 'Failed to assign coordinator'),
  });

  const revokeMutation = useMutation({
    mutationFn: (assignmentId: string) => schedulingApi.revokeCoordinator(assignmentId),
    onSuccess: invalidate,
  });

  if (authLoading || !isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
      </main>
    );
  }

  return (
    <AppShell>
      <AppHeader title="Department Coordinators" />

      <section className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
          Lecturer
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--fg-primary)]"
          >
            <option value="">Select a lecturer…</option>
            {lecturers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.firstName} {l.lastName} ({l.email})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
          Department
          <select
            value={selectedOrgUnitId}
            onChange={(e) => setSelectedOrgUnitId(e.target.value)}
            className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--fg-primary)]"
          >
            <option value="">Select a department…</option>
            {(unitsQuery.data ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {'— '.repeat(u.depth)}
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => assignMutation.mutate()}
          disabled={!selectedUserId || !selectedOrgUnitId || assignMutation.isPending}
          className="rounded-md bg-[var(--accent-primary)] px-3 py-1.5 text-sm font-medium text-[var(--fg-on-accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
        >
          {assignMutation.isPending ? 'Assigning…' : 'Assign'}
        </button>
        {assignError && <p className="text-sm text-[var(--fg-clash)]">{assignError}</p>}
      </section>

      {assignmentsQuery.isLoading ? (
        <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
      ) : (assignmentsQuery.data ?? []).length === 0 ? (
        <p className="text-sm text-[var(--fg-muted)]">No department coordinators assigned yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[var(--accent-secondary)]">
              <tr>
                <th className="border-b border-[var(--border-default)] px-3 py-2 text-left text-xs font-semibold text-[var(--fg-on-accent-primary)]">
                  Lecturer
                </th>
                <th className="border-b border-[var(--border-default)] px-3 py-2 text-left text-xs font-semibold text-[var(--fg-on-accent-primary)]">
                  Department
                </th>
                <th className="border-b border-[var(--border-default)] px-3 py-2 text-left text-xs font-semibold text-[var(--fg-on-accent-primary)]">
                  Assigned
                </th>
                <th className="border-b border-[var(--border-default)] px-3 py-2 text-left text-xs font-semibold text-[var(--fg-on-accent-primary)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {(assignmentsQuery.data ?? []).map((a) => (
                <tr key={a.id} className="even:bg-[var(--bg-alternate)]/60 hover:bg-[var(--bg-alternate)]">
                  <td className="border-b border-[var(--border-default)] px-3 py-2 text-[var(--fg-primary)]">
                    {a.user.firstName} {a.user.lastName} ({a.user.email})
                  </td>
                  <td className="border-b border-[var(--border-default)] px-3 py-2 text-[var(--fg-primary)]">{a.orgUnit.name}</td>
                  <td className="border-b border-[var(--border-default)] px-3 py-2 text-[var(--fg-muted)]">
                    {new Date(a.assignedAt).toLocaleDateString()}
                  </td>
                  <td className="border-b border-[var(--border-default)] px-3 py-2">
                    <button
                      type="button"
                      onClick={() => revokeMutation.mutate(a.id)}
                      disabled={revokeMutation.isPending}
                      className="text-xs text-[var(--fg-clash)] hover:underline disabled:opacity-60"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
