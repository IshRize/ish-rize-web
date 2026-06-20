/**
 * Module: POST /api/auth/logout (Next.js route handler)
 * Layer:  edge (server)
 * Context: See COPILOT_CONTEXT.md
 *
 * Purpose: Clear the httpOnly session cookie. No backend call needed — JWTs are
 *          stateless; logout is purely a client-cookie operation here.
 */
import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/serverAuth';

export async function POST(): Promise<NextResponse> {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
