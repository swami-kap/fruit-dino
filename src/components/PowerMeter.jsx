import { useEffect, useRef, useState } from 'react'
import { MIN_POWER, meterValueAt } from '../game/logic.js'

export default function PowerMeter({ active, periodMs, onStop }) {
  const [value, setValue] = useState(MIN_POWER)
  const startRef = useRef(0)

  useEffect(() => {
    if (!active) return undefined
    startRef.current = performance.now()
    let frame
    const tick = (now) => {
      setValue(meterValueAt(now - startRef.current, periodMs))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active, periodMs])

  const handleStop = () => {
    if (!active) return
    const locked = meterValueAt(performance.now() - startRef.current, periodMs)
    setValue(locked)
    onStop(locked)
  }

  return (
    <div className="meter">
      <div className="meter__label">
        Power <strong data-testid="power-value">{value}</strong>
      </div>
      <div className="meter__track">
        <div className="meter__fill" style={{ width: `${value}%` }} />
      </div>
      <button className="btn btn--stop" onClick={handleStop} disabled={!active}>
        STOP!
      </button>
    </div>
  )
}
