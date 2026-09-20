import { NextResponse, type NextRequest } from 'next/server';
import { db } from '../../../../../prisma/db';
import { createSession } from '../../../../../lib/session';
import { createStaffSession } from '../../../../../lib/staff-session';
import { createMobileToken } from '../../../../../lib/mobile-auth';
import { autoVerifyIfUniversityEmail } from '../../../../../lib/verification';
import {
  MOBILE_REDIRECT,
  exchangeCodeForProfile,
  getOrigin,
  setSignupCookie,
  takeStateCookie,
} from '../../../../../lib/google-oauth';

export async function GET(request: NextRequest) {
  const origin = getOrigin(request);
  const params = request.nextUrl.searchParams;

  const saved = await takeStateCookie();
  const intent = saved?.intent ?? 'resident';
  const loginPath = intent === 'staff' ? '/staff/login' : '/login';

  function fail(message: string) {
    if (intent === 'mobile') {
      return NextResponse.redirect(`${MOBILE_REDIRECT}?error=${encodeURIComponent(message)}`);
    }
    return NextResponse.redirect(new URL(`${loginPath}?error=${encodeURIComponent(message)}`, origin));
  }

  const code = params.get('code');
  if (params.get('error') || !code) return fail('Google sign-in was cancelled.');
  if (!saved || params.get('state') !== saved.state) return fail('Google sign-in expired. Please try again.');

  let profile;
  try {
    profile = await exchangeCodeForProfile(code, origin);
  } catch {
    return fail('Google sign-in failed. Make sure your Google email is verified and try again.');
  }

  const tenant = await db.orm.public.Tenant.where({ email: profile.email }).first();
  const staff = await db.orm.public.Staff.where({ email: profile.email }).first();

  if (intent === 'mobile') {
    // The phone app is for residents only, so there is no sign-up or staff path here.
    if (!tenant) return fail('No Kuopas account uses that Google email. Register in the app first.');
    await autoVerifyIfUniversityEmail(tenant.id, profile.email);
    return NextResponse.redirect(`${MOBILE_REDIRECT}?token=${encodeURIComponent(createMobileToken(tenant.id))}`);
  }

  if (intent === 'staff') {
    if (tenant?.role === 'admin' && tenant.staffId) {
      await createSession(tenant.id);
      return NextResponse.redirect(new URL('/staff', origin));
    }
    if (staff) {
      await createStaffSession(staff.id);
      return NextResponse.redirect(new URL('/staff', origin));
    }
    return fail('No staff account uses that Google email.');
  }

  if (tenant) {
    await createSession(tenant.id);
    await autoVerifyIfUniversityEmail(tenant.id, profile.email);
    return NextResponse.redirect(new URL('/home', origin));
  }
  if (staff) {
    await createStaffSession(staff.id);
    return NextResponse.redirect(new URL('/staff', origin));
  }

  await setSignupCookie(profile);
  return NextResponse.redirect(new URL('/register/google', origin));
}
