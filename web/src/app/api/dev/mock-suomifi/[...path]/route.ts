import { NextResponse, type NextRequest } from 'next/server';
import { getOrigin, suomiFiMode } from '../../../../../lib/suomifi';
import { MOCK_PEOPLE, mockDiscovery, mockExchange, mockIssueCode, mockJwks } from '../../../../../lib/suomifi-mock';

function disabled() {
  return new NextResponse('Not found', { status: 404 });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  if (suomiFiMode() !== 'mock') return disabled();
  const origin = getOrigin(request);
  const path = (await params).path.join('/');

  if (path === '.well-known/openid-configuration') return NextResponse.json(mockDiscovery(origin));
  if (path === 'jwks') return NextResponse.json(mockJwks());

  if (path === 'authorize') {
    const q = request.nextUrl.searchParams;
    const redirect = q.get('redirect_uri') ?? '';
    const personId = q.get('person');
    const person = MOCK_PEOPLE.find((p) => p.id === personId);
    if (person) {
      const code = mockIssueCode(person, {
        nonce: q.get('nonce') ?? '',
        challenge: q.get('code_challenge') ?? '',
        clientId: q.get('client_id') ?? '',
        redirect,
      });
      return NextResponse.redirect(`${redirect}?code=${code}&state=${encodeURIComponent(q.get('state') ?? '')}`);
    }
    const links = MOCK_PEOPLE.map((p) => {
      const u = new URL(request.url);
      u.searchParams.set('person', p.id);
      return `<li><a href="${u.pathname}${u.search}">${p.given} ${p.family} (${p.id})</a></li>`;
    }).join('');
    return new NextResponse(
      `<!doctype html><meta charset="utf-8"><title>Mock Suomi.fi</title><body style="font-family:sans-serif;max-width:480px;margin:60px auto"><h1>Mock Suomi.fi login</h1><p>Development only. Choose a test person to sign in as. Nothing here is real.</p><ul>${links}</ul></body>`,
      { headers: { 'content-type': 'text/html; charset=utf-8' } },
    );
  }
  return disabled();
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  if (suomiFiMode() !== 'mock') return disabled();
  const path = (await params).path.join('/');
  if (path !== 'token') return disabled();
  const form = await request.formData();
  const result = mockExchange(getOrigin(request), String(form.get('code') ?? ''), String(form.get('code_verifier') ?? ''));
  if (!result) return NextResponse.json({ error: 'invalid_grant' }, { status: 400 });
  return NextResponse.json(result);
}
