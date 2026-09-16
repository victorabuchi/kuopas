'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';

/* ---------- shared chrome ---------- */

function BrowserChrome({ url }: { url: string }) {
  return (
    <div style={{ background: '#f5f5f3', borderBottom: '1px solid #e0e0dc', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '5px' }}>
        {['#ff5f57', '#ffbd2e', '#28c940'].map((c) => (
          <div key={c} style={{ width: '9px', height: '9px', borderRadius: '50%', background: c }} />
        ))}
      </div>
      <div style={{ flex: 1, background: '#ebebea', borderRadius: '5px', padding: '3px 8px', fontSize: '10px', color: '#888', textAlign: 'center' }}>
        {url}
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
      <svg width="18" height="22" viewBox="0 0 18 22">
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
        width: '1.5px',
        height: '13px',
        background: color,
        marginLeft: '1px',
        verticalAlign: 'text-bottom',
        animation: 'kuopasBlinkCaret 1s step-end infinite',
      }}
    />
  );
}

const GREEN = '#046a38';
const GREEN_SOFT = 'color-mix(in srgb, #046a38 8%, white)';
const GREEN_BORDER = 'color-mix(in srgb, #046a38 28%, white)';

/* ---------- Chapter 1: move-in guide ---------- */

const GUIDE_ITEMS = ['Pick up your keys', 'Set up internet', 'Find the laundry room'];
const GUIDE_DELAYS = [500, 900, 900, 900, 1600];

function GuideChapter({ step }: { step: number }) {
  const doneCount = Math.max(0, Math.min(GUIDE_ITEMS.length, step));
  return (
    <div style={{ padding: '18px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '14px' }}>
        Move-in guide
      </div>
      {GUIDE_ITEMS.map((label, i) => {
        const done = i < doneCount;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: i < GUIDE_ITEMS.length - 1 ? '1px solid #eee' : 'none' }}>
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '6px',
                flexShrink: 0,
                border: `2px solid ${done ? GREEN : '#ddd'}`,
                background: done ? GREEN : '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >
              {done && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 13 4 4L19 7" />
                </svg>
              )}
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: done ? '#999' : '#333', textDecoration: done ? 'line-through' : 'none', transition: 'all 0.2s' }}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const GUIDE_CURSOR = [
  { top: 200, left: 150, opacity: 0 },
  { top: 76, left: 30, opacity: 1 },
  { top: 113, left: 30, opacity: 1 },
  { top: 150, left: 30, opacity: 1 },
  { top: 150, left: 30, opacity: 0.3 },
];

/* ---------- Chapter 2: apartment chat ---------- */

const CHAT_MESSAGES = [
  { name: 'Aino', text: 'anyone free to grab the sauna slot tonight?', mine: false },
  { name: '', text: "yeah I'll book 8pm", mine: true },
  { name: 'Eetu', text: 'Kuopas posted a water shutoff notice for tmrw', mine: false },
];
const CHAT_DELAYS = [500, 1200, 1200, 1200, 1600];

function ChatChapter({ step }: { step: number }) {
  const shown = Math.max(0, Math.min(CHAT_MESSAGES.length, step));
  return (
    <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '210px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '4px' }}>
        Apartment chat
      </div>
      {CHAT_MESSAGES.slice(0, shown).map((m, i) => (
        <div
          key={i}
          style={{
            alignSelf: m.mine ? 'flex-end' : 'flex-start',
            maxWidth: '82%',
            animation: 'kuopasSlideIn 0.3s ease both',
          }}
        >
          {!m.mine && <div style={{ fontSize: '10.5px', fontWeight: 700, color: GREEN, marginBottom: '2px' }}>{m.name}</div>}
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '14px',
              fontSize: '12.5px',
              lineHeight: 1.4,
              background: m.mine ? GREEN : '#f0f2f0',
              color: m.mine ? '#fff' : '#222',
              borderBottomRightRadius: m.mine ? '4px' : '14px',
              borderBottomLeftRadius: m.mine ? '14px' : '4px',
            }}
          >
            {m.text}
          </div>
        </div>
      ))}
    </div>
  );
}

const CHAT_CURSOR = [
  { top: 200, left: 150, opacity: 0 },
  { top: 200, left: 150, opacity: 0 },
  { top: 200, left: 150, opacity: 0 },
  { top: 200, left: 150, opacity: 0 },
  { top: 200, left: 150, opacity: 0 },
];

/* ---------- Chapter 3: message Kuopas directly ---------- */

const NOTICE_DELAYS = [500, 1000, 500, 900, 500, 400, 1600];

function NoticeChapter({ step }: { step: number }) {
  const showKuopasMsg = step >= 1;
  const typing = step === 3 || step === 4;
  const replyText = step >= 4 ? 'On it, thanks!' : step === 3 ? 'On it, tha' : '';
  const sent = step >= 5;

  return (
    <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', minHeight: '210px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '10px' }}>
        Message Kuopas
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {showKuopasMsg && (
          <div style={{ alignSelf: 'flex-start', maxWidth: '85%', animation: 'kuopasSlideIn 0.3s ease both' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 700, color: GREEN, marginBottom: '2px' }}>Kuopas</div>
            <div style={{ padding: '8px 12px', borderRadius: '14px', borderBottomLeftRadius: '4px', fontSize: '12.5px', lineHeight: 1.4, background: '#f0f2f0', color: '#222' }}>
              Your parking spot renewal is due Friday.
            </div>
          </div>
        )}
        {sent && (
          <div style={{ alignSelf: 'flex-end', maxWidth: '85%', animation: 'kuopasSlideIn 0.3s ease both' }}>
            <div style={{ padding: '8px 12px', borderRadius: '14px', borderBottomRightRadius: '4px', fontSize: '12.5px', lineHeight: 1.4, background: GREEN, color: '#fff' }}>
              On it, thanks!
            </div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #ddd', borderRadius: '999px', padding: '8px 12px', marginTop: '10px' }}>
        <span style={{ fontSize: '12.5px', color: '#333', flex: 1 }}>
          {typing || sent ? replyText : ''}
          {typing && <BlinkCaret color={GREEN} />}
        </span>
        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: GREEN, flexShrink: 0, transform: step === 5 ? 'scale(0.85)' : 'scale(1)', transition: 'transform 0.15s' }} />
      </div>
    </div>
  );
}

const NOTICE_CURSOR = [
  { top: 210, left: 260, opacity: 0 },
  { top: 210, left: 260, opacity: 0 },
  { top: 210, left: 100, opacity: 1 },
  { top: 210, left: 100, opacity: 1 },
  { top: 210, left: 100, opacity: 1 },
  { top: 210, left: 260, opacity: 1 },
  { top: 210, left: 260, opacity: 0.3 },
];

/* ---------- Chapter 4: book anything ---------- */

const BOOKING_TABS = ['Sauna', 'Laundry', 'Parking'] as const;
const SLOT_LABELS: Record<(typeof BOOKING_TABS)[number], string[]> = {
  Sauna: ['16:00', '18:00', '20:00'],
  Laundry: ['08:00', '10:00', '14:00'],
  Parking: ['P1', 'P2', 'P3'],
};
const BOOKING_DELAYS = [500, 900, 900, 1400, 900, 900, 1400, 900, 900, 2000];
const BOOKING_TAB_AT_STEP = [0, 0, 0, 0, 1, 1, 1, 2, 2, 2];

function BookingChapter({ step }: { step: number }) {
  const tabIdx = BOOKING_TAB_AT_STEP[Math.min(step, BOOKING_TAB_AT_STEP.length - 1)] ?? 0;
  const tab = BOOKING_TABS[tabIdx];
  const localStep = step % 3;
  const picked = localStep >= 1;
  const confirmed = localStep >= 2;

  return (
    <div style={{ padding: '18px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '12px' }}>
        Book in seconds
      </div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
        {BOOKING_TABS.map((label) => (
          <div
            key={label}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '6px 4px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '8px',
              background: label === tab ? GREEN : '#f0f2f0',
              color: label === tab ? '#fff' : '#888',
              transition: 'all 0.25s',
            }}
          >
            {label}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        {SLOT_LABELS[tab].map((slot, i) => {
          const isPicked = picked && i === 1;
          return (
            <div
              key={slot}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '10px 4px',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: '8px',
                border: `1.5px solid ${isPicked ? GREEN : '#ddd'}`,
                background: isPicked ? GREEN_SOFT : '#fafaf9',
                color: isPicked ? GREEN : '#999',
                transition: 'all 0.2s',
                boxShadow: isPicked ? `0 0 0 3px ${GREEN_BORDER}` : 'none',
              }}
            >
              {slot}
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: '14px',
          background: GREEN,
          borderRadius: '8px',
          padding: '9px',
          textAlign: 'center',
          color: '#fff',
          fontSize: '12.5px',
          fontWeight: 700,
          transform: confirmed ? 'scale(0.96)' : 'scale(1)',
          opacity: picked ? 1 : 0.35,
          transition: 'all 0.15s',
        }}
      >
        {confirmed ? 'Booked' : 'Confirm'}
      </div>
    </div>
  );
}

const BOOKING_CURSOR = [
  { top: 200, left: 230, opacity: 0 },
  { top: 82, left: 150, opacity: 1 },
  { top: 110, left: 150, opacity: 1 },
  { top: 168, left: 150, opacity: 1 },
  { top: 82, left: 150, opacity: 1 },
  { top: 110, left: 150, opacity: 1 },
  { top: 168, left: 150, opacity: 1 },
  { top: 82, left: 150, opacity: 1 },
  { top: 110, left: 150, opacity: 1 },
  { top: 168, left: 150, opacity: 0.3 },
];

/* ---------- chapter registry ---------- */

const CHAPTERS = [
  { name: 'Move-in guide', delays: GUIDE_DELAYS, cursor: GUIDE_CURSOR, render: (s: number) => <GuideChapter step={s} /> },
  { name: 'Apartment chat', delays: CHAT_DELAYS, cursor: CHAT_CURSOR, render: (s: number) => <ChatChapter step={s} /> },
  { name: 'Message Kuopas', delays: NOTICE_DELAYS, cursor: NOTICE_CURSOR, render: (s: number) => <NoticeChapter step={s} /> },
  { name: 'Book in seconds', delays: BOOKING_DELAYS, cursor: BOOKING_CURSOR, render: (s: number) => <BookingChapter step={s} /> },
];

/* ---------- scaling frame ---------- */

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
        right: '16px',
        bottom: '16px',
        width: '38px',
        height: '38px',
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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <rect x="5" y="4" width="5" height="16" rx="1" />
          <rect x="14" y="4" width="5" height="16" rx="1" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 4l14 8-14 8V4z" />
        </svg>
      )}
    </button>
  );
}

/* ---------- driver ---------- */

export default function AnimatedTenantDemo() {
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
        maxWidth: '380px',
        margin: '0 auto',
        background: '#fff',
        border: '1px solid #e8e8e3',
        borderRadius: '24px',
        padding: '20px',
        boxShadow: '0 0 100px -20px rgba(4,106,56,0.3), 0 4px 24px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ height: '280px' }}>
        <FixedDemoFrame>
          <div style={{ position: 'relative', width: '300px', flexShrink: 0 }}>
            <div style={{ background: '#fff', border: '1px solid #e0e0dc', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.13)' }}>
              <BrowserChrome url="kuopas.fi/app" />
              {chapter.render(step)}
            </div>
            <CursorArrow pos={cursorPos} />
          </div>
        </FixedDemoFrame>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '14px' }}>
        {CHAPTERS.map((c, i) => (
          <div
            key={c.name}
            style={{
              height: '4px',
              width: i === chapterIdx ? '20px' : '4px',
              borderRadius: '999px',
              background: i === chapterIdx ? GREEN : '#ddd',
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>

      <PlayPauseButton playing={playing} onClick={() => setPlaying((p) => !p)} />

      <style>{`
        @keyframes kuopasBlinkCaret { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }
        @keyframes kuopasSlideIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
}
