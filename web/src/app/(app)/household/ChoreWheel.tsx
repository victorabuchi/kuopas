'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  names: string[];
  currentIndex: number;
  size?: number;
};

const COLORS = ['#046a38', '#84bd00', '#2e8b57', '#598000', '#3a9a5b', '#a6c93c'];

function polar(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

// The wheel shows everyone in the rotation. It turns so the person who is up
// next sits under the pointer, and it spins a couple of extra times when the
// turn passes to the next person.
export default function ChoreWheel({ names, currentIndex, size = 190 }: Props) {
  const count = Math.max(names.length, 1);
  const segment = 360 / count;
  const target = -(currentIndex * segment + segment / 2);
  const [rotation, setRotation] = useState(target);
  const previous = useRef(currentIndex);

  useEffect(() => {
    if (previous.current === currentIndex) return;
    const forward = (currentIndex - previous.current + count) % count;
    setRotation((r) => r - forward * segment - 360 * 2);
    previous.current = currentIndex;
  }, [currentIndex, count, segment]);

  const c = size / 2;
  const radius = size / 2 - 6;

  return (
    <svg width={size} height={size + 14} viewBox={`0 -14 ${size} ${size + 14}`} role="img" aria-label={names[currentIndex] ?? ''}>
      <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: `${c}px ${c}px`, transition: 'transform 1.4s cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
        {names.map((name, i) => {
          const start = i * segment;
          const end = start + segment;
          const [x1, y1] = polar(c, c, radius, start);
          const [x2, y2] = polar(c, c, radius, end);
          const [tx, ty] = polar(c, c, radius * 0.62, start + segment / 2);
          const large = segment > 180 ? 1 : 0;
          const path = count === 1 ? '' : `M ${c} ${c} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
          const label = name.length > 9 ? `${name.slice(0, 8)}.` : name;
          return (
            <g key={`${name}-${i}`}>
              {count === 1 ? (
                <circle cx={c} cy={c} r={radius} fill={COLORS[0]} />
              ) : (
                <path d={path} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth="2" opacity={i === currentIndex ? 1 : 0.72} />
              )}
              <text
                x={tx}
                y={ty}
                fill="#fff"
                fontSize="11"
                fontWeight="700"
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${start + segment / 2} ${tx} ${ty})`}
              >
                {label}
              </text>
            </g>
          );
        })}
      </g>
      <circle cx={c} cy={c} r="14" fill="#fff" stroke="#e7e7e7" />
      <path d={`M ${c - 9} -12 L ${c + 9} -12 L ${c} 8 Z`} fill="#b3261e" />
    </svg>
  );
}
