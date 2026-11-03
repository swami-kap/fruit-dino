// Inline SVG dino, front view, mouth facing the wheel below it.
// mood: 'idle' | 'chomp' | 'cheer' | 'sad'
export default function Dino({ mood }) {
  return (
    <svg
      className={`dino dino--${mood}`}
      viewBox="0 0 220 170"
      role="img"
      aria-label="A hungry dino"
    >
      <g className="dino__body">
        <path className="dino__tail" d="M165 140 Q205 135 212 105 Q190 118 160 118 Z" />
        <ellipse cx="110" cy="142" rx="62" ry="40" fill="#43a047" />
        <ellipse cx="62" cy="140" rx="12" ry="9" fill="#388e3c" />
        <ellipse cx="158" cy="140" rx="12" ry="9" fill="#388e3c" />

        <polygon points="68,34 82,6 98,30" fill="#ff9800" />
        <polygon points="94,28 110,0 126,28" fill="#ffb300" />
        <polygon points="122,30 138,6 152,34" fill="#ff9800" />

        <ellipse cx="110" cy="72" rx="72" ry="52" fill="#66bb6a" stroke="#2e7d32" strokeWidth="4" />
        <ellipse cx="58" cy="88" rx="11" ry="7" fill="#ff8a80" opacity="0.7" />
        <ellipse cx="162" cy="88" rx="11" ry="7" fill="#ff8a80" opacity="0.7" />

        <g className="dino__eyes">
          <ellipse cx="82" cy="56" rx="14" ry="16" fill="#fff" stroke="#2e7d32" strokeWidth="2" />
          <ellipse cx="138" cy="56" rx="14" ry="16" fill="#fff" stroke="#2e7d32" strokeWidth="2" />
          <circle cx="84" cy="62" r="7" fill="#1b1b1b" />
          <circle cx="136" cy="62" r="7" fill="#1b1b1b" />
          <circle cx="86" cy="59" r="2.5" fill="#fff" />
          <circle cx="138" cy="59" r="2.5" fill="#fff" />
        </g>

        <path className="dino__brows" d="M64 46 L96 36 M156 46 L124 36" />
        <path className="dino__tear" d="M72 76 Q66 88 72 92 Q78 88 72 76 Z" />

        <ellipse cx="100" cy="78" rx="3" ry="4" fill="#2e7d32" />
        <ellipse cx="120" cy="78" rx="3" ry="4" fill="#2e7d32" />

        <rect x="70" y="94" width="80" height="44" rx="10" fill="#7f0000" />
        <g className="dino__jaw">
          <ellipse cx="110" cy="114" rx="44" ry="17" fill="#66bb6a" stroke="#2e7d32" strokeWidth="3" />
          <ellipse cx="110" cy="112" rx="20" ry="6" fill="#ff8a80" />
        </g>
        <g fill="#fff" stroke="#e0e0e0" strokeWidth="1">
          <polygon points="78,94 86,108 94,94" />
          <polygon points="100,94 110,110 120,94" />
          <polygon points="126,94 134,108 142,94" />
        </g>
      </g>
    </svg>
  )
}
