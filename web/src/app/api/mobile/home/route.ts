import { db } from '../../../../prisma/db';
import { getMobileSession } from '../../../../lib/mobile-auth';

const TAB_VALUES = ['news', 'updates', 'promotions', 'discounts', 'events'] as const;

// Mirrors the NewsPost query in src/app/(app)/home/page.tsx.
export async function GET(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const raw = new URL(request.url).searchParams.get('tab') ?? '';
  const tab = (TAB_VALUES as readonly string[]).includes(raw) ? (raw as (typeof TAB_VALUES)[number]) : 'news';

  const posts = await db.orm.public.NewsPost.where({ category: tab })
    .orderBy((n) => n.publishedAt.desc())
    .limit(60)
    .all();

  return Response.json(
    posts.map((p) => ({
      id: p.id,
      title: p.title,
      summary: p.summary,
      sourceUrl: p.sourceUrl,
      category: p.category,
      publishedAt: p.publishedAt,
    })),
  );
}
