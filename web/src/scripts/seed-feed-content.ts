import { db } from '../prisma/db';

// Placeholder feed content so the Announcements, Promotions, Discounts and
// Events tabs are not empty. Everything here is written from scratch, names no
// real businesses, and is stored with an empty sourceUrl so it can be found
// and removed later:  DELETE FROM news_post WHERE "sourceUrl" = '';
// Replace it with real Kuopas posts and partner deals as they exist.

type Entry = [title: string, summary: string];

const updates: Entry[] = [
  ['Laundry room service visit', 'A technician will service the washing machines during the day. Machines may be out of use for a few hours, so plan your wash around it.'],
  ['Sauna schedule for the autumn', 'The autumn sauna slots are now open for booking in the app. Book early for the popular evening times.'],
  ['Stairwell cleaning this week', 'Cleaning staff will wash the stairwells and entrance mats this week. Please keep bikes and bags out of the stairs.'],
  ['Waste sorting reminder', 'Please sort bio, paper, cardboard, glass, metal and mixed waste into the right bins. Wrongly sorted bins cost everyone extra.'],
  ['Planned water shut-off', 'Water will be shut off briefly for pipe work. Fill a bottle beforehand and expect the taps to sputter when the water returns.'],
  ['Elevator inspection', 'The elevator will be inspected and may stop for short periods during the day. Stairs are open and well lit.'],
  ['Winter parking rules', 'From the first snow, cars must be moved on plowing days so the yard can be cleared. Watch the notices at the parking area.'],
  ['Heating season has started', 'Radiators are being switched on across the buildings. If yours stays cold after a day, report it as a fault in the app.'],
  ['Fire safety reminder', 'Keep escape routes and stairwells clear, and never prop fire doors open. Test your smoke alarm monthly.'],
  ['Key pickup hours', 'New residents can pick up their keys during the service desk hours. Bring a photo ID and your rental agreement.'],
  ['Internet outage fixed', 'The building network problem reported this week has been fixed. Thanks for your patience, and tell us if it comes back.'],
  ['Bike storage clean-up', 'Unmarked and abandoned bikes will be tagged and later removed from the bike rooms. Put your name on yours to keep it.'],
  ['Courtyard maintenance', 'The courtyard will be tidied and the benches repaired. Some areas may be fenced off for a few days.'],
  ['Quiet hours reminder', 'Quiet hours run from late evening until morning. A short word with your neighbours solves most noise problems.'],
  ['Mailbox labels', 'Please make sure your name is on your mailbox so post reaches you. Labels can be picked up from the service desk.'],
  ['Move-out checklist', 'Moving out soon? Clean the apartment, return all keys, and book a final inspection through customer service.'],
  ['Rent payment reminder', 'A friendly reminder that rent is due on the usual date each month. Late payments may cause extra fees.'],
  ['Outdoor lighting upgrade', 'Yard and entrance lights are being replaced with brighter, more efficient ones. Work happens mostly in daytime.'],
  ['Window cleaning', 'Windows on the outside of the buildings will be washed. Please keep balcony doors closed while the crew works.'],
  ['Recycling point moved', 'The recycling point has moved a few meters to make room for the new bike shelter. Signs show the new spot.'],
  ['Emergency contact card', 'Save the maintenance emergency number to your phone now. It is for urgent issues like leaks and lockouts at any hour.'],
  ['Balcony safety', 'Do not store heavy items on balconies or throw anything over the railing. Grills are not allowed on balconies.'],
  ['Survey: how is your building?', 'A short resident survey is open until the end of the month. Your answers help decide what gets fixed first.'],
  ['Holiday service hours', 'The service desk keeps shorter hours over the holidays. Urgent maintenance stays available around the clock.'],
];

const promotions: Entry[] = [
  ['Welcome week for new residents', 'New residents get a welcome pack tip sheet covering laundry, sauna, parking and the best spots to study nearby.'],
  ['Refer a friend to Kuopas', 'Know someone looking for student housing? Point them to the application page and mention your building.'],
  ['Book a sauna night with your floor', 'Round up your floor and book a shared sauna slot. Bring snacks and make it a monthly habit.'],
  ['Apartment swap board', 'Want a different floor or building? Post a swap request on the noticeboard and find someone who wants the reverse.'],
  ['Green living challenge', 'Sort waste right, save water and cut electricity for a month. The building with the best habits gets a shout-out.'],
  ['Bike tune-up tips', 'Spring and autumn are the best times to check brakes and lights. Share your own repair tips on the noticeboard.'],
  ['Cook together Sundays', 'Share a big pot with neighbours once a week. A simple rotation means you cook once and eat many times.'],
  ['Study group finder', 'Looking for people to study with? Post the course and time on the noticeboard and meet in a common room.'],
  ['Photo of the month', 'Share a photo of your building, view or courtyard. Favourites can appear in the app feed.'],
  ['Secondhand furniture corner', 'Give furniture a second life. Post what you have or need on the noticeboard before anything goes to waste.'],
  ['Neighbour welcome notes', 'Leave a friendly note for new neighbours on your floor. It takes a minute and makes moving in easier.'],
  ['Plant swap', 'Cuttings and spare plants welcome. Trade with neighbours and brighten up your window sills.'],
  ['Board game evening', 'Bring a game and meet neighbours in the common room. Beginners and long-time players both welcome.'],
  ['Kitchen hacks from residents', 'Residents share their cheapest, quickest student meals. Add your favourite on the noticeboard.'],
  ['Digital mailbox tip', 'Turn on notifications in the app so you never miss a notice from Kuopas or a message from a neighbour.'],
  ['Report a fault, get it fixed', 'Found a leaking tap or a broken lamp? Send a photo through the complaints tab and follow the status.'],
  ['Laundry booking made easy', 'Book your machine in the app and skip the walk down to check. Cancel a slot if plans change.'],
  ['Parking spot for the term', 'Need a parking place for the term? Check availability in the app and reserve one for yourself.'],
  ['Cleaner stairwells together', 'Small habits keep shared spaces pleasant. Take shoes off in your own door and keep the stairs clear.'],
  ['Community noticeboard is live', 'Post lost and found, free items and questions to the whole building, in Finnish or English.'],
  ['Choose your language', 'Switch the app between Finnish and English any time in the settings. Announcements follow your choice.'],
  ['Meet your floor', 'Introduce yourself in your floor chat. It is the fastest way to find people for a lift, a tool or a coffee.'],
  ['Tell us what you want to see', 'Have an idea for the app or your building? Message Kuopas directly from the messages page.'],
  ['Move-in checklist reminder', 'Work through the move-in basics in your first week: keys, internet, waste sorting, laundry and mailbox.'],
];

const discounts: Entry[] = [
  ['Student discount ideas: local cafes', 'Show your student card at nearby cafes that offer a lower price on coffee and a pastry. Ask at the counter.'],
  ['Public transport for students', 'Students can get reduced fares on local buses with a valid student status. Check the transport operator for the current price.'],
  ['Discounted gym memberships', 'Many student sports services offer cheaper memberships for students. Compare student prices before signing up.'],
  ['Cheaper groceries with student meals', 'Student restaurants serve subsidised lunches on and near campus. It is one of the cheapest hot meals around.'],
  ['Second-hand bikes for less', 'Buy a used bike from a resident or a local repair shop instead of new. A tune-up costs far less than a new frame.'],
  ['Laundry off-peak slots', 'Daytime and late slots are usually easier to book. Choose a quiet time and never wait for a free machine.'],
  ['Save on electricity', 'Shorter showers, LED bulbs and switching off standby devices can trim your bill. Every bit counts across a building.'],
  ['Library card benefits', 'A free library card gives you books, films and quiet study space. Ask the library about student services.'],
  ['Discounted museum entry', 'Museums often give students reduced tickets. Bring your student card and ask about student prices.'],
  ['Cheap and cheerful cooking', 'Buying in bulk and cooking in batches saves money each week. Share staples with flatmates.'],
  ['Student software deals', 'Many software makers offer free or cheaper plans for students. Check with your school before paying for anything.'],
  ['Cinema student prices', 'Look for student pricing on weekdays at local cinemas. Ask at the box office.'],
  ['Cheaper phone plans', 'Compare mobile plans every year. Student and youth plans can be much cheaper than the standard ones.'],
  ['Thrift shop finds', 'Local second-hand shops are great for winter clothes, dishes and lamps. Prices are low and stock changes weekly.'],
  ['Shared appliances', 'Share a blender, drill or vacuum with neighbours instead of buying your own. Ask on the noticeboard.'],
  ['Free events on campus', 'Student unions and clubs run many free events all term. Look at their calendars for talks, sports and social nights.'],
  ['Health services for students', 'Student health services are cheaper than private clinics. Check what your student card covers.'],
  ['Cheap flights and trains', 'Book travel early and use student and youth fares where offered. Compare a few options before paying.'],
  ['Meal prep for the week', 'One hour of cooking on Sunday saves money and time. Freeze portions for busy weeks.'],
  ['Reusable is cheaper', 'A refillable bottle and a cloth bag pay for themselves within weeks. Small savings add up.'],
  ['Book a sauna, skip the spa', 'Your building sauna is a cheap way to relax. Book a slot in the app and split the evening with friends.'],
  ['Compare before you buy', 'Check a few shops or second-hand listings before buying electronics. Refurbished can be nearly as good for much less.'],
  ['Student lockers and storage', 'Need extra storage for a term break? Ask customer service what is available in your building.'],
  ['Learn a language for free', 'Many libraries and community groups run free language cafes. A good way to meet people and save on courses.'],
];

const events: Entry[] = [
  ['Building coffee morning', 'Join neighbours in the common room for coffee and a chat. A relaxed way to meet the people on your floor.'],
  ['Sauna evening for the stairwell', 'A shared sauna evening for your stairwell. Book the slot in the app and bring your own towel.'],
  ['Movie night in the common room', 'A relaxed movie night with snacks. Suggest a film on the noticeboard and vote for your favourite.'],
  ['Bike repair workshop', 'Bring your bike and learn simple repairs like fixing a flat and adjusting brakes. Tools are shared.'],
  ['Autumn yard clean-up', 'Help tidy the yard before winter. Gloves and bags are provided, and there is tea afterwards.'],
  ['Language cafe', 'Practise Finnish, English or any language you like. Everyone is welcome, whatever the level.'],
  ['Board game night', 'Bring a favourite game or learn a new one. Casual, friendly and open to all residents.'],
  ['International dinner', 'Everyone brings a dish from home and we eat together. A great way to taste new food and meet neighbours.'],
  ['Study evening with snacks', 'Quiet study hours in the common room with tea and snacks. Good company for exam season.'],
  ['Winter walk', 'A short group walk to enjoy the season and the scenery. Warm clothes and good shoes recommended.'],
  ['Pancake Sunday', 'Pancakes for the whole building. Bring a topping to share.'],
  ['Flatmate meet-up', 'Meet other people living in shared apartments. Swap tips on cleaning rotas and shared shopping.'],
  ['Christmas gathering', 'A cosy get-together with warm drinks and music. Bring a small treat if you like.'],
  ['Spring cleaning day', 'A building-wide day to clear out storage rooms and share leftovers. Free items go to the noticeboard.'],
  ['Photography walk', 'Explore the neighbourhood with a camera or your phone. Share your best shots afterwards.'],
  ['Fitness in the courtyard', 'A relaxed group workout in the courtyard. All levels welcome and no equipment needed.'],
  ['Craft afternoon', 'Bring a project or start a new one. Knitting, drawing or fixing clothes, all welcome.'],
  ['Resident meeting', 'A chance to ask questions and share ideas about your building. Kuopas staff will be listening.'],
  ['Music jam', 'Bring an instrument or just come and listen. A friendly, informal evening for anyone.'],
  ['Cooking class with neighbours', 'Learn a few cheap, tasty recipes from fellow residents. Ingredients are shared.'],
  ['Quiz night', 'Teams of any size compete in a fun quiz. Prizes are small and the laughs are big.'],
  ['Summer barbecue', 'A grill evening in the yard when the weather allows. Bring food and a friend.'],
  ['Book swap', 'Bring a book you have read and take one you want to. A small library for the building.'],
  ['New residents welcome evening', 'A relaxed evening for people who have just moved in. Meet neighbours and ask anything about the building.'],
];

const sets = [
  { category: 'updates' as const, entries: updates, start: '2026-09-15' },
  { category: 'promotions' as const, entries: promotions, start: '2026-09-14' },
  { category: 'discounts' as const, entries: discounts, start: '2026-09-13' },
  { category: 'events' as const, entries: events, start: '2026-09-12' },
];

let created = 0;
for (const set of sets) {
  const base = new Date(`${set.start}T09:00:00Z`).getTime();
  for (let i = 0; i < set.entries.length; i++) {
    const [title, summary] = set.entries[i]!;
    const existing = await db.orm.public.NewsPost.where({ title, category: set.category }).first();
    if (existing) continue;
    await db.orm.public.NewsPost.create({
      title,
      summary,
      sourceUrl: '',
      category: set.category,
      publishedAt: new Date(base - i * 3 * 24 * 60 * 60 * 1000).toISOString(),
    });
    created++;
  }
}

console.log(`Created ${created} placeholder posts (skipping any already present).`);
await db.close();
