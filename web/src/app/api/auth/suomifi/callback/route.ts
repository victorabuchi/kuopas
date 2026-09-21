import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '../../../../../lib/session';
import { finishLogin, getOrigin } from '../../../../../lib/suomifi';
import { linkIdentity, signLease } from '../../../../../lib/suomifi-flow';
import { db } from '../../../../../prisma/db';

function withParam(path: string, key: string, value: string): string {
  return `${path}${path.includes('?') ? '&' : '?'}${key}=${encodeURIComponent(value)}`;
}

export async function GET(request: NextRequest) {
  const origin = getOrigin(request);
  const q = request.nextUrl.searchParams;
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL('/login', origin));
  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  const fallback = tenant?.unitId ? '/lease?tab=verify' : '/apply/verify?x=1';

  const code = q.get('code');
  const state = q.get('state');
  if (q.get('error') || !code || !state) return NextResponse.redirect(new URL(withParam(fallback, 'err', 'suomifi_failed'), origin));

  let result;
  try {
    result = await finishLogin(origin, code, state);
  } catch (error) {
    console.error('Suomi.fi login failed:', error);
    return NextResponse.redirect(new URL(withParam(fallback, 'err', 'suomifi_failed'), origin));
  }
  if (result.tenantId !== session.tenantId) return NextResponse.redirect(new URL('/login', origin));

  if (result.intent === 'verify') {
    const outcome = await linkIdentity(session.tenantId, result.personHash);
    if (outcome !== 'ok') return NextResponse.redirect(new URL(withParam(result.returnTo, 'err', outcome === 'taken' ? 'suomifi_taken' : 'suomifi_mismatch'), origin));
    return NextResponse.redirect(new URL(withParam(result.returnTo, 'done', '1'), origin));
  }

  const outcome = await signLease(session.tenantId, result.leaseId ?? '', result.personHash);
  if (outcome === 'ok' || outcome === 'already') return NextResponse.redirect(new URL(withParam(result.returnTo, 'signed', '1'), origin));
  const err = outcome === 'taken' ? 'suomifi_taken' : outcome === 'mismatch' ? 'suomifi_mismatch' : 'suomifi_failed';
  return NextResponse.redirect(new URL(withParam(result.returnTo, 'err', err), origin));
}
