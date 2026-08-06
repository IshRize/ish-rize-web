import { NextRequest, NextResponse } from 'next/server';
import { backendBaseUrl, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from '@/lib/serverAuth';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.email || !body?.password) {
    return NextResponse.json(
      { success: false, message: 'name, email, and password are required' },
      { status: 400 },
    );
  }

  const backendRes = await fetch(`${backendBaseUrl()}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: body.name, email: body.email, password: body.password }),
  });
  const json = await backendRes.json().catch(() => null);

  if (!backendRes.ok || !json?.success) {
    return NextResponse.json(
      { success: false, message: json?.message ?? 'Registration failed' },
      { status: backendRes.status },
    );
  }

  const { token, user } = json.data;
  const res = NextResponse.json({ success: true, data: { user } });
  if (token) {
    res.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  }
  return res;
}
