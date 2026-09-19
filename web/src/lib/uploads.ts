import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);
const BUCKET = process.env['SUPABASE_STORAGE_BUCKET'] ?? 'uploads';

async function uploadToSupabase(objectPath: string, buffer: Buffer, contentType: string): Promise<string> {
  const baseUrl = process.env['SUPABASE_URL']!.replace(/\/$/, '');
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
  const headers = { Authorization: `Bearer ${key}`, apikey: key };

  async function put(): Promise<Response> {
    return fetch(`${baseUrl}/storage/v1/object/${BUCKET}/${objectPath}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': contentType, 'x-upsert': 'false' },
      body: new Uint8Array(buffer),
    });
  }

  let res = await put();
  if (res.status === 404 || res.status === 400) {
    // First upload: the bucket may not exist yet, so create it as public and retry.
    const created = await fetch(`${baseUrl}/storage/v1/bucket`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
    });
    if (created.ok) res = await put();
  }
  if (!res.ok) throw new Error(`Photo upload failed (${res.status}).`);

  return `${baseUrl}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}

// Saves an uploaded photo and returns the public URL to store on the row.
// Uses Supabase Storage when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are
// set; otherwise falls back to public/uploads on disk for local development
// only. Returns null if no file was provided.
export async function savePhotoUpload(file: File | null, subdir: string): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_BYTES) throw new Error('Photo is too large (max 8MB).');
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('Unsupported photo type.');

  const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (process.env['SUPABASE_URL'] && process.env['SUPABASE_SERVICE_ROLE_KEY']) {
    return uploadToSupabase(`${subdir}/${filename}`, buffer, file.type);
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Photo storage is not configured (set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).');
  }

  const dir = path.join(process.cwd(), 'public', 'uploads', subdir);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/${subdir}/${filename}`;
}
