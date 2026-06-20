/**
 * Module: API proxy (catch-all)
 * Layer:  edge (server)
 * Contract: forwards GET/POST/PATCH/DELETE under /api/proxy/* to the backend's
 *           /api/* of the same path, attaching the JWT from the httpOnly cookie.
 * Context: See COPILOT_CONTEXT.md, API_CONTRACT.md
 *
 * Purpose: The browser never holds the JWT (httpOnly cookie) and so cannot set
 *          an Authorization header itself. This proxy reads the cookie
 *          server-side and forwards the request to the real backend, so the
 *          client-side API layer can stay a plain same-origin fetch.
 *
 * Notes:
 * - Thin: no business logic. The backend remains the single source of truth.
 * - Forwards the original Content-Type and raw bytes (not re-encoded as text),
 *   so multipart/form-data uploads (e.g. ingestion file parsing) pass through
 *   with their boundary intact, alongside plain JSON bodies.
 */
import { NextRequest, NextResponse } from 'next/server';
import { backendBaseUrl, SESSION_COOKIE } from '@/lib/serverAuth';

async function forward(req: NextRequest, segments: string[]): Promise<NextResponse> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const path = segments.join('/');
  const search = req.nextUrl.search;
  const target = `${backendBaseUrl()}/${path}${search}`;

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    const contentType = req.headers.get('content-type');
    if (contentType) headers['Content-Type'] = contentType;
    const body = await req.arrayBuffer();
    if (body.byteLength > 0) init.body = body;
  }

  const backendRes = await fetch(target, init);
  const text = await backendRes.text();
  return new NextResponse(text, {
    status: backendRes.status,
    headers: { 'Content-Type': backendRes.headers.get('Content-Type') ?? 'application/json' },
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function POST(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function PATCH(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function DELETE(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { path } = await ctx.params;
  return forward(req, path);
}
