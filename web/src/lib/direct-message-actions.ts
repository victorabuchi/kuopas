'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '../prisma/db';
import { getSession } from './session';
import { getOrCreateConversation } from './direct-messages';

export async function startConversationAction(formData: FormData) {
  const otherTenantId = String(formData.get('otherTenantId') ?? '');

  const session = await getSession();
  if (!session) redirect('/login');
  if (!otherTenantId || otherTenantId === session.tenantId) redirect('/messages');

  const conversation = await getOrCreateConversation(session.tenantId, otherTenantId);
  redirect(`/messages/${conversation.id}`);
}

export async function sendDirectMessageAction(formData: FormData) {
  const conversationId = String(formData.get('conversationId') ?? '');
  const content = String(formData.get('content') ?? '').trim();

  if (!conversationId || !content) throw new Error('Message content is required');

  const session = await getSession();
  if (!session) redirect('/login');

  const conversation = await db.orm.public.DirectConversation.where({ id: conversationId }).first();
  if (!conversation) throw new Error('Conversation not found');
  const isMember = conversation.memberAId === session.tenantId || conversation.memberBId === session.tenantId;
  if (!isMember) throw new Error('Not a participant in this conversation');

  await db.orm.public.DirectMessage.create({ conversationId, senderId: session.tenantId, content });

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath('/messages');
}
