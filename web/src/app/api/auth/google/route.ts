import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { MOBILE_REDIRECT, buildAuthUrl, getOrigin, googleConfigured, setStateCookie } from '../../../../lib/google-oauth';

export async function GET(request: NextRequest) {
  const origin = getOrigin(request);
  const requested = request.nextUrl.searchParams.get('intent');
  const intent = requested === 'staff' || requested === 'mobile' ? requested : 'resident';

  if (!googleConfigured()) {
    if (intent === 'mobile') {
      return NextResponse.redirect(`${MOBILE_REDIRECT}?error=${encodeURIComponent('Google sign-in is not set up yet.')}`);
    }
    const path = intent === 'staff' ? '/staff/login' : '/login';
    return NextResponse.redirect(new URL(`${path}?error=${encodeURIComponent('Google sign-in is not set up yet.')}`, origin));
  }

  const state = randomBytes(16).toString('base64url');
  await setStateCookie(state, intent);
  return NextResponse.redirect(buildAuthUrl(origin, state));
}
