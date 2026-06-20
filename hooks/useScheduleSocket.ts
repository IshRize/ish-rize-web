/**
 * Module: useScheduleSocket
 * Layer:  lib (client hook)
 * Context: See COPILOT_CONTEXT.md, IMPLEMENTATION_PLAN.md (Phase 4)
 *
 * Purpose: Join the given term's real-time room and invalidate the affected
 *          TanStack Query caches whenever the backend broadcasts
 *          booking:changed — so every viewer's grid updates without a manual
 *          refresh. Leaves the room and detaches on unmount or term change.
 */
'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import { connectSocket } from '@/lib/socket';

export function useScheduleSocket(termId: string | undefined): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!termId) return;

    let socket: Socket | undefined;
    let cancelled = false;

    const handleBookingChanged = (): void => {
      queryClient.invalidateQueries({ queryKey: ['schedule', termId] });
      queryClient.invalidateQueries({ queryKey: ['clashes', termId] });
    };

    connectSocket().then((s) => {
      if (cancelled) return;
      socket = s;
      s.emit('join-term', termId);
      s.on('booking:changed', handleBookingChanged);
    });

    return () => {
      cancelled = true;
      if (socket) {
        socket.emit('leave-term', termId);
        socket.off('booking:changed', handleBookingChanged);
      }
    };
  }, [termId, queryClient]);
}
