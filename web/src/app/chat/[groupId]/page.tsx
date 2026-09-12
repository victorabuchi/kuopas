import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '../../../prisma/db';
import { sendMessageAction } from '../../actions';

export default async function ChatGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ as?: string }>;
}) {
  const { groupId } = await params;
  const { as } = await searchParams;

  const group = await db.orm.public.ChatGroup.where({ id: groupId }).include(
    'members',
    (members) => members.include('tenant', (t) => t),
  ).first();

  if (!group) notFound();

  const messages = await db.orm.public.Message.where({ chatGroupId: groupId })
    .include('sender', (s) => s)
    .orderBy((m) => m.sentAt.asc())
    .limit(200)
    .all();

  const activeSenderId = as ?? group.members[0]?.tenant!.id ?? '';

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-12">
      <div>
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          &larr; Back
        </Link>
        <h1 className="text-2xl font-semibold">{group.name}</h1>
        <p className="text-zinc-500">{group.members.length} member(s)</p>
      </div>

      <ul className="flex flex-col gap-3">
        {messages.length === 0 && <p className="text-zinc-500">No messages yet.</p>}
        {messages.map((message) => (
          <li key={message.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">{message.sender!.name}</span>
              <span className="text-zinc-400">{new Date(message.sentAt).toLocaleString()}</span>
            </div>
            <p className="mt-1">{message.content}</p>
          </li>
        ))}
      </ul>

      <form action={sendMessageAction} className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <input type="hidden" name="chatGroupId" value={group.id} />
        <select
          name="senderId"
          defaultValue={activeSenderId}
          required
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {group.members.map((m) => (
            <option key={m.tenant!.id} value={m.tenant!.id}>
              {m.tenant!.name}
            </option>
          ))}
        </select>
        <textarea
          name="content"
          placeholder="Write a message..."
          required
          rows={3}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          className="self-start rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
        >
          Send
        </button>
      </form>
    </div>
  );
}
