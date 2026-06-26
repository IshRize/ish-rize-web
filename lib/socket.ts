/**
 * Module: socket client
 * Layer:  lib (client-side)
 * Context: See COPILOT_CONTEXT.md, ARCHITECTURE.md §8
 *
 * Purpose: A singleton Socket.io connection to the backend's real-time layer
 *          (ish-rize-backend src/engines/realtime/syncEngine.ts). Connects
 *          directly to the backend (not proxied) and authenticates with a token
 *          fetched once from /api/auth/socket-token — see that route's header
 *          comment for the documented security trade-off.
 */
'use client';

import { io, type Socket } from 'socket.io-client';

let socketPromise: Promise<Socket> | null = null;

async function fetchSocketToken(): Promise<string> {
  const res = await fetch('/api/auth/socket-token');
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(json?.message ?? 'Failed to obtain a socket token');
  }
  return json.data.token as string;
}

/** Returns the shared socket connection, connecting it on first use. */
export function connectSocket(): Promise<Socket> {
  if (!socketPromise) {
    socketPromise = fetchSocketToken().then((token) => {
      const url = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';
      return io(url, { auth: { token } });
    });
  }
  return socketPromise;
}

export async function disconnectSocket(): Promise<void> {
  if (!socketPromise) return;
  const socket = await socketPromise;
  socket.close();
  socketPromise = null;
}
