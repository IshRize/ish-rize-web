/**
 * Module: Subject-department mappings admin page
 * Layer:  web-page (client)
 * Context: See COPILOT_CONTEXT.md; three-tier timetable refactor Phase 3
 *
 * Purpose: ADMIN-only screen to map a Master Timetable subject code (e.g.
 *          "MATH") to the department that owns it. MasterSlot itself carries
 *          no department info -- the real file groups by level, not
 *          department -- so this mapping is what lets a coordinator's
 *          department timetable find "their" slots at all.
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppShell } from '@/components/layout/AppShell';

export default function SubjectMappingsAdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { organizationId } = useScheduleSelectionStore();
  const queryClient = useQueryClient();

  const [subjectCode, setSubjectCode] = useState('');
  const [selectedOrgUnitId, setSelectedOrgUnitId] = useState('');
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
    else if (!authLoading && user && user.role !== 'ADMIN') router.replace('/schedule');
  }, [authLoading, isAuthenticated, user, router]);

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

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['subject-department-mappings', organizationId] });
  }

  const mapMutation = useMutation({
    mutationFn: () => schedulingApi.upsertSubjectDepartmentMapping({ organizationId, subjectCode, orgUnitId: selectedOrgUnitId }),
    onSuccess: () => {
      setSubjectCode('');
      setMapError(null);
      invalidate();
    },
    onError: (err) => setMapError(err instanceof Error ? err.message : 'Failed to map subject'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => schedulingApi.deleteSubjectDepartmentMapping(id),
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
      <AppHeader title="Subject → Department Mappings" />

      <section className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
          Subject code
          <input
            value={subjectCode}
            onChange={(e) => setSubjectCode(e.target.value)}
            placeholder="e.g. MATH"
            className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--fg-primary)]"
          />
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
          onClick={() => mapMutation.mutate()}
          disabled={!subjectCode.trim() || !selectedOrgUnitId || mapMutation.isPending}
          className="rounded-md bg-[var(--accent-primary)] px-3 py-1.5 text-sm font-medium text-[var(--fg-on-accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
        >
          {mapMutation.isPending ? 'Mapping…' : 'Map'}
        </button>
        {mapError && <p className="text-sm text-[var(--fg-clash)]">{mapError}</p>}
      </section>

      {mappingsQuery.isLoading ? (
        <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
      ) : (mappingsQuery.data ?? []).length === 0 ? (
        <p className="text-sm text-[var(--fg-muted)]">No subjects mapped yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[var(--accent-secondary)]">
              <tr>
                <th className="border-b border-[var(--border-default)] px-3 py-2 text-left text-xs font-semibold text-[var(--fg-on-accent-primary)]">
                  Subject
                </th>
                <th className="border-b border-[var(--border-default)] px-3 py-2 text-left text-xs font-semibold text-[var(--fg-on-accent-primary)]">
                  Department
                </th>
                <th className="border-b border-[var(--border-default)] px-3 py-2 text-left text-xs font-semibold text-[var(--fg-on-accent-primary)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {(mappingsQuery.data ?? []).map((m) => (
                <tr key={m.id} className="even:bg-[var(--bg-alternate)]/60 hover:bg-[var(--bg-alternate)]">
                  <td className="border-b border-[var(--border-default)] px-3 py-2 text-[var(--fg-primary)]">{m.subjectCode}</td>
                  <td className="border-b border-[var(--border-default)] px-3 py-2 text-[var(--fg-primary)]">{m.orgUnit.name}</td>
                  <td className="border-b border-[var(--border-default)] px-3 py-2">
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(m.id)}
                      disabled={deleteMutation.isPending}
                      className="text-xs text-[var(--fg-clash)] hover:underline disabled:opacity-60"
                    >
                      Remove
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
