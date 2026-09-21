import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '../../../../lib/session';
import { getOrigin } from '../../../../lib/google-oauth';
import { db } from '../../../../prisma/db';
import { bankAdapter } from '../../../../lib/openbanking';
import { consumeState } from '../../../../lib/openbanking/state';

export async function GET(request: NextRequest) {
  const origin = getOrigin(request);
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL('/login', origin));
  const fail = () => NextResponse.redirect(new URL('/household?tab=ledger&err=bank_failed', origin));

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const adapter = bankAdapter();
  if (!adapter || !code || !state) return fail();
  if ((await consumeState(state)) !== session.tenantId) return fail();

  try {
    const consent = await adapter.complete({ origin, code, tenantId: session.tenantId });
    const account = consent.accounts[0];
    if (!account) return fail();
    // One connection per resident: connecting again replaces the old one.
    const old = await db.orm.public.BankConnection.where({ tenantId: session.tenantId }).all();
    for (const o of old) await db.orm.public.BankConnection.where({ id: o.id }).delete();
    await db.orm.public.BankConnection.create({
      tenantId: session.tenantId,
      provider: adapter.name,
      sessionRef: consent.sessionRef,
      accountRef: account.ref,
      accountLabel: account.label,
      consentExpiresAt: consent.validUntil,
    });
    return NextResponse.redirect(new URL('/household?tab=ledger&connected=1', origin));
  } catch (error) {
    console.error('Bank callback failed:', error);
    return fail();
  }
}
