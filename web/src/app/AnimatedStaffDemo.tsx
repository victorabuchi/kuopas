'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import Image from 'next/image';

/* ---------- shared chrome (same technique as AnimatedTenantDemo) ---------- */

function BrowserChrome({ url }: { url: string }) {
  return (
    <div style={{ background: '#f5f5f3', borderBottom: '1px solid #e0e0dc', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        {['#ff5f57', '#ffbd2e', '#28c940'].map((c) => (
          <div key={c} style={{ width: '11px', height: '11px', borderRadius: '50%', background: c }} />
        ))}
      </div>
      <div style={{ flex: 1, background: '#ebebea', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', color: '#888', textAlign: 'center' }}>
        {url}
      </div>
    </div>
  );
}

const GREEN = '#046a38';
const GREEN_SOFT = 'color-mix(in srgb, #046a38 8%, white)';

const STAFF_NAV = ['Dashboard', 'Complaints inbox', 'Reports', 'Saved replies'];

function StaffTopBar({ active }: { active: string }) {
  return (
    <div style={{ flexShrink: 0, height: '52px', display: 'flex', alignItems: 'center', gap: '22px', padding: '0 20px', background: '#fff', borderBottom: '1px solid #eee' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Image src="/Kuopas-logo.png" alt="Kuopas" width={70} height={28} style={{ height: '20px', width: 'auto' }} />
        <span style={{ fontWeight: 800, fontSize: '13px', color: GREEN }}>staff</span>
      </div>
      <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
        {STAFF_NAV.map((label) => (
          <span key={label} style={{ fontSize: '13px', fontWeight: 600, color: label === active ? GREEN : '#999' }}>
            {label}
          </span>
        ))}
      </div>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: GREEN_SOFT, color: GREEN, fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        KS
      </div>
    </div>
  );
}

function CursorArrow({ pos }: { pos: { top: number; left: number; opacity: number } }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: pos.top,
        left: pos.left,
        opacity: pos.opacity,
        transition: 'top 0.38s cubic-bezier(0.25,0.46,0.45,0.94), left 0.38s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.25s',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      <svg width="24" height="29" viewBox="0 0 18 22">
        <path d="M1 1L1 17L5 13L8 20L10.5 19L7.5 12L13 12Z" fill="#1a1a1a" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function BlinkCaret({ color }: { color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '2px',
        height: '15px',
        background: color,
        marginLeft: '1px',
        verticalAlign: 'text-bottom',
        animation: 'kuopasStaffBlinkCaret 1s step-end infinite',
      }}
    />
  );
}

/* ---------- Chapter 1: send an email ---------- */

const EMAIL_TO = 'aino.virtanen@example.com';
const EMAIL_SUBJECT = 'Your maintenance visit';
const EMAIL_BODY = "Hi Aino, we'll visit your apartment Thursday 10:00 to fix the tap.";
const EMAIL_DELAYS = [500, 700, 700, 1100, 900, 500, 2200];

function EmailChapter({ step }: { step: number }) {
  const toTyped = step >= 1;
  const subjectTyped = step >= 2;
  const bodyTyping = step === 3;
  const bodyTyped = step >= 4;
  const sending = step === 5;
  const sent = step >= 5;

  return (
    <div style={{ padding: '22px 26px', flex: 1 }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
        {sent ? 'Email sent' : 'New email'}
      </div>
      <div style={{ border: '1px solid #eee', borderRadius: '10px', overflow: 'hidden' }}>
        <Field label="To" value={toTyped ? EMAIL_TO : ''} />
        <Field label="Subject" value={subjectTyped ? EMAIL_SUBJECT : ''} />
        <div style={{ padding: '14px 16px', minHeight: '90px', fontSize: '14px', lineHeight: 1.5, color: '#333' }}>
          {bodyTyping ? EMAIL_BODY.slice(0, 40) : bodyTyped ? EMAIL_BODY : ''}
          {bodyTyping && <BlinkCaret color={GREEN} />}
        </div>
      </div>
      <div
        style={{
          marginTop: '16px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: GREEN,
          borderRadius: '9px',
          padding: '11px 22px',
          color: '#fff',
          fontSize: '13.5px',
          fontWeight: 700,
          transform: sending ? 'scale(0.96)' : 'scale(1)',
          opacity: bodyTyped ? 1 : 0.35,
          transition: 'all 0.15s',
        }}
      >
        {sent ? 'Sent ✓' : 'Send email'}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderBottom: '1px solid #f0f0ee', fontSize: '13.5px' }}>
      <span style={{ width: '58px', flexShrink: 0, color: '#999', fontWeight: 600 }}>{label}</span>
      <span style={{ color: '#222' }}>{value}</span>
    </div>
  );
}

const EMAIL_CURSOR = [
  { top: 300, left: 260, opacity: 0 },
  { top: 120, left: 200, opacity: 1 },
  { top: 160, left: 200, opacity: 1 },
  { top: 220, left: 200, opacity: 1 },
  { top: 220, left: 200, opacity: 1 },
  { top: 340, left: 150, opacity: 1 },
  { top: 340, left: 150, opacity: 0.3 },
];

/* ---------- Chapter 2: message multiple tenants at once ---------- */

const BULK_TENANTS = ['Aino Virtanen', 'Eetu Koskinen', 'Saara Mäkinen', 'Tomi Laine', 'Elli Nieminen'];
const BULK_MESSAGE = 'Rent is due on the 5th.';
const BULK_DELAYS = [500, 500, 500, 500, 500, 900, 1100, 700, 2200];

function BulkChapter({ step }: { step: number }) {
  const selectedCount = Math.max(0, Math.min(BULK_TENANTS.length, step));
  const typing = step === 6;
  const messageText = step >= 7 ? BULK_MESSAGE : typing ? BULK_MESSAGE.slice(0, 12) : '';
  const sending = step === 7;
  const sent = step >= 8;

  return (
    <div style={{ padding: '22px 26px', flex: 1 }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>
        Message multiple residents
      </div>
      <div style={{ border: '1px solid #eee', borderRadius: '10px', marginBottom: '14px' }}>
        {BULK_TENANTS.map((name, i) => {
          const checked = i < selectedCount;
          return (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 16px', borderBottom: i < BULK_TENANTS.length - 1 ? '1px solid #f5f5f3' : 'none' }}>
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '5px',
                  flexShrink: 0,
                  border: `2px solid ${checked ? GREEN : '#ddd'}`,
                  background: checked ? GREEN : '#fff',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {checked && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                )}
              </div>
              <span style={{ fontSize: '13.5px', color: '#333' }}>{name}</span>
            </div>
          );
        })}
      </div>
      <div style={{ border: '1px solid #eee', borderRadius: '9px', padding: '11px 14px', fontSize: '13.5px', color: '#333', minHeight: '20px', marginBottom: '14px' }}>
        {messageText || <span style={{ color: '#aaa' }}>Message&hellip;</span>}
        {typing && <BlinkCaret color={GREEN} />}
      </div>
      <div
        style={{
          display: 'inline-flex',
          background: GREEN,
          borderRadius: '9px',
          padding: '11px 22px',
          color: '#fff',
          fontSize: '13.5px',
          fontWeight: 700,
          transform: sending ? 'scale(0.96)' : 'scale(1)',
          opacity: selectedCount === BULK_TENANTS.length ? 1 : 0.35,
          transition: 'all 0.15s',
        }}
      >
        {sent ? `Sent to ${BULK_TENANTS.length} residents ✓` : `Send to ${selectedCount} selected`}
      </div>
    </div>
  );
}

const BULK_CURSOR = [
  { top: 200, left: 360, opacity: 0 },
  { top: 120, left: 40, opacity: 1 },
  { top: 155, left: 40, opacity: 1 },
  { top: 190, left: 40, opacity: 1 },
  { top: 225, left: 40, opacity: 1 },
  { top: 260, left: 40, opacity: 1 },
  { top: 320, left: 150, opacity: 1 },
  { top: 400, left: 150, opacity: 1 },
  { top: 400, left: 150, opacity: 0.3 },
];

/* ---------- Chapter 3: view reports ---------- */

const REPORTS_DELAYS = [500, 1100, 1600, 2600];

function ReportsChapter({ step }: { step: number }) {
  const revealed = step >= 1;
  const dismissing = step === 2;
  const dismissed = step >= 3;

  return (
    <div style={{ padding: '22px 26px', flex: 1 }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
        Reports
      </div>
      <div style={{ fontSize: '12px', color: '#888', marginBottom: '16px' }}>Reported noticeboard posts, and who actually wrote them.</div>

      {dismissed ? (
        <div style={{ fontSize: '13px', color: '#999', padding: '24px 0', textAlign: 'center' }}>No open reports.</div>
      ) : (
        <div style={{ border: '1px solid #eee', borderRadius: '10px', padding: '16px', opacity: dismissing ? 0.4 : 1, transition: 'opacity 0.2s' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#888', marginBottom: '6px' }}>REPORTED CONTENT</div>
          <div style={{ fontSize: '13.5px', color: '#222', marginBottom: '10px' }}>&ldquo;Anyone want to buy my old couch, cheap&rdquo;</div>
          <div
            style={{
              fontSize: '12.5px',
              color: revealed ? GREEN : 'transparent',
              background: revealed ? 'transparent' : '#eee',
              borderRadius: '4px',
              display: 'inline-block',
              marginBottom: '10px',
              transition: 'all 0.3s',
              fontWeight: 700,
            }}
          >
            Written by: Tomi Laine (tomi.laine@example.com)
          </div>
          <div style={{ fontSize: '12px', color: '#999', marginBottom: '14px' }}>Reported by Saara Mäkinen</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, background: '#f0f2f0', color: '#555', borderRadius: '7px', padding: '7px 14px' }}>Dismiss</span>
            <span style={{ fontSize: '12.5px', fontWeight: 700, background: '#f0f2f0', color: '#555', borderRadius: '7px', padding: '7px 14px' }}>Delete</span>
          </div>
        </div>
      )}
    </div>
  );
}

const REPORTS_CURSOR = [
  { top: 300, left: 260, opacity: 0 },
  { top: 260, left: 130, opacity: 1 },
  { top: 300, left: 160, opacity: 1 },
  { top: 300, left: 160, opacity: 0.3 },
];

/* ---------- chapter registry ---------- */

const CHAPTERS = [
  { name: 'Send email', navLabel: 'Dashboard', delays: EMAIL_DELAYS, cursor: EMAIL_CURSOR, render: (s: number) => <EmailChapter step={s} /> },
  { name: 'Message everyone', navLabel: 'Dashboard', delays: BULK_DELAYS, cursor: BULK_CURSOR, render: (s: number) => <BulkChapter step={s} /> },
  { name: 'View reports', navLabel: 'Reports', delays: REPORTS_DELAYS, cursor: REPORTS_CURSOR, render: (s: number) => <ReportsChapter step={s} /> },
];

/* ---------- scaling frame (same as AnimatedTenantDemo) ---------- */

function FixedDemoFrame({ children }: { children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () => {
      const ow = outer.clientWidth;
      const oh = outer.clientHeight;
      const iw = inner.scrollWidth;
      const ih = inner.scrollHeight;
      if (!iw || !ih || !ow || !oh) return;
      setScale(Math.min(ow / iw, oh / ih));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outerRef} style={{ position: 'relative', overflow: 'hidden', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div ref={innerRef} style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
        {children}
      </div>
    </div>
  );
}

function PlayPauseButton({ playing, onClick }: { playing: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={playing ? 'Pause animation' : 'Play animation'}
      style={{
        position: 'absolute',
        right: '20px',
        bottom: '20px',
        width: '46px',
        height: '46px',
        borderRadius: '50%',
        background: 'rgba(4,106,56,0.85)',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        zIndex: 5,
      }}
    >
      {playing ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <rect x="5" y="4" width="5" height="16" rx="1" />
          <rect x="14" y="4" width="5" height="16" rx="1" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 4l14 8-14 8V4z" />
        </svg>
      )}
    </button>
  );
}

/* ---------- driver ---------- */

export default function AnimatedStaffDemo() {
  const [chapterIdx, setChapterIdx] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  const chapter = CHAPTERS[chapterIdx];
  const delays = chapter.delays;

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      if (step + 1 < delays.length) {
        setStep((s) => s + 1);
      } else {
        setChapterIdx((c) => (c + 1) % CHAPTERS.length);
        setStep(0);
      }
    }, delays[step]);
    return () => clearTimeout(timer);
  }, [playing, step, delays]);

  const cursorPos = chapter.cursor[Math.min(step, chapter.cursor.length - 1)];

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '980px',
        margin: '0 auto',
        background: '#fff',
        border: '1px solid #e8e8e3',
        borderRadius: '32px',
        padding: '36px',
        boxShadow: '0 0 140px -20px rgba(4,106,56,0.32), 0 4px 34px rgba(0,0,0,0.07)',
      }}
    >
      <div style={{ height: '600px' }}>
        <FixedDemoFrame>
          <div style={{ position: 'relative', width: '740px', flexShrink: 0 }}>
            <div style={{ background: '#fff', border: '1px solid #e0e0dc', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 34px 90px rgba(0,0,0,0.16)' }}>
              <BrowserChrome url="kuopas.fi/staff" />
              <div style={{ display: 'flex', flexDirection: 'column', height: '540px' }}>
                <StaffTopBar active={chapter.navLabel} />
                {chapter.render(step)}
              </div>
            </div>
            <CursorArrow pos={cursorPos} />
          </div>
        </FixedDemoFrame>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '22px' }}>
        {CHAPTERS.map((c, i) => (
          <div
            key={c.name}
            style={{
              height: '5px',
              width: i === chapterIdx ? '28px' : '5px',
              borderRadius: '999px',
              background: i === chapterIdx ? GREEN : '#ddd',
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>

      <PlayPauseButton playing={playing} onClick={() => setPlaying((p) => !p)} />

      <style>{`
        @keyframes kuopasStaffBlinkCaret { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }
      `}</style>
    </div>
  );
}
