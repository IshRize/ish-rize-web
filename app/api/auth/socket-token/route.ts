/**
 * Module: GET /api/auth/socket-token (Next.js route handler)
 * Layer:  edge (server)
 * Context: See COPILOT_CONTEXT.md, ARCHITECTURE.md §8 (auth & real-time at the edge)
 *
 * Purpose: Hand the browser the JWT, once, solely so it can authenticate the
 *          Socket.io handshake (lib/socket.ts). The backend's WebSocket server
 *          cannot be reached through the REST proxy — WebSocket upgrades are
 *          not practical through Next.js route handlers — so the browser
 *          connects to it directly and must present a token itself.
 *
 * Notes:
 * - SECURITY TRADE-OFF, deliberate and scoped: every other backend call goes
 *   through /api/proxy/* and the JWT never reaches client JS. This endpoint is
 *   the one exception, narrowly for the socket handshake. It exposes the same
 *   24h token already trusted for REST — no new privilege, but client JS can
 *   now read it. The proper long-term fix is a dedicated short-lived,
 *   single-purpose socket ticket (mint via the backend, not the raw JWT); that
 *   is tracked alongside the existing JWT-hardening backlog item in
 *   ish-rize-docs/SUGGESTED_SECURITY.md (Phase 1, item 3) and intentionally not
 *   built ahead of that, to avoid solving a more sophisticated auth problem
 *   here than the rest of the system currently handles.
 */
import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/serverAuth';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
  }
  return NextResponse.json({ success: true, data: { token } });
}
