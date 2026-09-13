import { db } from '../prisma/db';

// Titles, dates, and source URLs are the real facts from kuopas.fi/en/news.
// Summaries below are written from scratch after reading each article -
// they are not quotes or close paraphrases of Kuopas' own text.
const posts = [
  {
    title: 'Summer Housing Search 2026 - Housing Availability and Applying Tips',
    summary:
      'Studio and family apartments for summer 2026 are already fully booked. Kuopas suggests applying broadly across apartment types and being open to a shared-apartment room for the best chance of getting a place.',
    sourceUrl: 'https://www.kuopas.fi/en/summer-housing-search-2026/',
    category: 'news' as const,
    publishedAt: '2026-06-23T00:00:00Z',
  },
  {
    title: 'Find a roommate with KampsisFinder',
    summary:
      'Tenants with a spare room in their shared apartment can use a free app to find and get to know potential roommates before they formally apply to move in.',
    sourceUrl: 'https://www.kuopas.fi/en/find-a-roommate-with-kamppisfinder/',
    category: 'news' as const,
    publishedAt: '2026-06-12T00:00:00Z',
  },
  {
    title: 'Exceptional summer opening hours',
    summary:
      "Kuopas' office runs shorter hours over summer and is closed on Mondays and Tuesdays. Email or the secure messaging system will get a faster response than calling during this period.",
    sourceUrl: 'https://www.kuopas.fi/en/exceptional-summer-opening-hours/',
    category: 'news' as const,
    publishedAt: '2026-05-04T00:00:00Z',
  },
  {
    title: 'Furnished apartment for the summer?',
    summary:
      'Move-in-ready furnished apartments in Rauhalahti are available for summer, with shared rooms from roughly 229 to 262 euros a month, no long lease or furniture purchase required.',
    sourceUrl: 'https://www.kuopas.fi/en/furnished-summer-apartment/',
    category: 'news' as const,
    publishedAt: '2026-02-17T00:00:00Z',
  },
  {
    title: 'Kampus Ankkuri applications have opened',
    summary:
      'Applications are open for Kampus Ankkuri, a new energy-efficient building with 137 units opening in February 2026, with rents starting around 364 euros and shared saunas and kitchens.',
    sourceUrl: 'https://www.kuopas.fi/en/kampus-ankkuri-applications-have-opened/',
    category: 'news' as const,
    publishedAt: '2025-12-15T00:00:00Z',
  },
  {
    title: 'Kuopas will not increase rents 2026',
    summary: 'Kuopas is holding rents steady for 2026 - no rent increase, and no change to existing payment details.',
    sourceUrl: 'https://www.kuopas.fi/en/kuopas-will-not-increase-rents-2026/',
    category: 'news' as const,
    publishedAt: '2025-11-27T00:00:00Z',
  },
  {
    title: 'Kuopas 50 years photo campaign',
    summary:
      "To mark its 50th anniversary, Kuopas is running a photo contest: tenants can submit pictures of everyday life in Kuopio for a chance to win gift cards and have their photo displayed at Kuopas' office.",
    sourceUrl: 'https://www.kuopas.fi/en/50years-photo-campaign/',
    category: 'news' as const,
    publishedAt: '2025-09-25T00:00:00Z',
  },
  {
    title: 'Kuopas 50 years!',
    summary:
      'Kuopas is celebrating 50 years in 2025 with social media contests, giveaways, and surprises throughout the year for its student tenants.',
    sourceUrl: 'https://www.kuopas.fi/en/kuopas-50-years/',
    category: 'news' as const,
    publishedAt: '2025-02-04T00:00:00Z',
  },
  {
    title: 'Savilahti construction progresses as planned - see the latest updates',
    summary:
      'Kuopas is building 265 new apartments in the Savilahti campus area, available from 2025, with rents expected around 370 to 570 euros a month.',
    sourceUrl: 'https://www.kuopas.fi/en/savilahti-construction/',
    category: 'news' as const,
    publishedAt: '2025-01-31T00:00:00Z',
  },
  {
    title: 'Rent a shared electric car',
    summary:
      'Kuopas residents get a discounted rate on a shared electric car through 24Rent, with one car based at Pyorakatu 7 and 30% off standard rental prices.',
    sourceUrl: 'https://www.kuopas.fi/en/rent-shared-electric-car/',
    category: 'news' as const,
    publishedAt: '2024-10-25T00:00:00Z',
  },
];

for (const post of posts) {
  const existing = await db.orm.public.NewsPost.where({ sourceUrl: post.sourceUrl }).first();
  if (existing) continue;
  await db.orm.public.NewsPost.create(post);
}

console.log(`Seeded ${posts.length} news posts (skipping any already present).`);
await db.close();
