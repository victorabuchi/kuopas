import { DIMENSIONS, parseDealbreakers } from '../../../lib/matching';
import type { getLiving } from '../../../lib/living';
import type { db } from '../../../prisma/db';
import MatchWizard from './MatchWizard';

type T = ReturnType<typeof getLiving>['roommates'];
type Mine = Awaited<ReturnType<typeof db.orm.public.MatchProfile.first>>;

export function ProfileTab({ mine, t }: { mine: Mine | null; t: T }) {
  const questions = DIMENSIONS.map((dim) => {
    const q = (t.questions as Record<string, { title: string; options: Record<string, string> }>)[dim.key]!;
    return {
      key: dim.key as string,
      title: q.title,
      options: dim.options.map((value) => ({ value, label: q.options[value] ?? value })),
    };
  });
  const initial: Record<string, string> = mine
    ? Object.fromEntries(DIMENSIONS.map((d) => [d.key, String((mine as unknown as Record<string, string | number>)[d.key])]))
    : {};

  return (
    <MatchWizard
      questions={questions}
      initial={initial}
      initialDealbreakers={mine ? parseDealbreakers(mine.dealbreakers) : []}
      initialBio={mine?.bio ?? ''}
      initialActive={mine?.active ?? true}
      labels={{
        wizardTitle: t.wizardTitle,
        wizardLede: t.wizardLede,
        step: t.step,
        of: t.of,
        next: t.next,
        back: t.back,
        finish: t.finish,
        nonNegotiable: t.nonNegotiable,
        bioLabel: t.bioLabel,
        bioPlaceholder: t.bioPlaceholder,
        visibleLabel: t.visibleLabel,
        finalStep: t.finalStep,
      }}
    />
  );
}
