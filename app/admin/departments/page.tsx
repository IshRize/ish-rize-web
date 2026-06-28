/**
 * Module: Departments admin page
 * Layer:  web-page (client)
 * Context: See COPILOT_CONTEXT.md
 *
 * Purpose: ADMIN-only screen to create, rename, and archive departments
 *          (OrgUnit tree) for the currently-selected organization, replacing
 *          the seed-script-only workflow. Archiving rather than deleting --
 *          a department with Hosts/Courses/Venues attached can't be safely
 *          hard-deleted.
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { useStructuralSocket } from '@/hooks/useStructuralSocket';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppShell } from '@/components/layout/AppShell';
import type { OrgUnit } from '@/types/scheduling';

export default function DepartmentsAdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { organizationId } = useScheduleSelectionStore();
  const queryClient = useQueryClient();

  const [showArchived, setShowArchived] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUnitType, setNewUnitType] = useState('Department');
  const [newParentId, setNewParentId] = useState<string>('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
    else if (!authLoading && user && user.role !== 'ADMIN') router.replace('/schedule');
  }, [authLoading, isAuthenticated, user, router]);

  useStructuralSocket(organizationId);

  const unitsQuery = useQuery({
    queryKey: ['org-units', organizationId, showArchived],
    queryFn: () => schedulingApi.listOrgUnits(organizationId, showArchived),
    enabled: !!organizationId,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['org-units', organizationId] });
  }

  const createMutation = useMutation({
    mutationFn: () =>
      schedulingApi.createOrgUnit({
        organizationId,
        parentId: newParentId || null,
        name: newName.trim(),
        unitType: newUnitType.trim(),
      }),
    onSuccess: () => {
      setNewName('');
      setCreateError(null);
      invalidate();
    },
    onError: (err) => setCreateError(err instanceof Error ? err.message : 'Failed to create department'),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => schedulingApi.updateOrgUnit(id, { name }),
    onSuccess: () => {
      setRenamingId(null);
      invalidate();
    },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => schedulingApi.updateOrgUnit(id, { archived }),
    onSuccess: invalidate,
  });

  const units = unitsQuery.data ?? [];
  // Sort by depth then orderIndex so children render under their parent in a
  // flat indented list -- no real tree widget needed for this scale.
  const sorted = [...units].sort((a, b) => a.depth - b.depth || a.orderIndex - b.orderIndex);

  if (authLoading || !isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
      </main>
    );
  }

  return (
    <AppShell>
      <AppHeader title="Manage Departments" />

      <section className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
          Name
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Department of Computer Science"
            className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--fg-primary)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
          Unit type
          <input
            value={newUnitType}
            onChange={(e) => setNewUnitType(e.target.value)}
            className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--fg-primary)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
          Parent unit
          <select
            value={newParentId}
            onChange={(e) => setNewParentId(e.target.value)}
            className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--fg-primary)]"
          >
            <option value="">(top level)</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {'— '.repeat(u.depth)}
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={!newName.trim() || !newUnitType.trim() || createMutation.isPending}
          className="rounded-md bg-[var(--accent-primary)] px-3 py-1.5 text-sm font-medium text-[var(--fg-on-accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
        >
          {createMutation.isPending ? 'Creating…' : 'Create'}
        </button>
        {createError && <p className="text-sm text-[var(--fg-clash)]">{createError}</p>}
      </section>

      <label className="mb-3 flex items-center gap-2 text-sm text-[var(--fg-muted)]">
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
        Show archived
      </label>

      {unitsQuery.isLoading ? (
        <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[var(--accent-secondary)]">
              <tr>
                <th className="border-b border-[var(--border-default)] px-3 py-2 text-left text-xs font-semibold text-[var(--fg-on-accent-primary)]">
                  Name
                </th>
                <th className="border-b border-[var(--border-default)] px-3 py-2 text-left text-xs font-semibold text-[var(--fg-on-accent-primary)]">
                  Type
                </th>
                <th className="border-b border-[var(--border-default)] px-3 py-2 text-left text-xs font-semibold text-[var(--fg-on-accent-primary)]">
                  Status
                </th>
                <th className="border-b border-[var(--border-default)] px-3 py-2 text-left text-xs font-semibold text-[var(--fg-on-accent-primary)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((u: OrgUnit) => (
                <tr key={u.id} className="even:bg-[var(--bg-alternate)]/60 hover:bg-[var(--bg-alternate)]">
                  <td className="border-b border-[var(--border-default)] px-3 py-2">
                    <span style={{ paddingLeft: `${u.depth * 1.25}rem` }}>
                      {renamingId === u.id ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && renameValue.trim()) renameMutation.mutate({ id: u.id, name: renameValue.trim() });
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-sm text-[var(--fg-primary)]"
                        />
                      ) : (
                        <span className={u.archived ? 'text-[var(--fg-muted)] line-through' : 'text-[var(--fg-primary)]'}>{u.name}</span>
                      )}
                    </span>
                  </td>
                  <td className="border-b border-[var(--border-default)] px-3 py-2 text-[var(--fg-muted)]">{u.unitType}</td>
                  <td className="border-b border-[var(--border-default)] px-3 py-2 text-[var(--fg-muted)]">
                    {u.archived ? 'Archived' : 'Active'}
                  </td>
                  <td className="border-b border-[var(--border-default)] px-3 py-2">
                    {renamingId === u.id ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => renameValue.trim() && renameMutation.mutate({ id: u.id, name: renameValue.trim() })}
                          className="text-xs text-[var(--fg-free-slot)] hover:underline"
                        >
                          Save
                        </button>
                        <button type="button" onClick={() => setRenamingId(null)} className="text-xs text-[var(--fg-muted)] hover:underline">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingId(u.id);
                            setRenameValue(u.name);
                          }}
                          className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => archiveMutation.mutate({ id: u.id, archived: !u.archived })}
                          className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
                        >
                          {u.archived ? 'Unarchive' : 'Archive'}
                        </button>
                      </div>
                    )}
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
