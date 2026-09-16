'use client';

import { useState } from 'react';
import styles from './page.module.css';

type Step = { title: string; desc: string };

export default function HowItWorksSection({
  residentsLabel,
  staffLabel,
  residentSteps,
  staffSteps,
}: {
  residentsLabel: string;
  staffLabel: string;
  residentSteps: Step[];
  staffSteps: Step[];
}) {
  const [tab, setTab] = useState<'residents' | 'staff'>('residents');
  const steps = tab === 'residents' ? residentSteps : staffSteps;

  return (
    <>
      <div className={styles.howTabs}>
        <button
          type="button"
          onClick={() => setTab('residents')}
          className={`${styles.howTab} ${tab === 'residents' ? styles.howTabActive : ''}`}
        >
          {residentsLabel}
        </button>
        <button
          type="button"
          onClick={() => setTab('staff')}
          className={`${styles.howTab} ${tab === 'staff' ? styles.howTabActive : ''}`}
        >
          {staffLabel}
        </button>
      </div>

      <div className={styles.howSteps}>
        {steps.map((step, i) => (
          <div key={step.title} className={styles.howStep}>
            <div className={styles.howStepIcon}>{String(i + 1).padStart(2, '0')}</div>
            <div>
              <div className={styles.howStepTitle}>{step.title}</div>
              <div className={styles.howStepDesc}>{step.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
