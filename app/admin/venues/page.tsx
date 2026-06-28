/**
 * Module: Venues admin page
 * Layer:  web-page (client)
 * Context: See COPILOT_CONTEXT.md; mirrors app/admin/departments/page.tsx
 *
 * Purpose: ADMIN-only screen to create, rename, reassign, and archive Venues
 *          for the currently-selected organization. Previously a Venue could
 *          only ever come into existence implicitly via file ingestion's
 *          venue-name matching -- this is the first direct way to manage one.
 *          Archiving rather than deleting -- a Venue with Bookings/MasterSlots
 *          attached can't be safely hard-deleted (same convention as
 *          Departments).
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
import { Select } from '@/components/ui/Select';
import type { VenueSummary } from '@/types/scheduling';

const VENUE_TYPES = ['LECTURE_HALL', 'LAB', 'SEMINAR_ROOM', 'UNIT_ROOM', 'ONLINE'];
const UNASSIGNED = '';

export default function VenuesAdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { organizationId } = useScheduleSelectionStore();
  const queryClient = useQueryClient();

  const [showArchived, setShowArchived] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState(VENUE_TYPES[0]);
  const [newCapacity, setNewCapacity] = useState('0');
  const [newOrgUnitId, setNewOrgUnitId] = useState(UNASSIGNED);
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

  const venuesQuery = useQuery({
    queryKey: ['venues', organizationId, showArchived],
    queryFn: () => schedulingApi.listVenues(organizationId, undefined, showArchived),
    enabled: !!organizationId,
  });
  // Reassignment picker offers every real department -- same masterDerivedOnly
  // filter every other "pick a department" selector uses.
  const unitsQuery = useQuery({
    queryKey: ['org-units', organizationId],
    queryFn: () => schedulingApi.listOrgUnits(organizationId, false, true),
    enabled: !!organizationId,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['venues', organizationId] });
  }

  const createMutation = useMutation({
    mutationFn: () =>
      schedulingApi.createVenue({
        organizationId,
        orgUnitId: newOrgUnitId || null,
        name: newName.trim(),
        capacity: Number(newCapacity) || 0,
        type: newType,
      }),
    onSuccess: () => {
      setNewName('');
      setNewCapacity('0');
      setNewOrgUnitId(UNASSIGNED);
      setCreateError(null);
      invalidate();
    },
    onError: (err) => setCreateError(err instanceof Error ? err.message : 'Failed to create venue'),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => schedulingApi.updateVenue(id, { name }),
    onSuccess: () => {
      setRenamingId(null);
      invalidate();
    },
  });

  const reassignMutation = useMutation({
    mutationFn: ({ id, orgUnitId }: { id: string; orgUnitId: string | null }) => schedulingApi.updateVenue(id, { orgUnitId }),
    onSuccess: invalidate,
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => schedulingApi.updateVenue(id, { archived }),
    onSuccess: invalidate,
  });

  const venues = venuesQuery.data ?? [];
  const units = unitsQuery.data ?? [];

  if (authLoading || !isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
      </main>
    );
  }

  return (
    <AppShell>
      <AppHeader title="Manage Venues" />

      <section className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
          Name
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Main Auditorium"
            className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--fg-primary)]"
          />
        </label>
        <Select label="Type" value={newType} onChange={setNewType} options={VENUE_TYPES.map((t) => ({ value: t, label: t }))} />
        <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
          Capacity
          <input
            type="number"
            min={0}
            value={newCapacity}
            onChange={(e) => setNewCapacity(e.target.value)}
            className="w-24 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm tabular-nums text-[var(--fg-primary)]"
          />
        </label>
        <Select
          label="Department (optional)"
          value={newOrgUnitId}
          onChange={setNewOrgUnitId}
          options={[{ value: UNASSIGNED, label: 'Shared / central' }, ...units.map((u) => ({ value: u.id, label: u.name }))]}
        />
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={!newName.trim() || createMutation.isPending}
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

      {venuesQuery.isLoading ? (
        <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[var(--accent-secondary)]">
              <tr>
                {['Name', 'Type', 'Capacity', 'Department', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="border-b border-[var(--border-default)] px-3 py-2 text-left text-xs font-semibold text-[var(--fg-on-accent-primary)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {venues.map((v: VenueSummary) => (
                <tr key={v.id} className="even:bg-[var(--bg-alternate)]/60 hover:bg-[var(--bg-alternate)]">
                  <td className="border-b border-[var(--border-default)] px-3 py-2">
                    {renamingId === v.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && renameValue.trim()) renameMutation.mutate({ id: v.id, name: renameValue.trim() });
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-sm text-[var(--fg-primary)]"
                      />
                    ) : (
                      <span className={v.archived ? 'text-[var(--fg-muted)] line-through' : 'text-[var(--fg-primary)]'}>{v.name}</span>
                    )}
                  </td>
                  <td className="border-b border-[var(--border-default)] px-3 py-2 text-[var(--fg-muted)]">{v.type}</td>
                  <td className="border-b border-[var(--border-default)] px-3 py-2 tabular-nums text-[var(--fg-muted)]">{v.capacity}</td>
                  <td className="border-b border-[var(--border-default)] px-3 py-2">
                    <select
                      value={v.orgUnitId ?? UNASSIGNED}
                      onChange={(e) => reassignMutation.mutate({ id: v.id, orgUnitId: e.target.value || null })}
                      className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-xs text-[var(--fg-primary)]"
                    >
                      <option value={UNASSIGNED}>Shared / central</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border-b border-[var(--border-default)] px-3 py-2 text-[var(--fg-muted)]">{v.archived ? 'Archived' : 'Active'}</td>
                  <td className="border-b border-[var(--border-default)] px-3 py-2">
                    {renamingId === v.id ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => renameValue.trim() && renameMutation.mutate({ id: v.id, name: renameValue.trim() })}
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
                            setRenamingId(v.id);
                            setRenameValue(v.name);
                          }}
                          className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => archiveMutation.mutate({ id: v.id, archived: !v.archived })}
                          className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
                        >
                          {v.archived ? 'Unarchive' : 'Archive'}
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
