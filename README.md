# Fruit Dino

A spin-wheel game. A hungry dino sits at the top of the wheel. Set the power, spin, and the dino eats whatever lands in front of its mouth. Seven segments are meat, one is fruit. Eat the fruit to win.

## Run

```
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests (Vitest)
npm run build    # production build
```

## Rules

- A power meter sweeps 1 to 100 and back every 2 seconds. Click **STOP!** to lock the value.
- The wheel spins and the dino eats the segment in front of it.
- Meat grows back and you try again. Attempts are unlimited and counted.
- Eating the fruit wins. Passing over the fruit mid-spin does not count.
- The wheel angle is cumulative. Each spin starts where the last one stopped.
- The fruit position is random and fixed until the game is won. **Play again** resets everything.

## How power maps to the spin

Set by `DEFAULT_SPIN_MODE` in `src/game/logic.js`.

| Mode | Rotation per spin | Effect |
|---|---|---|
| `power-landing` (default) | `3 full turns + power × 3.6°` | Every spin looks the same. Power only decides where it stops: 50 power shifts the stop by 180°, 100 power by a full 360° (back to the same spot). |
| `linear` | `power × 7.2°` | Spin length follows power: 50 power is one full turn, 100 power is two. Power `p` and `p + 50` land on the same segment. |

The spin animation always takes 3 seconds, so in `linear` mode a high power just spins faster.

## Which segment is eaten

Segment 0 starts at 12 o'clock and segments run clockwise, 45° each. For a total rotation `angle`, the segment in front of the dino is:

```
floor(((360 - (angle mod 360)) mod 360) / 45)
```

A stop exactly on a boundary belongs to the later segment.

## Game states

`idle` (meter running) → `spinning` (wheel turning) → `eating` (dino chomps) → back to `idle`, or `won` on the fruit.

## Code layout

- `src/game/logic.js`: pure functions for spin math, segment lookup and the meter.
- `src/game/reducer.js`: the game state machine.
- `src/components/`: `Wheel`, `Dino`, `PowerMeter`, `Result`, `Confetti`, `icons`.
- `src/game/*.test.js`: unit tests for the logic and reducer.
