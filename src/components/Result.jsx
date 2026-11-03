export default function Result({ phase, attempts, lastResult, onPlayAgain }) {
  if (phase === 'won') {
    return (
      <div className="result result--won">
        <p className="result__text">
          🎉 You won in {attempts} {attempts === 1 ? 'attempt' : 'attempts'}!
        </p>
        <button className="btn btn--again" onClick={onPlayAgain}>
          Play again
        </button>
      </div>
    )
  }

  if (phase === 'lost') {
    return (
      <div className="result result--lost">
        <p className="result__text">😢 Out of attempts! You lose.</p>
        <button className="btn btn--again" onClick={onPlayAgain}>
          Play again
        </button>
      </div>
    )
  }

  let text = 'Hit STOP to set your power!'
  if (phase === 'spinning') text = 'Spinning...'
  else if (phase === 'eating') text = 'Chomp chomp!'
  else if (lastResult === 'meat') text = 'Yum! Still hungry... find the fruit'

  return (
    <div className="result">
      <p className="result__text">{text}</p>
    </div>
  )
}
