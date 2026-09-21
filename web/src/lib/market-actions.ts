'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '../prisma/db';
import { getSession } from './session';
import { requireStaffAccess } from './portal-access';
import { moveTenantToUnit } from './relocate';
import { isVerified } from './verification';

async function requireVerifiedTenant() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!(await isVerified(session.tenantId))) redirect('/lease?tab=verify');
  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  if (!tenant) redirect('/login');
  return tenant;
}

function euroToCents(value: string): number | null {
  if (!value.trim()) return null;
  const cents = Math.round(Number(value.replace(',', '.')) * 100);
  return Number.isFinite(cents) && cents >= 0 ? cents : null;
}

export async function createListingAction(formData: FormData) {
  const tenant = await requireVerifiedTenant();
  const kind = String(formData.get('kind') ?? '');
  if (kind !== 'sublet' && kind !== 'swap') throw new Error('Choose sublet or swap');

  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  if (!title || !description) throw new Error('A title and a description are required');

  const from = String(formData.get('availableFrom') ?? '').trim();
  const to = String(formData.get('availableTo') ?? '').trim();
  if (kind === 'sublet' && (!from || !to || new Date(to) < new Date(from))) throw new Error('Sublets need valid start and end dates');

  await db.orm.public.Listing.create({
    kind,
    sellerId: tenant.id,
    unitId: tenant.unitId!,
    title,
    description,
    priceCents: kind === 'sublet' ? euroToCents(String(formData.get('price') ?? '')) : null,
    availableFrom: from ? new Date(from).toISOString() : null,
    availableTo: to ? new Date(to).toISOString() : null,
    wanted: kind === 'swap' ? String(formData.get('wanted') ?? '').trim() || null : null,
  });
  revalidatePath('/marketplace');
  redirect('/marketplace?tab=mine');
}

export async function requestListingAction(formData: FormData) {
  const tenant = await requireVerifiedTenant();
  const listingId = String(formData.get('listingId') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  if (!message) throw new Error('Write a short message');

  const listing = await db.orm.public.Listing.where({ id: listingId }).first();
  if (!listing || listing.status !== 'open' || listing.sellerId === tenant.id) throw new Error('This listing is not available');
  if (listing.unitId === tenant.unitId) throw new Error('You already live in this apartment');

  const existing = await db.orm.public.ListingRequest.where({ listingId, requesterId: tenant.id }).first();
  if (!existing) await db.orm.public.ListingRequest.create({ listingId, requesterId: tenant.id, message });
  revalidatePath('/marketplace');
  redirect('/marketplace?tab=requests');
}

export async function respondRequestAction(formData: FormData) {
  const tenant = await requireVerifiedTenant();
  const request = await db.orm.public.ListingRequest.where({ id: String(formData.get('requestId') ?? '') }).first();
  if (!request) return;
  const listing = await db.orm.public.Listing.where({ id: request.listingId }).first();
  if (!listing || listing.sellerId !== tenant.id || listing.status !== 'open') return;

  if (formData.get('accept') === '1') {
    await db.orm.public.ListingRequest.where({ id: request.id }).update({ status: 'accepted' });
    await db.orm.public.Listing.where({ id: listing.id }).update({ status: 'pending_approval', acceptedRequestId: request.id });
    revalidatePath('/staff/market');
  } else {
    await db.orm.public.ListingRequest.where({ id: request.id }).update({ status: 'declined' });
  }
  revalidatePath('/marketplace');
}

export async function closeListingAction(formData: FormData) {
  const tenant = await requireVerifiedTenant();
  const listing = await db.orm.public.Listing.where({ id: String(formData.get('listingId') ?? '') }).first();
  if (!listing || listing.sellerId !== tenant.id || listing.status === 'completed') return;
  await db.orm.public.Listing.where({ id: listing.id }).update({ status: 'closed' });
  revalidatePath('/marketplace');
  revalidatePath('/staff/market');
}

export async function withdrawRequestAction(formData: FormData) {
  const tenant = await requireVerifiedTenant();
  const request = await db.orm.public.ListingRequest.where({ id: String(formData.get('requestId') ?? '') }).first();
  if (!request || request.requesterId !== tenant.id || request.status !== 'pending') return;
  await db.orm.public.ListingRequest.where({ id: request.id }).update({ status: 'withdrawn' });
  revalidatePath('/marketplace');
}

export async function decideDealAction(formData: FormData) {
  const access = await requireStaffAccess();
  const listing = await db.orm.public.Listing.where({ id: String(formData.get('listingId') ?? '') }).first();
  if (!listing || listing.status !== 'pending_approval' || !listing.acceptedRequestId) return;
  const request = await db.orm.public.ListingRequest.where({ id: listing.acceptedRequestId }).first();
  if (!request) return;

  if (formData.get('approve') !== '1') {
    await db.orm.public.ListingRequest.where({ id: request.id }).update({ status: 'declined' });
    await db.orm.public.Listing.where({ id: listing.id }).update({ status: 'open', acceptedRequestId: null });
  } else if (listing.kind === 'sublet') {
    await db.orm.public.Sublease.create({
      listingId: listing.id,
      subtenantId: request.requesterId,
      startDate: listing.availableFrom ?? new Date().toISOString(),
      endDate: listing.availableTo ?? new Date().toISOString(),
      approvedById: access.staffId,
    });
    await db.orm.public.Listing.where({ id: listing.id }).update({ status: 'completed' });
  } else {
    const seller = await db.orm.public.Tenant.where({ id: listing.sellerId }).first();
    const other = await db.orm.public.Tenant.where({ id: request.requesterId }).first();
    if (!seller?.unitId || !other?.unitId || seller.unitId === other.unitId) return;
    const sellerUnit = seller.unitId;
    const otherUnit = other.unitId;
    await moveTenantToUnit(seller.id, otherUnit);
    await moveTenantToUnit(other.id, sellerUnit);
    await db.orm.public.Listing.where({ id: listing.id }).update({ status: 'completed' });
  }

  revalidatePath('/staff/market');
  revalidatePath('/marketplace');
}

export async function removeListingAction(formData: FormData) {
  await requireStaffAccess();
  await db.orm.public.Listing.where({ id: String(formData.get('listingId') ?? '') }).update({ status: 'closed' });
  revalidatePath('/staff/market');
  revalidatePath('/marketplace');
}
