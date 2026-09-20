import { readFile } from 'node:fs/promises';
import { NextResponse, type NextRequest } from 'next/server';
import { getStaffAccess } from '../../../../lib/portal-access';
import { localPrivateFilePath } from '../../../../lib/uploads';

// Local-development stand-in for Supabase signed URLs: streams a private
// document to signed-in staff only.
export async function GET(request: NextRequest) {
  const access = await getStaffAccess();
  if (!access) return new NextResponse('Not authorized', { status: 401 });

  const target = localPrivateFilePath(request.nextUrl.searchParams.get('path') ?? '');
  if (!target) return new NextResponse('Not found', { status: 404 });

  try {
    const data = await readFile(target);
    const type = target.endsWith('.pdf') ? 'application/pdf' : target.endsWith('.png') ? 'image/png' : 'image/jpeg';
    return new NextResponse(new Uint8Array(data), { headers: { 'Content-Type': type, 'Cache-Control': 'private, no-store' } });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
