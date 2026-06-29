/**
 * Module: Coordinator Hub
 * Layer:  web-page (client)
 * Context: See COPILOT_CONTEXT.md; Coordinator Hub Phase 2
 *
 * Purpose: A department coordinator's (or ADMIN's) own management screen --
 *          mirrors the ADMIN hub's shape, but scoped to whichever
 *          department(s) the signed-in person actually coordinates (ADMIN
 *          sees every department instead). Tabs: Lecturers (add/archive
 *          Hosts), Courses (reassign catalog ownership), and Teaching Load
 *          (absorbed from the former standalone /teaching-load page in
 *          Phase 3 -- coordinator-management data belongs here, not its own
 *          top-level nav item). Visible only to coordinators/ADMIN, same gate
 *          as the Master Timetable link (useIsCoordinator) -- everyone else
 *          never even sees a 403.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useIsCoordinator } from '@/hooks/useIsCoordinator';
import { useStructuralSocket } from '@/hooks/useStructuralSocket';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppShell } from '@/components/layout/AppShell';
import { Select } from '@/components/ui/Select';
import { LecturerManagementTable } from '@/components/department-admin/LecturerManagementTable';
import { CourseLecturerTable } from '@/components/department-admin/CourseLecturerTable';
import { TeachingLoadTab } from '@/components/department-admin/TeachingLoadTab';

type Tab = 'lecturers' | 'courses' | 'teaching-load';

const TABS: { id: Tab; label: string }[] = [
  { id: 'lecturers', label: 'Lecturers' },
  { id: 'courses', label: 'Courses' },
  { id: 'teaching-load', label: 'Teaching Load' },
];

export default function DepartmentAdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { isCoordinator, isLoading: coordinatorLoading } = useIsCoordinator();
  const { organizationId } = useScheduleSelectionStore();
  const [orgUnitId, setOrgUnitId] = useState('');
  const [tab, setTab] = useState<Tab>('lecturers');

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && !coordinatorLoading && !isCoordinator) {
      router.replace('/schedule');
    }
  }, [authLoading, isAuthenticated, coordinatorLoading, isCoordinator, router]);

  useStructuralSocket(organizationId);

  const allUnitsQuery = useQuery({
    queryKey: ['org-units', organizationId],
    queryFn: () => schedulingApi.listOrgUnits(organizationId, false, true),
    enabled: !!organizationId && isAdmin,
  });
  const myAssignmentsQuery = useQuery({
    queryKey: ['my-coordinator-assignments'],
    queryFn: () => schedulingApi.listMyCoordinatorAssignments(),
    enabled: !!isAuthenticated && !isAdmin,
  });

  // Same scoping convention as Teaching Load -- this picker only offers
  // departments the signed-in person can actually manage.
  const manageableDepartments = useMemo(() => {
    if (isAdmin) return (allUnitsQuery.data ?? []).map((u) => ({ id: u.id, name: u.name }));
    return (myAssignmentsQuery.data ?? []).map((a) => a.orgUnit);
  }, [isAdmin, allUnitsQuery.data, myAssignmentsQuery.data]);

  useEffect(() => {
    if (!orgUnitId && manageableDepartments.length > 0) setOrgUnitId(manageableDepartments[0].id);
  }, [orgUnitId, manageableDepartments]);

  if (authLoading || !isAuthenticated || coordinatorLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
      </main>
    );
  }

  return (
    <AppShell>
      <AppHeader title="Coordinator Hub" />

      <section className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        <Select
          label="Department"
          value={orgUnitId}
          onChange={setOrgUnitId}
          options={manageableDepartments.map((d) => ({ value: d.id, label: d.name }))}
        />
      </section>

      {!isAdmin && manageableDepartments.length === 0 && (
        <p className="text-sm text-[var(--fg-muted)]">
          You aren&apos;t a department timetable coordinator for any department yet. Ask an admin to assign you one.
        </p>
      )}

      {orgUnitId && (
        <>
          <div className="mb-4 flex gap-2 border-b border-[var(--border-default)]">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-sm font-medium ${
                  tab === t.id
                    ? 'border-b-2 border-[var(--accent-primary)] text-[var(--fg-primary)]'
                    : 'text-[var(--fg-muted)] hover:text-[var(--fg-primary)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'lecturers' && <LecturerManagementTable orgUnitId={orgUnitId} />}
          {tab === 'courses' && <CourseLecturerTable orgUnitId={orgUnitId} />}
          {tab === 'teaching-load' && <TeachingLoadTab orgUnitId={orgUnitId} />}
        </>
      )}
    </AppShell>
  );
}
