// Inline SVG art for the wheel items (no image files needed).

export function MeatIcon() {
  return (
    <svg viewBox="0 0 100 100" aria-label="meat" role="img">
      <g transform="rotate(-35 50 50)">
        <rect x="44" y="52" width="12" height="40" rx="5" fill="#fff8e7" stroke="#8a6d3b" strokeWidth="3" />
        <circle cx="42" cy="92" r="8" fill="#fff8e7" stroke="#8a6d3b" strokeWidth="3" />
        <circle cx="58" cy="92" r="8" fill="#fff8e7" stroke="#8a6d3b" strokeWidth="3" />
        <ellipse cx="50" cy="36" rx="30" ry="32" fill="#a0522d" stroke="#5d2e12" strokeWidth="4" />
        <ellipse cx="40" cy="24" rx="10" ry="7" fill="#c9784a" />
      </g>
    </svg>
  )
}

export function FruitIcon() {
  return (
    <svg viewBox="0 0 100 100" aria-label="fruit" role="img">
      <path d="M50 24 Q52 12 60 8" fill="none" stroke="#5d4037" strokeWidth="5" strokeLinecap="round" />
      <path d="M56 18 Q74 6 84 20 Q68 30 56 18 Z" fill="#2e7d32" stroke="#1b5e20" strokeWidth="2" />
      <path
        d="M50 28 C36 18 12 26 12 54 C12 78 32 94 50 88 C68 94 88 78 88 54 C88 26 64 18 50 28 Z"
        fill="#e53935"
        stroke="#8e1b1b"
        strokeWidth="4"
      />
      <ellipse cx="34" cy="50" rx="7" ry="12" fill="#ff8a80" opacity="0.8" transform="rotate(20 34 50)" />
    </svg>
  )
}
