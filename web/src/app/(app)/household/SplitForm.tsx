'use client';

import { useMemo, useState } from 'react';
import styles from '../features.module.css';
import { splitCents } from '../../../lib/split';
import { createBillAction } from '../../../lib/household-actions';

type Member = { id: string; name: string };
type Labels = {
  title: string;
  titlePlaceholder: string;
  category: string;
  categories: Record<string, string>;
  total: string;
  paidBy: string;
  dueDate: string;
  splitBetween: string;
  weight: string;
  weightHint: string;
  preview: string;
  saveBill: string;
};

export default function SplitForm({ members, meId, labels }: { members: Member[]; meId: string; labels: Labels }) {
  const [total, setTotal] = useState('');
  const [included, setIncluded] = useState<Record<string, boolean>>(() => Object.fromEntries(members.map((m) => [m.id, true])));
  const [weights, setWeights] = useState<Record<string, string>>(() => Object.fromEntries(members.map((m) => [m.id, '1'])));

  const preview = useMemo(() => {
    const cents = Math.round(Number(total.replace(',', '.')) * 100);
    const chosen = members.filter((m) => included[m.id]);
    if (!Number.isFinite(cents) || cents <= 0 || chosen.length === 0) return null;
    const parts = splitCents(
      cents,
      chosen.map((m) => Math.max(Number(weights[m.id]) || 1, 0.01)),
    );
    return chosen.map((m, i) => ({ id: m.id, name: m.name, cents: parts[i]! }));
  }, [total, included, weights, members]);

  return (
    <form action={createBillAction} className={`${styles.card} ${styles.form}`}>
      <div className={styles.grid2}>
        <div className={styles.field}>
          <label htmlFor="title">{labels.title}</label>
          <input id="title" name="title" required placeholder={labels.titlePlaceholder} />
        </div>
        <div className={styles.field}>
          <label htmlFor="category">{labels.category}</label>
          <select id="category" name="category" defaultValue="wifi">
            {Object.entries(labels.categories).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={styles.grid2}>
        <div className={styles.field}>
          <label htmlFor="total">{labels.total}</label>
          <input id="total" name="total" inputMode="decimal" required value={total} onChange={(e) => setTotal(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor="paidById">{labels.paidBy}</label>
          <select id="paidById" name="paidById" defaultValue={meId}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor="dueDate">{labels.dueDate}</label>
        <input id="dueDate" name="dueDate" type="date" />
      </div>

      <div className={styles.field}>
        <span className={styles.label}>{labels.splitBetween}</span>
        {members.map((m) => (
          <div key={m.id} className={styles.item} style={{ padding: '8px 0' }}>
            <label className={styles.check} style={{ flex: 1 }}>
              <input
                type="checkbox"
                name="participant"
                value={m.id}
                checked={included[m.id] ?? false}
                onChange={(e) => setIncluded((s) => ({ ...s, [m.id]: e.target.checked }))}
              />
              {m.name}
            </label>
            <input
              name={`weight_${m.id}`}
              type="number"
              min="0.1"
              step="0.1"
              value={weights[m.id] ?? '1'}
              aria-label={`${labels.weight} ${m.name}`}
              onChange={(e) => setWeights((s) => ({ ...s, [m.id]: e.target.value }))}
              style={{ width: 70, border: '1px solid #e7e7e7', borderRadius: 8, padding: '6px 8px' }}
            />
          </div>
        ))}
        <span className={styles.itemMeta}>{labels.weightHint}</span>
      </div>

      {preview && (
        <div className={`${styles.notice} ${styles.noticeOk}`}>
          <strong>{labels.preview}</strong>
          {preview.map((p) => (
            <div key={p.id} className={styles.kv} style={{ padding: '4px 0' }}>
              <span>{p.name}</span>
              <span className={styles.kvValue}>{(p.cents / 100).toFixed(2)} EUR</span>
            </div>
          ))}
        </div>
      )}

      <button type="submit" className={styles.btn}>
        {labels.saveBill}
      </button>
    </form>
  );
}
