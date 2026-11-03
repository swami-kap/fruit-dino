import { SEGMENT_ANGLE, SEGMENT_COUNT, SPIN_MS, segmentCenterAngle, segmentStartAngle } from '../game/logic.js'
import { FruitIcon, MeatIcon } from './icons.jsx'

const MEAT_COLOR = '#ffcf8a'
const FRUIT_COLOR = '#7ddc6f'

// Thin white divider centred on each segment boundary, over the two-colour fill.
const DIVIDERS = `repeating-conic-gradient(from -1deg, #fff 0deg 2deg, transparent 2deg ${SEGMENT_ANGLE}deg)`

function wheelBackground(fruitIndex) {
  const fill = Array.from({ length: SEGMENT_COUNT }, (_, i) => {
    const color = i === fruitIndex ? FRUIT_COLOR : MEAT_COLOR
    return `${color} ${segmentStartAngle(i)}deg ${segmentStartAngle(i) + SEGMENT_ANGLE}deg`
  }).join(', ')
  return `${DIVIDERS}, conic-gradient(${fill})`
}

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
          background: wheelBackground(fruitIndex),
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
            <span className={`wheel__item${eatenIndex === i && phase === 'eating' ? ' is-eaten' : ''}${
              phase === 'won' && i === fruitIndex ? ' is-gone' : ''
            }`}>
              {i === fruitIndex ? <FruitIcon /> : <MeatIcon />}
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
