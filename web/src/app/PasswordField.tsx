'use client';

import { useState } from 'react';
import styles from './auth.module.css';

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function PasswordField({
  label,
  name,
  id,
  autoComplete,
  minLength,
  forgotHref,
  forgotLabel,
  hint,
}: {
  label: string;
  name: string;
  id: string;
  autoComplete: string;
  minLength?: number;
  forgotHref?: string;
  forgotLabel?: string;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={styles.field}>
      <div className={styles.fieldTopRow}>
        <label htmlFor={id}>{label}</label>
        {forgotHref && forgotLabel && (
          <a href={forgotHref} className={styles.forgotLink}>
            {forgotLabel}
          </a>
        )}
      </div>
      <div className={styles.fieldInputWrap}>
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          minLength={minLength}
          required
        />
        <button type="button" className={styles.eyeBtn} onClick={() => setVisible((v) => !v)} aria-label={visible ? 'Hide password' : 'Show password'}>
          <EyeIcon open={visible} />
        </button>
      </div>
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}
