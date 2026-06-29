/**
 * Module: LecturerManagementTable
 * Layer:  web-component (client)
 * Context: See COPILOT_CONTEXT.md; Coordinator Hub Phase 2
 *
 * Purpose: The Coordinator Hub's "Lecturers" tab -- list, add (link an
 *          existing registered LECTURER user, or create a bare placeholder),
 *          and archive/unarchive Hosts in one department. Mirrors
 *          app/admin/venues/page.tsx's create-form + table + archive-toggle
 *          shape, scoped by canManageDepartment server-side rather than
 *          ADMIN-only.
 */
'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, schedulingApi } from '@/lib/api';

interface LecturerManagementTableProps {
  orgUnitId: string;
}

export function LecturerManagementTable({ orgUnitId }: LecturerManagementTableProps) {
  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [mode, setMode] = useState<'link' | 'placeholder'>('link');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [initials, setInitials] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const hostsQuery = useQuery({
    queryKey: ['hosts', orgUnitId, showArchived],
    queryFn: () => schedulingApi.listHosts(orgUnitId, showArchived),
    enabled: !!orgUnitId,
  });
  const usersQuery = useQuery({ queryKey: ['admin-users'], queryFn: adminApi.listUsers });

  const hosts = hostsQuery.data ?? [];
  // Only offer LECTURER users not already linked to a Host in THIS department
  // -- a user can have one Host per organization (not per department), but
  // narrowing to this department's existing links is enough to stop an
  // obvious double-add from this picker; the backend's own uniqueness check
  // is still the real guard.
  const linkedUserIds = new Set(hosts.map((h) => h.userId).filter((id): id is string => !!id));
  const linkableLecturers = (usersQuery.data ?? []).filter((u) => u.role === 'LECTURER' && !linkedUserIds.has(u.id));

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['hosts', orgUnitId] });
  }

  const createMutation = useMutation({
    mutationFn: () =>
      mode === 'link'
        ? schedulingApi.createHost({ orgUnitId, userId: selectedUserId })
        : schedulingApi.createHost({ orgUnitId, initials: initials.trim(), displayName: displayName.trim() }),
    onSuccess: () => {
      setSelectedUserId('');
      setInitials('');
      setDisplayName('');
      setCreateError(null);
      invalidate();
    },
    onError: (err) => setCreateError(err instanceof Error ? err.message : 'Failed to add lecturer'),
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => schedulingApi.updateHost(id, { archived }),
    onSuccess: invalidate,
  });

  const canSubmit = mode === 'link' ? !!selectedUserId : !!initials.trim() && !!displayName.trim();

  return (
    <div>
      <section className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
          Add lecturer
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as 'link' | 'placeholder')}
            className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--fg-primary)]"
          >
            <option value="link">Link a registered lecturer</option>
            <option value="placeholder">Create placeholder (not signed up yet)</option>
          </select>
        </label>

        {mode === 'link' ? (
          <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
            Lecturer
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--fg-primary)]"
            >
              <option value="">Select a lecturer…</option>
              {linkableLecturers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.firstName} {l.lastName} ({l.email})
                </option>
              ))}
            </select>
          </label>
        ) : (
          <>
            <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
              Initials
              <input
                value={initials}
                onChange={(e) => setInitials(e.target.value)}
                placeholder="e.g. KD"
                className="w-24 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--fg-primary)]"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
              Display name
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Dr. K. Dontwi"
                className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--fg-primary)]"
              />
            </label>
          </>
        )}

        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={!canSubmit || createMutation.isPending}
          className="rounded-md bg-[var(--accent-primary)] px-3 py-1.5 text-sm font-medium text-[var(--fg-on-accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
        >
          {createMutation.isPending ? 'Adding…' : 'Add'}
        </button>
        {createError && <p className="text-sm text-[var(--fg-clash)]">{createError}</p>}
      </section>

      <label className="mb-3 flex items-center gap-2 text-sm text-[var(--fg-muted)]">
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
        Show archived
      </label>

      {hostsQuery.isLoading ? (
        <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
      ) : hosts.length === 0 ? (
        <p className="text-sm text-[var(--fg-muted)]">No lecturers in this department yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[var(--accent-secondary)]">
              <tr>
                {['Initials', 'Display name', 'Linked account', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="border-b border-[var(--border-default)] px-3 py-2 text-left text-xs font-semibold text-[var(--fg-on-accent-primary)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hosts.map((h) => (
                <tr key={h.id} className="even:bg-[var(--bg-alternate)]/60 hover:bg-[var(--bg-alternate)]">
                  <td className={`border-b border-[var(--border-default)] px-3 py-2 ${h.archived ? 'text-[var(--fg-muted)] line-through' : 'text-[var(--fg-primary)]'}`}>
                    {h.initials}
                  </td>
                  <td className={`border-b border-[var(--border-default)] px-3 py-2 ${h.archived ? 'text-[var(--fg-muted)] line-through' : 'text-[var(--fg-primary)]'}`}>
                    {h.displayName}
                  </td>
                  <td className="border-b border-[var(--border-default)] px-3 py-2 text-[var(--fg-muted)]">
                    {h.userId ? 'Linked' : 'Placeholder — not signed up'}
                  </td>
                  <td className="border-b border-[var(--border-default)] px-3 py-2 text-[var(--fg-muted)]">{h.archived ? 'Archived' : 'Active'}</td>
                  <td className="border-b border-[var(--border-default)] px-3 py-2">
                    <button
                      type="button"
                      onClick={() => archiveMutation.mutate({ id: h.id, archived: !h.archived })}
                      className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
                    >
                      {h.archived ? 'Unarchive' : 'Archive'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
