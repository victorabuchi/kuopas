import { db } from '../prisma/db';

// Reads a request body that is either JSON or multipart (multipart is how the
// mobile app sends an optional photo alongside the text fields).
export async function readFields(
  request: Request,
): Promise<{ fields: Record<string, string>; photo: File | null; files: Record<string, File> }> {
  const type = request.headers.get('content-type') ?? '';
  const fields: Record<string, string> = {};
  const files: Record<string, File> = {};
  let photo: File | null = null;

  if (type.startsWith('multipart/form-data')) {
    const form = await request.formData().catch(() => null);
    if (form) {
      for (const [key, value] of form.entries()) {
        if (typeof value === 'string') fields[key] = value;
        else {
          files[key] = value;
          if (key === 'photo') photo = value;
        }
      }
    }
  } else {
    const body = await request.json().catch(() => null);
    if (body && typeof body === 'object') {
      for (const [key, value] of Object.entries(body)) {
        if (value !== null && value !== undefined) fields[key] = String(value);
      }
    }
  }

  return { fields, photo, files };
}

export async function getTenantWithBuilding(tenantId: string) {
  const tenant = await db.orm.public.Tenant.where({ id: tenantId })
    .include('unit', (unit) => unit.include('stairwell', (stairwell) => stairwell.include('building', (b) => b)))
    .first();
  if (!tenant) return null;
  return { tenant, unit: tenant.unit!, stairwell: tenant.unit!.stairwell!, building: tenant.unit!.stairwell!.building! };
}

// The app sends its language so server-built messages match the web copy.
export function requestLocale(request: Request): 'en' | 'fi' {
  return request.headers.get('x-kuopas-locale') === 'fi' ? 'fi' : 'en';
}
