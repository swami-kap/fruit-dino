import { SPIN_MS, segmentAngle, segmentCenterAngle, segmentStartAngle } from '../game/logic.js'
import { FruitIcon, MeatIcon } from './icons.jsx'

const MEAT_COLOR = '#ffcf8a'
const FRUIT_COLOR = '#7ddc6f'
const ITEM_RADIUS = 0.34 // fraction of the wheel size

// Thin white divider centred on each segment boundary, over the two-colour fill.
function wheelBackground(fruitIndex, count) {
  const size = segmentAngle(count)
  const dividers = `repeating-conic-gradient(from -1deg, #fff 0deg 2deg, transparent 2deg ${size}deg)`
  const fill = Array.from({ length: count }, (_, i) => {
    const color = i === fruitIndex ? FRUIT_COLOR : MEAT_COLOR
    return `${color} ${segmentStartAngle(i, count)}deg ${segmentStartAngle(i, count) + size}deg`
  }).join(', ')
  return `${dividers}, conic-gradient(${fill})`
}

// Shrink the icons when slices get narrow so they never overlap their neighbours.
function itemScale(count) {
  return Math.min(0.15, (0.55 * 2 * Math.PI * ITEM_RADIUS) / count)
}

export default function Wheel({ angle, phase, fruitIndex, targetIndex, segmentCount, onSpinEnd }) {
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
          background: wheelBackground(fruitIndex, segmentCount),
          transform: `rotate(${angle}deg)`,
          transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)` : 'none',
          '--item-size': `calc(var(--wheel-size) * ${itemScale(segmentCount)})`,
        }}
        onTransitionEnd={handleTransitionEnd}
        data-testid="wheel"
      >
        {Array.from({ length: segmentCount }, (_, i) => (
          <span
            key={i}
            className="wheel__slot"
            style={{
              transform: `translate(-50%, -50%) rotate(${segmentCenterAngle(i, segmentCount)}deg) translateY(calc(var(--wheel-size) * -${ITEM_RADIUS}))`,
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
              background: `conic-gradient(from ${segmentStartAngle(eatenIndex, segmentCount)}deg, rgba(255,255,255,0.9) 0deg ${segmentAngle(segmentCount)}deg, transparent ${segmentAngle(segmentCount)}deg)`,
            }}
          />
        )}
        <div className="wheel__hub" />
      </div>
    </div>
  )
}
