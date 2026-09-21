import { NextResponse, type NextRequest } from 'next/server';
import { bankMode } from '../../../../../lib/openbanking';

// Development only: a fake bank consent screen.
export async function GET(request: NextRequest) {
  if (bankMode() !== 'mock') return new NextResponse('Not found', { status: 404 });
  const q = request.nextUrl.searchParams;
  const redirect = q.get('redirect') ?? '';
  const approve = `${redirect}${redirect.includes('?') ? '&' : '?'}code=mock-approved&state=${encodeURIComponent(q.get('state') ?? '')}`;
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><title>Mock Bank</title><body style="font-family:sans-serif;max-width:480px;margin:60px auto"><h1>Mock Bank</h1><p>Development only. Kuopas asks for read-only access to your account transactions. Nothing here is real.</p><p><a href="${approve}">Approve read-only access</a></p></body>`,
    { headers: { 'content-type': 'text/html; charset=utf-8' } },
  );
}
