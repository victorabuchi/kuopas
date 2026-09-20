import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm']);
const DOC_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const BUCKET = process.env['SUPABASE_STORAGE_BUCKET'] ?? 'uploads';
const PRIVATE_BUCKET = process.env['SUPABASE_PRIVATE_BUCKET'] ?? 'private-docs';
const LOCAL_PRIVATE_DIR = path.join(process.cwd(), '.private-uploads');

async function uploadToSupabase(
  objectPath: string,
  buffer: Buffer,
  contentType: string,
  bucket = BUCKET,
  isPublic = true,
): Promise<string> {
  const baseUrl = process.env['SUPABASE_URL']!.replace(/\/$/, '');
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
  const headers = { Authorization: `Bearer ${key}`, apikey: key };

  async function put(): Promise<Response> {
    return fetch(`${baseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
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
      body: JSON.stringify({ id: bucket, name: bucket, public: isPublic }),
    });
    if (created.ok) res = await put();
  }
  if (!res.ok) throw new Error(`Photo upload failed (${res.status}).`);

  return `${baseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
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

function supabaseConfigured(): boolean {
  return Boolean(process.env['SUPABASE_URL'] && process.env['SUPABASE_SERVICE_ROLE_KEY']);
}

// Photos or short videos (maintenance reports, unit tours). Returns the public
// URL, or null when no file was provided.
export async function saveMediaUpload(
  file: File | null,
  subdir: string,
): Promise<{ url: string; kind: 'photo' | 'video' } | null> {
  if (!file || file.size === 0) return null;
  const isVideo = ALLOWED_VIDEO_TYPES.has(file.type);
  if (!isVideo && !ALLOWED_TYPES.has(file.type)) throw new Error('Unsupported file type.');
  if (isVideo && file.size > MAX_VIDEO_BYTES) throw new Error('Video is too large (max 50MB).');
  if (!isVideo) {
    const url = await savePhotoUpload(file, subdir);
    return url ? { url, kind: 'photo' } : null;
  }

  const ext = file.type === 'video/quicktime' ? 'mov' : file.type.split('/')[1];
  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (supabaseConfigured()) {
    return { url: await uploadToSupabase(`${subdir}/${filename}`, buffer, file.type), kind: 'video' };
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Storage is not configured (set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).');
  }
  const dir = path.join(process.cwd(), 'public', 'uploads', subdir);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return { url: `/uploads/${subdir}/${filename}`, kind: 'video' };
}

// Sensitive documents (ID, enrolment proof). Stored in a private bucket, never
// given a public URL. Returns the storage path to keep on the row.
export async function savePrivateDocument(file: File | null, subdir: string): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_BYTES) throw new Error('File is too large (max 8MB).');
  if (!DOC_TYPES.has(file.type)) throw new Error('Upload a JPG, PNG, WebP or PDF.');

  const ext = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
  const objectPath = `${subdir}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (supabaseConfigured()) {
    await uploadToSupabase(objectPath, buffer, file.type, PRIVATE_BUCKET, false);
    return objectPath;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Storage is not configured (set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).');
  }
  const target = path.join(LOCAL_PRIVATE_DIR, objectPath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);
  return objectPath;
}

// Short-lived link for staff to view a private document.
export async function getPrivateDocumentUrl(objectPath: string): Promise<string | null> {
  if (supabaseConfigured()) {
    const baseUrl = process.env['SUPABASE_URL']!.replace(/\/$/, '');
    const key = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
    const res = await fetch(`${baseUrl}/storage/v1/object/sign/${PRIVATE_BUCKET}/${objectPath}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: 300 }),
    });
    if (!res.ok) return null;
    const { signedURL } = (await res.json()) as { signedURL?: string };
    return signedURL ? `${baseUrl}/storage/v1${signedURL}` : null;
  }
  return `/api/staff/private-file?path=${encodeURIComponent(objectPath)}`;
}

export async function deletePrivateDocument(objectPath: string | null): Promise<void> {
  if (!objectPath) return;
  if (supabaseConfigured()) {
    const baseUrl = process.env['SUPABASE_URL']!.replace(/\/$/, '');
    const key = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
    await fetch(`${baseUrl}/storage/v1/object/${PRIVATE_BUCKET}/${objectPath}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${key}`, apikey: key },
    }).catch(() => undefined);
    return;
  }
  const { unlink } = await import('node:fs/promises');
  await unlink(path.join(LOCAL_PRIVATE_DIR, objectPath)).catch(() => undefined);
}

export function localPrivateFilePath(objectPath: string): string | null {
  const resolved = path.resolve(LOCAL_PRIVATE_DIR, objectPath);
  return resolved.startsWith(LOCAL_PRIVATE_DIR + path.sep) ? resolved : null;
}
