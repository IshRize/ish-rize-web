/**
 * Module: useIsCoordinator
 * Layer:  lib (client hook)
 * Context: See COPILOT_CONTEXT.md; dept-coordinator tooling Phase 1
 *
 * Purpose: "Can this user see the master timetable?" -- true for ADMIN, or
 *          any LECTURER holding at least one active DepartmentCoordinatorAssignment.
 *          Mirrors the backend's isAnyDepartmentCoordinator check so the
 *          sidebar/page can hide the master-timetable link before the
 *          backend ever has to reject the request.
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export function useIsCoordinator(): { isCoordinator: boolean; isLoading: boolean } {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const assignmentsQuery = useQuery({
    queryKey: ['my-coordinator-assignments'],
    queryFn: () => schedulingApi.listMyCoordinatorAssignments(),
    enabled: !!user && !isAdmin,
  });

  if (isAdmin) return { isCoordinator: true, isLoading: false };
  return {
    isCoordinator: (assignmentsQuery.data?.length ?? 0) > 0,
    isLoading: assignmentsQuery.isLoading,
  };
}
