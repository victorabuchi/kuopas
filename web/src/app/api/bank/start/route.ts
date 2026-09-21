import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '../../../../lib/session';
import { getOrigin } from '../../../../lib/google-oauth';
import { bankAdapter } from '../../../../lib/openbanking';
import { issueState } from '../../../../lib/openbanking/state';

// Sends the signed-in resident to their bank to approve read-only access.
export async function GET(request: NextRequest) {
  const origin = getOrigin(request);
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL('/login', origin));

  const adapter = bankAdapter();
  if (!adapter) return NextResponse.redirect(new URL('/household?tab=ledger&err=bank_off', origin));
  try {
    const state = await issueState(session.tenantId);
    const url = await adapter.start({
      origin,
      state,
      bank: request.nextUrl.searchParams.get('bank'),
      redirectUrl: `${origin}/api/bank/callback`,
    });
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('Bank connect failed:', error);
    return NextResponse.redirect(new URL('/household?tab=ledger&err=bank_failed', origin));
  }
}
