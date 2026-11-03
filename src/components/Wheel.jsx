import { SEGMENT_ANGLE, SEGMENT_COUNT, SPIN_MS, segmentCenterAngle, segmentStartAngle } from '../game/logic.js'

const COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff9f45', '#c77dff', '#00c2a8', '#ff7eb6']

const WHEEL_BACKGROUND = `conic-gradient(${COLORS.map(
  (color, i) => `${color} ${segmentStartAngle(i)}deg ${segmentStartAngle(i) + SEGMENT_ANGLE}deg`,
).join(', ')})`

export default function Wheel({ angle, phase, fruitIndex, targetIndex, onSpinEnd }) {
  const spinning = phase === 'spinning'
  // The segment the dino is chewing, or has just eaten the fruit from.
  const eatenIndex = phase === 'eating' || phase === 'won' ? targetIndex : null

  const handleTransitionEnd = (e) => {
    if (e.target !== e.currentTarget || e.propertyName !== 'transform') return
    onSpinEnd()
  }

  return (
    <div className="wheel-frame">
      <div
        className="wheel"
        style={{
          background: WHEEL_BACKGROUND,
          transform: `rotate(${angle}deg)`,
          transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)` : 'none',
        }}
        onTransitionEnd={handleTransitionEnd}
        data-testid="wheel"
      >
        {Array.from({ length: SEGMENT_COUNT }, (_, i) => (
          <span
            key={i}
            className="wheel__slot"
            style={{
              transform: `translate(-50%, -50%) rotate(${segmentCenterAngle(i)}deg) translateY(calc(var(--wheel-size) * -0.34))`,
            }}
          >
            <span className={`wheel__emoji${eatenIndex === i && phase === 'eating' ? ' is-eaten' : ''}${
              phase === 'won' && i === fruitIndex ? ' is-gone' : ''
            }`}>
              {i === fruitIndex ? '🍎' : '🥩'}
            </span>
          </span>
        ))}

        {eatenIndex !== null && phase === 'eating' && (
          <div
            className="wheel__bite"
            style={{
              background: `conic-gradient(from ${segmentStartAngle(eatenIndex)}deg, rgba(255,255,255,0.9) 0deg ${SEGMENT_ANGLE}deg, transparent ${SEGMENT_ANGLE}deg)`,
            }}
          />
        )}
        <div className="wheel__hub" />
      </div>
    </div>
  )
}
