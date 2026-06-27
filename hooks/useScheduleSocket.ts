/**
 * Module: useScheduleSocket
 * Layer:  lib (client hook)
 * Context: See COPILOT_CONTEXT.md, IMPLEMENTATION_PLAN.md (Phase 4)
 *
 * Purpose: Join the given term's real-time room and invalidate the affected
 *          TanStack Query caches whenever the backend broadcasts
 *          booking:changed — so every viewer's grid updates without a manual
 *          refresh. Leaves the room and detaches on unmount or term change.
 *          Also reports live connection state for the presence indicator.
 */
'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import { connectSocket } from '@/lib/socket';

export function useScheduleSocket(termId: string | undefined): { connected: boolean } {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!termId) return;

    let socket: Socket | undefined;
    let cancelled = false;

    const handleBookingChanged = (): void => {
      // Every cache a booking mutation can affect. Keys are invalidated by
      // prefix, so ['schedule', termId] also matches ['schedule', termId,
      // orgUnitId] -- the department-scoped variants used by the dept and
      // clashes views -- without listing each orgUnit explicitly.
      for (const key of [
        ['schedule', termId],
        ['clashes', termId],
        ['department-timetable', termId],
        ['teaching-load', termId],
        ['my-teaching-load', termId],
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
      s.emit('join-term', termId);
      s.on('booking:changed', handleBookingChanged);
      s.on('connect', handleConnect);
      s.on('disconnect', handleDisconnect);
    });

    return () => {
      cancelled = true;
      setConnected(false);
      if (socket) {
        socket.emit('leave-term', termId);
        socket.off('booking:changed', handleBookingChanged);
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
      }
    };
  }, [termId, queryClient]);

  return { connected };
}
