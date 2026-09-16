# NOVASTRIKE

A browser game by [Dave Fleming](https://www.linkedin.com/in/davejfleming): a hands-on project combining interactive software, procedural graphics and synthesised audio.

**[Play in your browser](https://fremen.github.io/novastrike/)** · [Explore the source](src/) · [Build and deployment workflow](.github/workflows/deploy.yml)

## Engineering highlights

- **TypeScript, Phaser 3 and Vite:** scene-based gameplay with separate systems for weapons, enemies, levels and audio.
- **Procedural assets:** palette-indexed sprites, bitmap fonts and layered backgrounds generated from source.
- **Web Audio:** a four-channel tracker synthesises the soundtrack in the browser.
- **Iteration:** balancing parameters and scripted waves are kept separate from the game engine.
- **Browser delivery:** no backend; local high scores use browser storage.

This is a personal game project, not evidence of enterprise production scale. The code and build instructions below make the implementation inspectable.

## The game

A complete Amiga-style side-scrolling shoot-'em-up in the spirit of
**Project-X, Apidya, R-Type and Xenon 2** — built with TypeScript,
Phaser 3 and Vite. Runs entirely in the browser, no backend.

Every asset is generated at runtime from source: the 32-colour AGA-style
sprite sheet is authored as palette-indexed pixel maps, the 5x7 bitmap font
is glyph bitmask data, the five-layer parallax backdrops are painted
procedurally per level theme, and the soundtrack is a 4-channel tracker
synthesised through the Web Audio API. Zero downloads, pure 1992.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

Production build:

```bash
npm run build      # type-checks, then bundles to dist/
npm run preview    # serve the production build locally
```

Regenerate the reference sprite sheet PNG (written to `assets/spritesheet.png`):

```bash
npm run spritesheet
```

## Controls

| Input | Action |
| --- | --- |
| Arrow keys / WASD / gamepad stick | 8-way movement |
| SPACE / Z / gamepad A / R2 | Fire (hold) |
| X / gamepad B | Smart bomb |
| A | Toggle auto-fire (on by default) |
| P | Pause |
| C | CRT scanline overlay on/off |
| M | Mute |
| ESC | Quit to title |

Title & menus: up/down + fire. High-score initials: up/down cycles letters,
left/right moves slot, fire confirms.

## Game structure

- **Arcade mode** — three stages, each with scripted waves, a mid-stage
  mini-boss and a multi-phase end boss:
  1. **Asteroid Field** — splitting asteroids, turrets, gunships ·
     mini-boss *Drill Carrier* · boss **Core Crusher**
  2. **Alien Planet** — drone snakes, kamikaze spores, shielded elites ·
     mini-boss *Spore Bulb* · boss **Hive Queen**
  3. **Space Fortress** — heavy emplacements · mini-boss *Twin Sentry* ·
     boss **Fortress Core** (destroy the four wall guns to expose the core)
- **Survival mode** — endless generated waves with escalating difficulty
  and periodic mini-bosses; score trickles for staying alive.

End bosses carry body armour — hits on the glowing **eye core do full
damage**. Smart bombs clear the screen and chunk boss HP by percentage.

### Weapons (stacking upgrades)

One global weapon level (1–4). Typed chips switch weapons; collecting the
chip of your current weapon — or a **U** chip — levels it up. Dying costs
two levels.

| Chip | Weapon |
| --- | --- |
| U | Level up |
| S | Spread shot (3–6 way) |
| P | Plasma cannon (piercing orbs) |
| H | Homing missiles (2–4 per volley) |
| B | Beam (continuous full-width ray) |
| L | Lightning (chains between targets) |
| E | Shield recharge · **1** extra life · **X** smart bomb · **I** invincibility star |

Extra life every 50,000 points. Stage-clear bonuses for banked bombs and
lives. Top-10 high scores persist in `localStorage`.

## Architecture

```
src/
  main.ts                     Phaser config, scene list, focus handling
  game/
    config/Balance.ts         every tunable number in the game
    assets/
      Palette.ts              the 32-colour master palette
      PixelFont.ts            5x7 glyph bitmask font
      Sprites.ts              pixel-map sprite source (+ recipe-built bosses)
      TextureFactory.ts       runtime sprite-sheet packer, RetroFont,
                              procedural parallax/CRT textures
    audio/
      Sfx.ts                  Web Audio synthesised effects
      Music.ts                4-channel tracker (title/level/boss songs)
    entities/                 Player, pooled Bullets, PowerUp
    weapons/Weapons.ts        the six-weapon system (beam, lightning, ...)
    enemies/
      Patterns.ts             aimed / fan / ring / spiral / rain patterns
      Enemy.ts                base class + all regular enemy factories
    bosses/
      Boss.ts                 phases, armour, weak points, death chain
      MiniBosses.ts           Drill Carrier, Spore Bulb, Twin Sentry
      EndBosses.ts            Core Crusher, Hive Queen, Fortress Core
    effects/                  Explosions, 5-layer Parallax, CRT overlay
    levels/                   level types, wave scripts, WaveDirector
    ui/Hud.ts                 HUD scene (score, lives, boss bar, pause)
    scenes/                   Boot, Title, Game, GameOver
    systems/HighScores.ts     localStorage table
scripts/export-spritesheet.ts node renderer for the reference PNG
```

## Balancing guide

Everything lives in **`src/game/config/Balance.ts`** — change values and
refresh:

- `PLAYER` — speed, hitbox, lives, bombs, shield, respawn/invuln timings,
  death weapon penalty, 1UP interval.
- `WEAPONS` / `LIGHTNING` / `BEAM` / `HOMING` — per-level fire delays,
  damage tables, chain counts.
- `ENEMIES` — hp / score / speed / fire delay / crash damage / drop chance
  per enemy type; `ELITE_SHIELD`, `KAMIKAZE` lock + dash.
- `MINIBOSS` / `BOSS` — hp, score, body armour, warning timings.
- `POWERUP.table` — weighted drop odds per chip.
- `DIFFICULTY` — the global ramp: how hp/speed/fire-rate/bullet-speed scale
  with level base + elapsed time (survival ramps faster, capped at `cap`).
- `SCROLL` — world speed, per-layer parallax multipliers, boss slowdown.

Wave timing lives in `src/game/levels/Levels.ts` — each level is a readable
list of `(time, spawn)` events.

## Notes & roadmap

- Collision uses tight core hitboxes (player core is 10x5 px) for classic
  shmup fairness; pixel-perfect masks weren't needed at this resolution.
- Gamepad is supported for play; menus also accept pad A/d-pad.
- Natural extensions: two-player co-op (second Player + input map),
  achievements, and input-log replays — the scene/event architecture was
  laid out so these bolt on without restructuring.
