import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '../../../../../lib/session';
import { beginLogin, getOrigin, suomiFiMode, type Intent } from '../../../../../lib/suomifi';
import { db } from '../../../../../prisma/db';

// Starts a Suomi.fi login for the signed-in resident: ?intent=verify, or
// ?intent=sign&leaseId=... to sign a lease.
export async function GET(request: NextRequest) {
  const origin = getOrigin(request);
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL('/login', origin));

  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  const intent: Intent = request.nextUrl.searchParams.get('intent') === 'sign' ? 'sign' : 'verify';
  const leaseId = request.nextUrl.searchParams.get('leaseId');
  const verifyPath = tenant?.unitId ? '/lease?tab=verify' : '/apply/verify?x=1';
  const returnTo = intent === 'sign' && leaseId ? `/lease/sign/${leaseId}?x=1` : verifyPath;

  if (suomiFiMode() === 'off') return NextResponse.redirect(new URL(`${returnTo}&err=suomifi_off`, origin));
  if (intent === 'sign') {
    const lease = leaseId ? await db.orm.public.Lease.where({ id: leaseId }).first() : null;
    if (!lease || lease.tenantId !== session.tenantId) return NextResponse.redirect(new URL('/lease', origin));
  }
  const url = await beginLogin(origin, { intent, leaseId, tenantId: session.tenantId, returnTo });
  return NextResponse.redirect(url);
}
