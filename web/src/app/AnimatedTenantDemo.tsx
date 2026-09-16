'use client';

import { Fragment, useState, useEffect, useRef, useLayoutEffect } from 'react';
import Image from 'next/image';

/* ---------- shared chrome ---------- */

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
const GREEN_BORDER = 'color-mix(in srgb, #046a38 28%, white)';
const CHAT_BG = 'color-mix(in srgb, #046a38 5%, white)';
const BUILDING = 'Sarkiniementie 30';

const SIDEBAR_ICONS: { key: string; icon: React.ReactNode }[] = [
  {
    key: 'home',
    icon: (
      <>
        <path d="M4 11.5 12 4l8 7.5" />
        <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
      </>
    ),
  },
  {
    key: 'chat',
    icon: <path d="M20 12a7 7 0 0 1-7 7H8l-4 3 1-4.5A7 7 0 1 1 20 12Z" />,
  },
  {
    key: 'messages',
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
  },
  {
    key: 'guide',
    icon: (
      <>
        <path d="M9 11.5 11 13.5 15.5 9" />
        <rect x="4" y="4" width="16" height="16" rx="3" />
      </>
    ),
  },
  {
    key: 'laundry',
    icon: (
      <>
        <rect x="4" y="3.5" width="16" height="17" rx="3" />
        <circle cx="12" cy="13" r="5" />
        <circle cx="12" cy="13" r="1.6" />
      </>
    ),
  },
  {
    key: 'sauna',
    icon: (
      <>
        <path d="M8 3c-1 1.5-1 2.5 0 4-1 1.5-1 2.5 0 4" />
        <path d="M12 3c-1 1.5-1 2.5 0 4-1 1.5-1 2.5 0 4" />
        <path d="M16 3c-1 1.5-1 2.5 0 4-1 1.5-1 2.5 0 4" />
        <rect x="3.5" y="13" width="17" height="8" rx="1.5" />
      </>
    ),
  },
  {
    key: 'parking',
    icon: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
        <path d="M9.5 16V8h3a2.5 2.5 0 0 1 0 5h-3" />
      </>
    ),
  },
];

function AppSidebar({ activeKey }: { activeKey: string }) {
  return (
    <div style={{ width: '52px', flexShrink: 0, background: '#fff', borderRight: '1px solid #eee', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px', paddingTop: '18px' }}>
      {SIDEBAR_ICONS.map((item) => {
        const active = item.key === activeKey;
        return (
          <svg key={item.key} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? GREEN : '#c7c7c2'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {item.icon}
          </svg>
        );
      })}
    </div>
  );
}

function AppTopBar({ title }: { title: string }) {
  return (
    <div style={{ flexShrink: 0 }}>
      <div style={{ height: '48px', display: 'flex', alignItems: 'center', gap: '12px', padding: '0 18px', background: '#fff', borderBottom: '1px solid #eee' }}>
        <Image src="/Kuopas-logo.png" alt="Kuopas" width={70} height={28} style={{ height: '22px', width: 'auto' }} />
        <span style={{ fontWeight: 800, fontSize: '15px', color: '#000' }}>{title}</span>
      </div>
      <div style={{ height: '5px', backgroundImage: "url('/page-header-bg.svg')", backgroundRepeat: 'repeat-x', backgroundSize: 'auto 100%' }} />
    </div>
  );
}

function ChatTopBar({ name, subtitle }: { name: string; subtitle: string }) {
  return (
    <div style={{ flexShrink: 0, height: '54px', display: 'flex', alignItems: 'center', gap: '12px', padding: '0 18px', background: '#fff', borderBottom: '1px solid #eee' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m15 18-6-6 6-6" />
      </svg>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '14.5px', color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
        <div style={{ fontSize: '11.5px', color: '#888' }}>{subtitle}</div>
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
        animation: 'kuopasBlinkCaret 1s step-end infinite',
      }}
    />
  );
}

function SendButton({ pressed }: { pressed: boolean }) {
  return (
    <div
      style={{
        width: '36px',
        height: '36px',
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
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
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
      <div style={{ padding: '20px 22px', flex: 1 }}>
        <div style={{ fontSize: '12.5px', color: '#888', marginBottom: '16px' }}>
          {doneCount} of {GUIDE_ITEMS.length} done · {BUILDING}
        </div>
        {GUIDE_ITEMS.map((label, i) => {
          const done = i < doneCount;
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 0', borderBottom: i < GUIDE_ITEMS.length - 1 ? '1px solid #eee' : 'none' }}>
              <div
                style={{
                  width: '25px',
                  height: '25px',
                  borderRadius: '8px',
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
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                )}
              </div>
              <span style={{ fontSize: '15px', fontWeight: 600, color: done ? '#999' : '#222', textDecoration: done ? 'line-through' : 'none', transition: 'all 0.2s' }}>
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
  { top: 300, left: 260, opacity: 0 },
  { top: 108, left: 40, opacity: 1 },
  { top: 170, left: 40, opacity: 1 },
  { top: 232, left: 40, opacity: 1 },
  { top: 294, left: 40, opacity: 1 },
  { top: 294, left: 40, opacity: 0.3 },
];

/* ---------- Chapter 2: apartment chat ---------- */

const GROUP_NAME = `${BUILDING} B315`;
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
      <div style={{ flex: 1, background: CHAT_BG, padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
        {showFlatmateMsg && (
          <div style={{ alignSelf: 'flex-start', maxWidth: '78%', animation: 'kuopasSlideIn 0.3s ease both' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: GREEN, marginBottom: '3px' }}>{FLATMATE_MSG.name}</div>
            <div style={{ padding: '11px 15px', borderRadius: '16px', borderBottomLeftRadius: '4px', fontSize: '14px', lineHeight: 1.4, background: '#fff', color: '#222', boxShadow: '0 1px 1px rgba(0,0,0,0.06)' }}>
              {FLATMATE_MSG.text}
            </div>
          </div>
        )}
        {showReply && (
          <div style={{ alignSelf: 'flex-end', maxWidth: '78%', animation: 'kuopasSlideIn 0.3s ease both' }}>
            <div style={{ padding: '11px 15px', borderRadius: '16px', borderBottomRightRadius: '4px', fontSize: '14px', lineHeight: 1.4, background: GREEN, color: '#fff' }}>
              {REPLY_TEXT}
            </div>
          </div>
        )}
        {showKuopasNote && (
          <div style={{ alignSelf: 'flex-start', maxWidth: '78%', animation: 'kuopasSlideIn 0.3s ease both' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: GREEN, marginBottom: '3px' }}>{KUOPAS_NOTE_IN_CHAT.name}</div>
            <div style={{ padding: '11px 15px', borderRadius: '16px', borderBottomLeftRadius: '4px', fontSize: '14px', lineHeight: 1.4, background: '#fff', color: '#222', boxShadow: '0 1px 1px rgba(0,0,0,0.06)' }}>
              {KUOPAS_NOTE_IN_CHAT.text}
            </div>
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: '#fff', borderTop: '1px solid #eee' }}>
        <div style={{ flex: 1, height: '38px', borderRadius: '999px', border: '1px solid #ddd', display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: '13.5px', color: '#333', background: CHAT_BG }}>
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
  { top: 340, left: 260, opacity: 0 },
  { top: 340, left: 260, opacity: 0 },
  { top: 320, left: 150, opacity: 1 },
  { top: 320, left: 150, opacity: 1 },
  { top: 320, left: 430, opacity: 1 },
  { top: 320, left: 430, opacity: 0 },
  { top: 320, left: 430, opacity: 0 },
];

/* ---------- Chapter 3: message Kuopas directly ---------- */

const KUOPAS_MSG_TEXT = 'Your apartment inspection is booked for Monday at 14:00.';
const NOTICE_DELAYS = [500, 1000, 500, 900, 500, 400, 2000];

function NoticeChapter({ step }: { step: number }) {
  const showKuopasMsg = step >= 1;
  const typing = step === 3 || step === 4;
  const replyText = step >= 4 ? 'Sounds good, thanks!' : step === 3 ? 'Sounds good, th' : '';
  const sent = step >= 5;

  return (
    <>
      <ChatTopBar name="Kuopas" subtitle="Direct notice" />
      <div style={{ flex: 1, background: CHAT_BG, padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {showKuopasMsg && (
          <div style={{ alignSelf: 'flex-start', maxWidth: '82%', animation: 'kuopasSlideIn 0.3s ease both' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: GREEN, marginBottom: '3px' }}>Kuopas</div>
            <div style={{ padding: '11px 15px', borderRadius: '16px', borderBottomLeftRadius: '4px', fontSize: '14px', lineHeight: 1.4, background: '#fff', color: '#222', boxShadow: '0 1px 1px rgba(0,0,0,0.06)' }}>
              {KUOPAS_MSG_TEXT}
            </div>
          </div>
        )}
        {sent && (
          <div style={{ alignSelf: 'flex-end', maxWidth: '82%', animation: 'kuopasSlideIn 0.3s ease both' }}>
            <div style={{ padding: '11px 15px', borderRadius: '16px', borderBottomRightRadius: '4px', fontSize: '14px', lineHeight: 1.4, background: GREEN, color: '#fff' }}>
              Sounds good, thanks!
            </div>
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: '#fff', borderTop: '1px solid #eee' }}>
        <div style={{ flex: 1, height: '38px', borderRadius: '999px', border: '1px solid #ddd', display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: '13.5px', color: '#333', background: CHAT_BG }}>
          {typing || sent ? replyText : <span style={{ color: '#aaa' }}>Reply&hellip;</span>}
          {typing && <BlinkCaret color={GREEN} />}
        </div>
        <SendButton pressed={step === 5} />
      </div>
    </>
  );
}

const NOTICE_CURSOR = [
  { top: 340, left: 400, opacity: 0 },
  { top: 340, left: 400, opacity: 0 },
  { top: 320, left: 150, opacity: 1 },
  { top: 320, left: 150, opacity: 1 },
  { top: 320, left: 150, opacity: 1 },
  { top: 320, left: 430, opacity: 1 },
  { top: 320, left: 430, opacity: 0 },
];

/* ---------- shared week-grid booking chapter ---------- */

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DAY_DATES = [14, 15, 16, 17, 18];

function WeekGrid({
  title,
  hours,
  targetDay,
  targetHour,
  picked,
  confirmed,
}: {
  title: string;
  hours: string[];
  targetDay: number;
  targetHour: number;
  picked: boolean;
  confirmed: boolean;
}) {
  return (
    <>
      <AppTopBar title={title} />
      <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '12.5px', color: '#888', marginBottom: '14px' }}>This week · {BUILDING}</div>
        <div style={{ display: 'grid', gridTemplateColumns: `52px repeat(${DAY_LABELS.length}, 1fr)`, gap: '5px', flex: 1 }}>
          <div />
          {DAY_LABELS.map((day, i) => (
            <div key={day} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, color: '#888' }}>
              {day}
              <div style={{ fontSize: '10px', fontWeight: 400, color: '#bbb' }}>{DAY_DATES[i]}</div>
            </div>
          ))}
          {hours.map((hour, hourIdx) => (
            <Fragment key={hour}>
              <div style={{ fontSize: '11.5px', color: '#888', display: 'flex', alignItems: 'center' }}>
                {hour}
              </div>
              {DAY_LABELS.map((_, dayIdx) => {
                const isTarget = dayIdx === targetDay && hourIdx === targetHour;
                const isMine = isTarget && confirmed;
                const isSelected = isTarget && picked && !confirmed;
                return (
                  <div
                    key={`${hour}-${dayIdx}`}
                    style={{
                      borderRadius: '7px',
                      minHeight: '30px',
                      border: isSelected ? `1.5px solid ${GREEN}` : '1px dashed #e2e2de',
                      background: isMine ? GREEN : isSelected ? GREEN_SOFT : '#fafaf9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: isMine ? '#fff' : GREEN,
                      transition: 'all 0.2s',
                      boxShadow: isSelected ? `0 0 0 3px ${GREEN_BORDER}` : 'none',
                    }}
                  >
                    {isMine ? 'You' : ''}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </>
  );
}

function SpotGrid({ title, targetIndex, picked, confirmed }: { title: string; targetIndex: number; picked: boolean; confirmed: boolean }) {
  const spots = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
  const takenByOther = new Set([1, 4]);

  return (
    <>
      <AppTopBar title={title} />
      <div style={{ padding: '18px 20px', flex: 1 }}>
        <div style={{ fontSize: '12.5px', color: '#888', marginBottom: '16px' }}>One spot per tenant · {BUILDING}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {spots.map((label, i) => {
            const isTarget = i === targetIndex;
            const isMine = isTarget && confirmed;
            const isSelected = isTarget && picked && !confirmed;
            const taken = takenByOther.has(i);
            return (
              <div
                key={label}
                style={{
                  borderRadius: '10px',
                  padding: '14px 8px',
                  textAlign: 'center',
                  border: `1.5px solid ${isMine ? GREEN : isSelected ? GREEN : taken ? '#eee' : '#ddd'}`,
                  background: isMine ? GREEN : isSelected ? GREEN_SOFT : taken ? '#f5f5f3' : '#fafaf9',
                  transition: 'all 0.2s',
                  boxShadow: isSelected ? `0 0 0 3px ${GREEN_BORDER}` : 'none',
                }}
              >
                <div style={{ fontSize: '15px', fontWeight: 800, color: isMine ? '#fff' : taken ? '#bbb' : '#333' }}>{label}</div>
                <div style={{ fontSize: '10px', marginTop: '3px', color: isMine ? '#fff' : taken ? '#bbb' : '#999' }}>
                  {isMine ? 'Your spot' : taken ? 'Taken' : 'Free'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function ConfirmBar({ picked, confirmed }: { picked: boolean; confirmed: boolean }) {
  return (
    <div style={{ padding: '0 20px 20px' }}>
      <div
        style={{
          background: GREEN,
          borderRadius: '10px',
          padding: '13px',
          textAlign: 'center',
          color: '#fff',
          fontSize: '14px',
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

/* ---------- Chapter 4: sauna ---------- */

const SAUNA_HOURS = ['16:00', '18:00', '20:00'];
const SAUNA_DELAYS = [500, 900, 900, 1600, 2200];

function SaunaChapter({ step }: { step: number }) {
  const picked = step >= 2;
  const confirmed = step >= 3;
  return (
    <>
      <WeekGrid title="Sauna" hours={SAUNA_HOURS} targetDay={2} targetHour={1} picked={picked} confirmed={confirmed} />
      <ConfirmBar picked={picked} confirmed={confirmed} />
    </>
  );
}

const SAUNA_CURSOR = [
  { top: 340, left: 300, opacity: 0 },
  { top: 130, left: 300, opacity: 1 },
  { top: 190, left: 300, opacity: 1 },
  { top: 340, left: 300, opacity: 1 },
  { top: 340, left: 300, opacity: 0.3 },
];

/* ---------- Chapter 5: laundry ---------- */

const LAUNDRY_HOURS = ['08:00', '10:00', '12:00', '14:00', '16:00'];
const LAUNDRY_DELAYS = [500, 900, 900, 1600, 2200];

function LaundryChapter({ step }: { step: number }) {
  const picked = step >= 2;
  const confirmed = step >= 3;
  return (
    <>
      <WeekGrid title="Laundry" hours={LAUNDRY_HOURS} targetDay={1} targetHour={2} picked={picked} confirmed={confirmed} />
      <ConfirmBar picked={picked} confirmed={confirmed} />
    </>
  );
}

const LAUNDRY_CURSOR = [
  { top: 340, left: 220, opacity: 0 },
  { top: 130, left: 220, opacity: 1 },
  { top: 220, left: 220, opacity: 1 },
  { top: 340, left: 220, opacity: 1 },
  { top: 340, left: 220, opacity: 0.3 },
];

/* ---------- Chapter 6: parking ---------- */

const PARKING_DELAYS = [500, 900, 900, 1600, 2400];

function ParkingChapter({ step }: { step: number }) {
  const picked = step >= 2;
  const confirmed = step >= 3;
  return (
    <>
      <SpotGrid title="Parking" targetIndex={2} picked={picked} confirmed={confirmed} />
      <ConfirmBar picked={picked} confirmed={confirmed} />
    </>
  );
}

const PARKING_CURSOR = [
  { top: 340, left: 300, opacity: 0 },
  { top: 130, left: 400, opacity: 1 },
  { top: 130, left: 400, opacity: 1 },
  { top: 340, left: 300, opacity: 1 },
  { top: 340, left: 300, opacity: 0.3 },
];

/* ---------- chapter registry ---------- */

const CHAPTERS = [
  { name: 'Move-in guide', sidebarKey: 'guide', delays: GUIDE_DELAYS, cursor: GUIDE_CURSOR, render: (s: number) => <GuideChapter step={s} /> },
  { name: 'Apartment chat', sidebarKey: 'chat', delays: CHAT_DELAYS, cursor: CHAT_CURSOR, render: (s: number) => <ChatChapter step={s} /> },
  { name: 'Message Kuopas', sidebarKey: 'messages', delays: NOTICE_DELAYS, cursor: NOTICE_CURSOR, render: (s: number) => <NoticeChapter step={s} /> },
  { name: 'Sauna', sidebarKey: 'sauna', delays: SAUNA_DELAYS, cursor: SAUNA_CURSOR, render: (s: number) => <SaunaChapter step={s} /> },
  { name: 'Laundry', sidebarKey: 'laundry', delays: LAUNDRY_DELAYS, cursor: LAUNDRY_CURSOR, render: (s: number) => <LaundryChapter step={s} /> },
  { name: 'Parking', sidebarKey: 'parking', delays: PARKING_DELAYS, cursor: PARKING_CURSOR, render: (s: number) => <ParkingChapter step={s} /> },
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
        maxWidth: '980px',
        margin: '0 auto',
        background: '#fff',
        border: '1px solid #e8e8e3',
        borderRadius: '32px',
        padding: '36px',
        boxShadow: '0 0 140px -20px rgba(4,106,56,0.32), 0 4px 34px rgba(0,0,0,0.07)',
      }}
    >
      <div style={{ height: '640px' }}>
        <FixedDemoFrame>
          <div style={{ position: 'relative', width: '740px', flexShrink: 0 }}>
            <div style={{ background: '#fff', border: '1px solid #e0e0dc', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 34px 90px rgba(0,0,0,0.16)' }}>
              <BrowserChrome url="kuopas.fi/app" />
              <div style={{ display: 'flex', height: '580px' }}>
                <AppSidebar activeKey={chapter.sidebarKey} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>{chapter.render(step)}</div>
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
        @keyframes kuopasBlinkCaret { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }
        @keyframes kuopasSlideIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
}
