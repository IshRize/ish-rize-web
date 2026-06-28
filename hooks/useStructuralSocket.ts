/**
 * Module: useStructuralSocket
 * Layer:  lib (client hook)
 * Context: See COPILOT_CONTEXT.md; sibling to useScheduleSocket.ts
 *
 * Purpose: Join the given organization's real-time room and invalidate the
 *          affected TanStack Query caches whenever the backend broadcasts
 *          structural:changed (a department/venue/subject-mapping/master-slot
 *          mutation) — so every viewer's pickers and grids update without a
 *          manual refresh, the same way booking changes already live-sync via
 *          useScheduleSocket. Separate hook/room because structural data isn't
 *          tied to a term the way bookings are -- a department exists
 *          independent of which term is currently selected.
 */
'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import { connectSocket } from '@/lib/socket';

export function useStructuralSocket(organizationId: string | undefined): { connected: boolean } {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!organizationId) return;

    let socket: Socket | undefined;
    let cancelled = false;

    const handleStructuralChanged = (): void => {
      // Every cache a department/venue/subject-mapping/master-slot mutation
      // can affect. Invalidated by prefix, same convention as
      // useScheduleSocket's booking:changed handler. department-timetable is
      // included unconditionally (not just for MasterSlot changes) because it
      // derives its rows from BOTH master slots AND subject-department
      // mappings (getDepartmentTimetable resolves orgUnitId -> subjectCodes
      // via the mapping table first) -- a mapping edit can add/remove which
      // subjects that view shows just as much as a slot edit can.
      for (const key of [
        ['org-units', organizationId],
        ['venues', organizationId],
        ['subject-department-mappings', organizationId],
        ['master-slots'],
        ['department-timetable'],
      ]) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    };
    const handleConnect = (): void => setConnected(true);
    const handleDisconnect = (): void => setConnected(false);

    connectSocket().then((s) => {
      if (cancelled) return;
      socket = s;
      setConnected(s.connected);
      s.emit('join-org', organizationId);
      s.on('structural:changed', handleStructuralChanged);
      s.on('connect', handleConnect);
      s.on('disconnect', handleDisconnect);
    });

    return () => {
      cancelled = true;
      setConnected(false);
      if (socket) {
        socket.emit('leave-org', organizationId);
        socket.off('structural:changed', handleStructuralChanged);
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
      }
    };
  }, [organizationId, queryClient]);

  return { connected };
}
