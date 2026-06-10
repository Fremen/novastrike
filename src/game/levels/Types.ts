/**
 * NOVASTRIKE — level data types.
 */

import type { CombatScene } from '../enemies/Enemy';
import type { Boss } from '../bosses/Boss';
import type { SongKey } from '../audio/Music';

export type LevelEvent =
  | { at: number; type: 'wave'; spawn: (s: CombatScene) => void }
  | { at: number; type: 'text'; msg: string }
  | { at: number; type: 'miniboss'; spawn: (s: CombatScene) => Boss }
  | { at: number; type: 'boss'; spawn: (s: CombatScene) => Boss };

export interface LevelDef {
  name: string;
  /** index into TextureFactory.THEMES */
  theme: number;
  song: SongKey;
  events: LevelEvent[];
}

/** what the director needs from the scene that hosts it */
export interface DirectorHost extends CombatScene {
  startMiniboss(spawn: (s: CombatScene) => Boss): void;
  startEndBoss(spawn: (s: CombatScene) => Boss): void;
  showBanner(msg: string, ms?: number): void;
}
