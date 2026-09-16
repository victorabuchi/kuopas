'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import Image from 'next/image';

/* ---------- shared chrome ---------- */

function BrowserChrome({ url }: { url: string }) {
  return (
    <div style={{ background: '#f5f5f3', borderBottom: '1px solid #e0e0dc', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '9px' }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        {['#ff5f57', '#ffbd2e', '#28c940'].map((c) => (
          <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />
        ))}
      </div>
      <div style={{ flex: 1, background: '#ebebea', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: '#888', textAlign: 'center' }}>
        {url}
      </div>
    </div>
  );
}

const GREEN = '#046a38';
const GREEN_SOFT = 'color-mix(in srgb, #046a38 8%, white)';
const GREEN_BORDER = 'color-mix(in srgb, #046a38 28%, white)';
const CHAT_BG = 'color-mix(in srgb, #046a38 5%, white)';

const SIDEBAR_ICONS = [
  { key: 'home', path: 'M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9' },
  { key: 'chat', path: 'M20 12a7 7 0 0 1-7 7H8l-4 3 1-4.5A7 7 0 1 1 20 12Z' },
  { key: 'messages', path: 'M3 5h18v14H3zM4 7l8 6 8-6' },
  { key: 'guide', path: 'M9 11.5 11 13.5 15.5 9M4 4h16v16H4z' },
  { key: 'laundry', path: 'M4 3.5h16v17H4zM12 13m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0' },
];

function AppSidebar({ activeKey }: { activeKey: string }) {
  return (
    <div style={{ width: '42px', flexShrink: 0, background: '#fff', borderRight: '1px solid #eee', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', paddingTop: '14px' }}>
      {SIDEBAR_ICONS.map((icon) => {
        const active = icon.key === activeKey;
        return (
          <svg key={icon.key} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? GREEN : '#c7c7c2'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d={icon.path} />
          </svg>
        );
      })}
    </div>
  );
}

function AppTopBar({ title }: { title: string }) {
  return (
    <div style={{ flexShrink: 0 }}>
      <div style={{ height: '40px', display: 'flex', alignItems: 'center', gap: '10px', padding: '0 14px', background: '#fff', borderBottom: '1px solid #eee' }}>
        <Image src="/Kuopas-logo.png" alt="Kuopas" width={58} height={24} style={{ height: '18px', width: 'auto' }} />
        <span style={{ fontWeight: 800, fontSize: '13px', color: '#000' }}>{title}</span>
      </div>
      <div style={{ height: '4px', backgroundImage: "url('/page-header-bg.svg')", backgroundRepeat: 'repeat-x', backgroundSize: 'auto 100%' }} />
    </div>
  );
}

function ChatTopBar({ name, subtitle }: { name: string; subtitle: string }) {
  return (
    <div style={{ flexShrink: 0, height: '46px', display: 'flex', alignItems: 'center', gap: '10px', padding: '0 14px', background: '#fff', borderBottom: '1px solid #eee' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m15 18-6-6 6-6" />
      </svg>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
        <div style={{ fontSize: '10px', color: '#888' }}>{subtitle}</div>
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
      <svg width="20" height="24" viewBox="0 0 18 22">
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
        height: '14px',
        background: color,
        marginLeft: '1px',
        verticalAlign: 'text-bottom',
        animation: 'kuopasBlinkCaret 1s step-end infinite',
      }}
    />
  );
}

function SendButton({ pressed }: { pressed: boolean }) {
  return (
    <div
      style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: GREEN,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transform: pressed ? 'scale(0.85)' : 'scale(1)',
        transition: 'transform 0.15s',
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12 14-7-7 14-2-6z" />
      </svg>
    </div>
  );
}

/* ---------- Chapter 1: move-in guide ---------- */

const GUIDE_ITEMS = ['Pick up your keys', 'Set up internet', 'Learn waste sorting', 'Find the laundry room'];
const GUIDE_DELAYS = [500, 850, 850, 850, 850, 1900];

function GuideChapter({ step }: { step: number }) {
  const doneCount = Math.max(0, Math.min(GUIDE_ITEMS.length, step));
  return (
    <>
      <AppTopBar title="Move-in guide" />
      <div style={{ padding: '16px 18px', flex: 1 }}>
        <div style={{ fontSize: '11px', color: '#888', marginBottom: '14px' }}>
          {doneCount} of {GUIDE_ITEMS.length} done · Sarkiniementie 30
        </div>
        {GUIDE_ITEMS.map((label, i) => {
          const done = i < doneCount;
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 0', borderBottom: i < GUIDE_ITEMS.length - 1 ? '1px solid #eee' : 'none' }}>
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '7px',
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
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                )}
              </div>
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: done ? '#999' : '#222', textDecoration: done ? 'line-through' : 'none', transition: 'all 0.2s' }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

const GUIDE_CURSOR = [
  { top: 260, left: 220, opacity: 0 },
  { top: 90, left: 30, opacity: 1 },
  { top: 140, left: 30, opacity: 1 },
  { top: 190, left: 30, opacity: 1 },
  { top: 240, left: 30, opacity: 1 },
  { top: 240, left: 30, opacity: 0.3 },
];

/* ---------- Chapter 2: apartment chat ---------- */

const GROUP_NAME = 'Sarkiniementie 30 B315';
const FLATMATE_MSG = { name: 'Aino', text: 'anyone free to grab the sauna slot tonight?' };
const KUOPAS_NOTE_IN_CHAT = { name: 'Eetu', text: 'Kuopas posted a water shutoff notice for tmrw' };
const REPLY_TEXT = "yeah I'll book 8pm";

const CHAT_DELAYS = [500, 1300, 550, 550, 350, 1300, 2000];

function ChatChapter({ step }: { step: number }) {
  const showFlatmateMsg = step >= 1;
  const typingPartial = step === 2;
  const typingFull = step === 3;
  const justSent = step === 4;
  const showReply = step >= 4;
  const showKuopasNote = step >= 5;

  const composerText = typingPartial ? "yeah I'll b" : typingFull ? REPLY_TEXT : '';

  return (
    <>
      <ChatTopBar name={GROUP_NAME} subtitle="3 flatmates" />
      <div style={{ flex: 1, background: CHAT_BG, padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'hidden' }}>
        {showFlatmateMsg && (
          <div style={{ alignSelf: 'flex-start', maxWidth: '82%', animation: 'kuopasSlideIn 0.3s ease both' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: GREEN, marginBottom: '2px' }}>{FLATMATE_MSG.name}</div>
            <div style={{ padding: '9px 13px', borderRadius: '15px', borderBottomLeftRadius: '4px', fontSize: '13px', lineHeight: 1.4, background: '#fff', color: '#222', boxShadow: '0 1px 1px rgba(0,0,0,0.06)' }}>
              {FLATMATE_MSG.text}
            </div>
          </div>
        )}
        {showReply && (
          <div style={{ alignSelf: 'flex-end', maxWidth: '82%', animation: 'kuopasSlideIn 0.3s ease both' }}>
            <div style={{ padding: '9px 13px', borderRadius: '15px', borderBottomRightRadius: '4px', fontSize: '13px', lineHeight: 1.4, background: GREEN, color: '#fff' }}>
              {REPLY_TEXT}
            </div>
          </div>
        )}
        {showKuopasNote && (
          <div style={{ alignSelf: 'flex-start', maxWidth: '82%', animation: 'kuopasSlideIn 0.3s ease both' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: GREEN, marginBottom: '2px' }}>{KUOPAS_NOTE_IN_CHAT.name}</div>
            <div style={{ padding: '9px 13px', borderRadius: '15px', borderBottomLeftRadius: '4px', fontSize: '13px', lineHeight: 1.4, background: '#fff', color: '#222', boxShadow: '0 1px 1px rgba(0,0,0,0.06)' }}>
              {KUOPAS_NOTE_IN_CHAT.text}
            </div>
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#fff', borderTop: '1px solid #eee' }}>
        <div style={{ flex: 1, height: '32px', borderRadius: '999px', border: '1px solid #ddd', display: 'flex', alignItems: 'center', padding: '0 13px', fontSize: '12.5px', color: '#333', background: CHAT_BG }}>
          {composerText}
          {(typingPartial || typingFull) && <BlinkCaret color={GREEN} />}
          {!composerText && <span style={{ color: '#aaa' }}>Message the apartment&hellip;</span>}
        </div>
        <SendButton pressed={justSent} />
      </div>
    </>
  );
}

const CHAT_CURSOR = [
  { top: 300, left: 220, opacity: 0 },
  { top: 300, left: 220, opacity: 0 },
  { top: 280, left: 130, opacity: 1 },
  { top: 280, left: 130, opacity: 1 },
  { top: 280, left: 370, opacity: 1 },
  { top: 280, left: 370, opacity: 0 },
  { top: 280, left: 370, opacity: 0 },
];

/* ---------- Chapter 3: message Kuopas directly ---------- */

const NOTICE_DELAYS = [500, 1000, 500, 900, 500, 400, 2000];

function NoticeChapter({ step }: { step: number }) {
  const showKuopasMsg = step >= 1;
  const typing = step === 3 || step === 4;
  const replyText = step >= 4 ? 'On it, thanks!' : step === 3 ? 'On it, tha' : '';
  const sent = step >= 5;

  return (
    <>
      <ChatTopBar name="Kuopas" subtitle="Direct notice" />
      <div style={{ flex: 1, background: CHAT_BG, padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {showKuopasMsg && (
          <div style={{ alignSelf: 'flex-start', maxWidth: '85%', animation: 'kuopasSlideIn 0.3s ease both' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: GREEN, marginBottom: '2px' }}>Kuopas</div>
            <div style={{ padding: '9px 13px', borderRadius: '15px', borderBottomLeftRadius: '4px', fontSize: '13px', lineHeight: 1.4, background: '#fff', color: '#222', boxShadow: '0 1px 1px rgba(0,0,0,0.06)' }}>
              Your parking spot renewal is due Friday.
            </div>
          </div>
        )}
        {sent && (
          <div style={{ alignSelf: 'flex-end', maxWidth: '85%', animation: 'kuopasSlideIn 0.3s ease both' }}>
            <div style={{ padding: '9px 13px', borderRadius: '15px', borderBottomRightRadius: '4px', fontSize: '13px', lineHeight: 1.4, background: GREEN, color: '#fff' }}>
              On it, thanks!
            </div>
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#fff', borderTop: '1px solid #eee' }}>
        <div style={{ flex: 1, height: '32px', borderRadius: '999px', border: '1px solid #ddd', display: 'flex', alignItems: 'center', padding: '0 13px', fontSize: '12.5px', color: '#333', background: CHAT_BG }}>
          {typing || sent ? replyText : <span style={{ color: '#aaa' }}>Reply&hellip;</span>}
          {typing && <BlinkCaret color={GREEN} />}
        </div>
        <SendButton pressed={step === 5} />
      </div>
    </>
  );
}

const NOTICE_CURSOR = [
  { top: 300, left: 350, opacity: 0 },
  { top: 300, left: 350, opacity: 0 },
  { top: 280, left: 130, opacity: 1 },
  { top: 280, left: 130, opacity: 1 },
  { top: 280, left: 130, opacity: 1 },
  { top: 280, left: 370, opacity: 1 },
  { top: 280, left: 370, opacity: 0 },
];

/* ---------- Chapter 4: book anything ---------- */

const BOOKING_TABS = ['Sauna', 'Laundry', 'Parking'] as const;
const SLOT_LABELS: Record<(typeof BOOKING_TABS)[number], string[]> = {
  Sauna: ['16:00', '18:00', '20:00'],
  Laundry: ['08:00', '10:00', '14:00'],
  Parking: ['P1', 'P2', 'P3'],
};
const BOOKING_DELAYS = [500, 850, 850, 1500, 850, 850, 1500, 850, 850, 2200];
const BOOKING_TAB_AT_STEP = [0, 0, 0, 0, 1, 1, 1, 2, 2, 2];

function BookingChapter({ step }: { step: number }) {
  const tabIdx = BOOKING_TAB_AT_STEP[Math.min(step, BOOKING_TAB_AT_STEP.length - 1)] ?? 0;
  const tab = BOOKING_TABS[tabIdx];
  const localStep = step % 3;
  const picked = localStep >= 1;
  const confirmed = localStep >= 2;

  return (
    <>
      <AppTopBar title={tab} />
      <div style={{ padding: '16px 18px', flex: 1 }}>
        <div style={{ fontSize: '11px', color: '#888', marginBottom: '14px' }}>This week · Sarkiniementie 30</div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {BOOKING_TABS.map((label) => (
            <div
              key={label}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '8px 6px',
                fontSize: '12.5px',
                fontWeight: 700,
                borderRadius: '10px',
                background: label === tab ? GREEN : '#f0f2f0',
                color: label === tab ? '#fff' : '#888',
                transition: 'all 0.25s',
              }}
            >
              {label}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {SLOT_LABELS[tab].map((slot, i) => {
            const isPicked = picked && i === 1;
            return (
              <div
                key={slot}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '14px 6px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  borderRadius: '10px',
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
            marginTop: '18px',
            background: GREEN,
            borderRadius: '10px',
            padding: '12px',
            textAlign: 'center',
            color: '#fff',
            fontSize: '13.5px',
            fontWeight: 700,
            transform: confirmed ? 'scale(0.96)' : 'scale(1)',
            opacity: picked ? 1 : 0.35,
            transition: 'all 0.15s',
          }}
        >
          {confirmed ? 'Booked' : 'Confirm'}
        </div>
      </div>
    </>
  );
}

const BOOKING_CURSOR = [
  { top: 320, left: 340, opacity: 0 },
  { top: 120, left: 220, opacity: 1 },
  { top: 160, left: 220, opacity: 1 },
  { top: 240, left: 220, opacity: 1 },
  { top: 120, left: 220, opacity: 1 },
  { top: 160, left: 220, opacity: 1 },
  { top: 240, left: 220, opacity: 1 },
  { top: 120, left: 220, opacity: 1 },
  { top: 160, left: 220, opacity: 1 },
  { top: 240, left: 220, opacity: 0.3 },
];

/* ---------- chapter registry ---------- */

const CHAPTERS = [
  { name: 'Move-in guide', sidebarKey: 'guide', delays: GUIDE_DELAYS, cursor: GUIDE_CURSOR, render: (s: number) => <GuideChapter step={s} /> },
  { name: 'Apartment chat', sidebarKey: 'chat', delays: CHAT_DELAYS, cursor: CHAT_CURSOR, render: (s: number) => <ChatChapter step={s} /> },
  { name: 'Message Kuopas', sidebarKey: 'messages', delays: NOTICE_DELAYS, cursor: NOTICE_CURSOR, render: (s: number) => <NoticeChapter step={s} /> },
  { name: 'Book in seconds', sidebarKey: 'laundry', delays: BOOKING_DELAYS, cursor: BOOKING_CURSOR, render: (s: number) => <BookingChapter step={s} /> },
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
        right: '18px',
        bottom: '18px',
        width: '42px',
        height: '42px',
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
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <rect x="5" y="4" width="5" height="16" rx="1" />
          <rect x="14" y="4" width="5" height="16" rx="1" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
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
        maxWidth: '620px',
        margin: '0 auto',
        background: '#fff',
        border: '1px solid #e8e8e3',
        borderRadius: '28px',
        padding: '28px',
        boxShadow: '0 0 120px -20px rgba(4,106,56,0.32), 0 4px 30px rgba(0,0,0,0.07)',
      }}
    >
      <div style={{ height: '500px' }}>
        <FixedDemoFrame>
          <div style={{ position: 'relative', width: '480px', flexShrink: 0 }}>
            <div style={{ background: '#fff', border: '1px solid #e0e0dc', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.15)' }}>
              <BrowserChrome url="kuopas.fi/app" />
              <div style={{ display: 'flex', height: '460px' }}>
                <AppSidebar activeKey={chapter.sidebarKey} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>{chapter.render(step)}</div>
              </div>
            </div>
            <CursorArrow pos={cursorPos} />
          </div>
        </FixedDemoFrame>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '7px', marginTop: '18px' }}>
        {CHAPTERS.map((c, i) => (
          <div
            key={c.name}
            style={{
              height: '5px',
              width: i === chapterIdx ? '24px' : '5px',
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
