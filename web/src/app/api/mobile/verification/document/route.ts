import { db } from '../../../../../prisma/db';
import { getMobileSession } from '../../../../../lib/mobile-auth';
import { readFields } from '../../../../../lib/mobile-http';
import { savePrivateDocument } from '../../../../../lib/uploads';

// Mirrors submitDocumentVerificationAction in src/lib/verification-actions.ts.
// The file goes to the private bucket and is reviewed by staff.
export async function POST(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });
  const tenantId = session.tenantId;

  const { fields, files } = await readFields(request);
  const method = fields['method'] ?? '';
  if (method !== 'government_id' && method !== 'enrollment_document') {
    return Response.json({ error: 'method' }, { status: 400 });
  }

  const pending = await db.orm.public.IdentityVerification.where({ tenantId, status: 'pending' }).first();
  if (pending) return new Response(null, { status: 204 });

  const file = files['file'] ?? null;
  if (!file || file.size === 0) return Response.json({ error: 'file' }, { status: 400 });

  let docPath: string | null;
  try {
    docPath = await savePrivateDocument(file, `verification/${tenantId}`);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Upload failed.', { status: 400 });
  }

  await db.orm.public.IdentityVerification.create({
    tenantId,
    method,
    status: 'pending',
    institution: (fields['institution'] ?? '').trim() || null,
    detail: (fields['studentNumber'] ?? '').trim() || null,
    docPath,
  });

  return new Response(null, { status: 204 });
}
