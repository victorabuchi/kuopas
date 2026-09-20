'use client';

import { useState } from 'react';
import styles from '../features.module.css';
import { saveMatchProfileAction } from '../../../lib/matching-actions';

type Question = { key: string; title: string; options: { value: string; label: string }[] };
type Labels = {
  wizardTitle: string;
  wizardLede: string;
  step: string;
  of: string;
  next: string;
  back: string;
  finish: string;
  nonNegotiable: string;
  bioLabel: string;
  bioPlaceholder: string;
  visibleLabel: string;
  finalStep: string;
};

export default function MatchWizard({
  questions,
  initial,
  initialDealbreakers,
  initialBio,
  initialActive,
  labels,
}: {
  questions: Question[];
  initial: Record<string, string>;
  initialDealbreakers: string[];
  initialBio: string;
  initialActive: boolean;
  labels: Labels;
}) {
  const total = questions.length + 1;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(initial);
  const [breakers, setBreakers] = useState<string[]>(initialDealbreakers);

  const isLast = step === total - 1;
  const question = questions[step];
  const canAdvance = isLast || Boolean(question && answers[question.key]);

  return (
    <form action={saveMatchProfileAction} className={`${styles.card} ${styles.form}`}>
      <div>
        <h2 className={styles.cardTitle}>{labels.wizardTitle}</h2>
        <p className={styles.lede}>{labels.wizardLede}</p>
      </div>

      <div style={{ height: 6, borderRadius: 6, background: '#e7e7e7', overflow: 'hidden' }}>
        <div style={{ width: `${((step + 1) / total) * 100}%`, height: '100%', background: '#046a38', transition: 'width 0.25s' }} />
      </div>
      <span className={styles.itemMeta}>
        {labels.step} {step + 1} {labels.of} {total}
      </span>

      {/* Every answer stays in the form so it submits even from the last step. */}
      {questions.map((q) => (
        <input key={q.key} type="hidden" name={q.key} value={answers[q.key] ?? ''} />
      ))}
      {breakers.map((key) => (
        <input key={key} type="hidden" name="dealbreaker" value={key} />
      ))}

      {question && (
        <div className={styles.form}>
          <span className={styles.cardTitle} style={{ fontSize: 17 }}>
            {question.title}
          </span>
          {question.options.map((option) => (
            <label
              key={option.value}
              className={styles.check}
              style={{
                padding: '11px 14px',
                border: `1px solid ${answers[question.key] === option.value ? '#046a38' : '#e7e7e7'}`,
                borderRadius: 10,
                background: answers[question.key] === option.value ? '#f0f7f0' : '#fff',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name={`ui_${question.key}`}
                checked={answers[question.key] === option.value}
                onChange={() => setAnswers((s) => ({ ...s, [question.key]: option.value }))}
              />
              {option.label}
            </label>
          ))}
          <label className={styles.check} style={{ marginTop: 4 }}>
            <input
              type="checkbox"
              checked={breakers.includes(question.key)}
              onChange={(e) => setBreakers((s) => (e.target.checked ? [...s, question.key] : s.filter((k) => k !== question.key)))}
            />
            {labels.nonNegotiable}
          </label>
        </div>
      )}

      {isLast && (
        <div className={styles.form}>
          <span className={styles.cardTitle} style={{ fontSize: 17 }}>
            {labels.finalStep}
          </span>
          <div className={styles.field}>
            <label htmlFor="bio">{labels.bioLabel}</label>
            <textarea id="bio" name="bio" maxLength={300} defaultValue={initialBio} placeholder={labels.bioPlaceholder} />
          </div>
          <label className={styles.check}>
            <input type="checkbox" name="active" defaultChecked={initialActive} />
            {labels.visibleLabel}
          </label>
        </div>
      )}

      <div className={styles.itemActions}>
        {step > 0 && (
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setStep((s) => s - 1)}>
            {labels.back}
          </button>
        )}
        {!isLast && (
          <button type="button" className={styles.btn} disabled={!canAdvance} onClick={() => setStep((s) => s + 1)} style={{ opacity: canAdvance ? 1 : 0.5 }}>
            {labels.next}
          </button>
        )}
        {isLast && (
          <button type="submit" className={styles.btn}>
            {labels.finish}
          </button>
        )}
      </div>
    </form>
  );
}
