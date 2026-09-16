'use client';

import Link from 'next/link';
import { useState } from 'react';
import styles from './page.module.css';

type Feature = { title: string; desc: string };

function FeatureCard({
  title,
  features,
  dark,
  cta,
  ctaHref,
  iconPath,
}: {
  title: string;
  features: Feature[];
  dark: boolean;
  cta: string;
  ctaHref: string;
  iconPath: string;
}) {
  const [active, setActive] = useState(0);

  return (
    <div className={`${styles.roleCard} ${dark ? styles.roleCardDark : ''}`}>
      <div className={styles.roleCardIcon}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d={iconPath} />
        </svg>
      </div>
      <h3 className={styles.roleCardTitle}>{title}</h3>
      <div className={styles.roleCardList}>
        {features.map((f, i) => {
          const isActive = active === i;
          return (
            <button
              key={f.title}
              type="button"
              onClick={() => setActive(i)}
              className={`${styles.roleFeatureRow} ${isActive ? styles.roleFeatureRowActive : ''}`}
            >
              <div className={styles.roleFeatureTop}>
                <span className={styles.roleFeatureTitle}>{f.title}</span>
                {isActive && (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              {isActive && <p className={styles.roleFeatureDesc}>{f.desc}</p>}
            </button>
          );
        })}
      </div>
      <Link href={ctaHref} className={styles.roleCardCta}>
        {cta}
      </Link>
    </div>
  );
}

export default function BuiltForSection({
  residentsTitle,
  staffTitle,
  residentFeatures,
  staffFeatures,
  registerLabel,
  staffLoginLabel,
}: {
  residentsTitle: string;
  staffTitle: string;
  residentFeatures: Feature[];
  staffFeatures: Feature[];
  registerLabel: string;
  staffLoginLabel: string;
}) {
  return (
    <div className={styles.roleGrid}>
      <FeatureCard
        title={residentsTitle}
        features={residentFeatures}
        dark={false}
        cta={registerLabel}
        ctaHref="/register"
        iconPath="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
      />
      <FeatureCard
        title={staffTitle}
        features={staffFeatures}
        dark
        cta={staffLoginLabel}
        ctaHref="/staff/login"
        iconPath="M4 13v-1a8 8 0 0 1 16 0v1M2.5 13h5v6h-5zM16.5 13h5v6h-5zM20 19v1a3 3 0 0 1-3 3h-3"
      />
    </div>
  );
}
