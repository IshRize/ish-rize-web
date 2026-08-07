'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import { connectSocket } from '@/lib/socket';

const POLL_INTERVAL_MS = 30_000;

export function useScheduleSocket(termId: string | undefined): { connected: boolean } {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!termId) return;

    let socket: Socket | undefined;
    let cancelled = false;

    function startPolling() {
      if (pollRef.current) return;
      pollRef.current = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['schedule', termId] });
        queryClient.invalidateQueries({ queryKey: ['clashes', termId] });
      }, POLL_INTERVAL_MS);
    }

    function stopPolling() {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }

    const handleBookingChanged = (): void => {
      queryClient.invalidateQueries({ queryKey: ['schedule', termId] });
      queryClient.invalidateQueries({ queryKey: ['clashes', termId] });
    };

    const handleConnect = (): void => {
      setConnected(true);
      stopPolling();
    };

    const handleDisconnect = (): void => {
      setConnected(false);
      startPolling();
    };

    connectSocket()
      .then((s) => {
        if (cancelled) return;
        socket = s;
        setConnected(s.connected);
        s.emit('join-term', termId);
        s.on('booking:changed', handleBookingChanged);
        s.on('connect', handleConnect);
        s.on('disconnect', handleDisconnect);

        if (!s.connected) startPolling();
      })
      .catch(() => {
        if (!cancelled) {
          setConnected(false);
          startPolling();
        }
      });

    return () => {
      cancelled = true;
      stopPolling();
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
