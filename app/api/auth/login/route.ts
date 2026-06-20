/**
 * Module: POST /api/auth/login (Next.js route handler)
 * Layer:  edge (server)
 * Contract: forwards to backend /api/auth/login; never returns the token to the client.
 * Context: See COPILOT_CONTEXT.md
 *
 * Purpose: Authenticate against the IshRize backend and store the JWT in an
 *          httpOnly cookie. The browser only ever sees the user object.
 *
 * Notes:
 * - Backend is the source of truth for credential validation; this is a thin proxy.
 */
import { NextRequest, NextResponse } from 'next/server';
import { backendBaseUrl, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from '@/lib/serverAuth';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ success: false, message: 'email and password are required' }, { status: 400 });
  }

  const backendRes = await fetch(`${backendBaseUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: body.email, password: body.password }),
  });
  const json = await backendRes.json().catch(() => null);

  if (!backendRes.ok || !json?.success) {
    return NextResponse.json(
      { success: false, message: json?.message ?? 'Login failed' },
      { status: backendRes.status },
    );
  }

  const { token, user } = json.data;
  const res = NextResponse.json({ success: true, data: { user } });
  res.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  return res;
}
