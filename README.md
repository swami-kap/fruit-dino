# Fruit Dino

A spin-wheel game. A hungry dino sits at the top of the wheel. Set the power, spin, and the dino eats whatever lands in front of its mouth. Seven segments are meat, one is fruit. Eat the fruit to win.

## Run

```
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests (Vitest)
npm run build    # production build
```

## Difficulty

The game opens on a setup screen. Pick a mode, set the attempt limit (Medium and Hard only) and click **Play game**. Harder modes add slices (a smaller fruit target), speed up the power meter, and limit attempts.

| Mode | Slices | Meter sweep | Fruit hit chance | Attempt limit (prefilled) |
|---|---|---|---|---|
| Easy | 6 | 3 s | 1 in 6 | Unlimited |
| Medium (default) | 8 | 2 s | 1 in 8 | 6 |
| Hard | 12 | 1 s | 1 in 12 | 5 |

- The limit must be a whole number from 1 to 20 (`MIN_ATTEMPT_LIMIT` and `MAX_ATTEMPT_LIMIT` in `src/game/logic.js`). Play game is disabled until it is valid.
- Switching mode on the setup screen refills the limit with that mode's default.
- The **Settings** button in the game (disabled while the wheel is spinning or the dino is eating) returns to the setup screen with the current settings prefilled. Starting a game from there resets everything.
- Slices, meter speed and default limits live in `DIFFICULTIES` in `src/game/logic.js`.

## Rules

- A power meter sweeps 1 to 100 and back (sweep time depends on difficulty). Click **STOP!** to lock the value.
- The wheel spins and the dino eats the segment in front of it.
- Meat grows back and you try again. Attempts are counted (`2 / 6` on limited modes). Easy has no limit.
- Eating the fruit wins, even on your last attempt. Passing over the fruit mid-spin does not count.
- On Medium and Hard, using every attempt without eating the fruit loses the game.
- The wheel angle is cumulative. Each spin starts where the last one stopped.
- The fruit position is random and fixed until the game is won. **Play again** (after a win or a loss) resets everything and keeps the same mode and limit.

## How power maps to the spin

Set by `DEFAULT_SPIN_MODE` in `src/game/logic.js`.

| Mode | Rotation per spin | Effect |
|---|---|---|
| `power-landing` (default) | `3 full turns + power × 3.6°` | Every spin looks the same. Power only decides where it stops: 50 power shifts the stop by 180°, 100 power by a full 360° (back to the same spot). |
| `linear` | `power × 7.2°` | Spin length follows power: 50 power is one full turn, 100 power is two. Power `p` and `p + 50` land on the same segment. |

The spin animation always takes 3 seconds, so in `linear` mode a high power just spins faster.

## Which segment is eaten

Segment 0 starts at 12 o'clock and segments run clockwise, each `360 / slices` degrees wide (45° on Medium). For a total rotation `angle`, the segment in front of the dino is:

```
floor(((360 - (angle mod 360)) mod 360) / (360 / slices))
```

A stop exactly on a boundary belongs to the later segment.

## Scoreboard

- Enter your name (1 to 20 characters, remembered in the browser) on the setup screen.
- Every finished game (win or loss) saves one record: name, mode, attempts used, attempt limit, result, time.
- **Scoreboard** (setup screen and in-game) shows the top 10 per mode: one best win per player (fewest attempts, earliest win on a tie), plus games played.
- Only wins at the mode's default attempt limit are ranked. Games with a changed limit are saved and counted, not ranked.
- Records are currently stored in this browser (`localStorage`). `src/game/scoreStore.js` has the `list()` and `add(record)` interface to swap for a shared backend.

### Shared scoreboard (Google Sheet)

By default scores stay in one browser. To share them, deploy `scoreboard-apps-script/Code.gs` as an Apps Script web app on a Google Sheet:

1. Create a Google Sheet, then **Extensions > Apps Script**.
2. Replace the editor contents with `Code.gs`, save, and run `doGet` once to grant access (it creates the `Scores` tab).
3. **Deploy > New deployment > Web app**: execute as **Me**, access **Anyone**. Copy the `/exec` URL.
4. Copy `.env.example` to `.env.local`, set `VITE_SCOREBOARD_URL` to that URL, and restart `npm run dev`.

The endpoint is public and not authenticated: anyone with the URL can read scores or add valid-looking records. After editing the script, use **Deploy > Manage deployments > Edit > New version** so the same URL serves the change.

## Game states

`setup` (settings screen) → `idle` (meter running) → `spinning` (wheel turning) → `eating` (dino chomps) → back to `idle`, `won` on the fruit, or `lost` when the last attempt is used up on meat.

## Code layout

- `src/game/logic.js`: pure functions for spin math, segment lookup and the meter.
- `src/game/reducer.js`: the game state machine.
- `src/game/scores.js`: scoreboard rules (names, records, ranking). `src/game/scoreStore.js`: storage behind `list()` / `add()`.
- `src/components/`: `Wheel`, `Dino`, `PowerMeter`, `SetupScreen`, `DifficultySelect`, `Scoreboard`, `Result`, `Confetti`, `icons`.
- `src/game/*.test.js`: unit tests for the logic and reducer.
