/**
 * NOVASTRIKE — wave director.
 *
 * Advances a level clock and dispatches events in order. The clock holds
 * while a mini-boss or end boss is alive; survival mode generates new event
 * batches forever.
 */

import { DirectorHost, LevelDef, LevelEvent } from './Types';
import { survivalBatch } from './Levels';

export class WaveDirector {
  private clock = 0;
  private idx = 0;
  private events: LevelEvent[];
  private holding = false;
  /** true once the end-boss event has been dispatched */
  bossDispatched = false;
  private survival: boolean;
  private batch = 0;

  constructor(
    private host: DirectorHost,
    def: LevelDef | null,
  ) {
    this.survival = def === null;
    this.events = def ? def.events.slice() : survivalBatch(2, 0);
  }

  hold(): void {
    this.holding = true;
  }

  resume(): void {
    this.holding = false;
  }

  update(deltaMs: number): void {
    if (this.holding || this.bossDispatched) return;
    this.clock += deltaMs / 1000;

    while (this.idx < this.events.length && this.events[this.idx].at <= this.clock) {
      this.dispatch(this.events[this.idx]);
      this.idx++;
      if (this.holding || this.bossDispatched) return;
    }

    // survival regenerates forever
    if (this.survival && this.idx >= this.events.length) {
      this.batch++;
      this.events.push(...survivalBatch(this.clock + 2, this.batch));
    }
  }

  private dispatch(ev: LevelEvent): void {
    switch (ev.type) {
      case 'wave':
        ev.spawn(this.host);
        break;
      case 'text':
        this.host.showBanner(ev.msg);
        break;
      case 'miniboss':
        this.hold();
        this.host.startMiniboss(ev.spawn);
        break;
      case 'boss':
        this.bossDispatched = true;
        this.host.startEndBoss(ev.spawn);
        break;
    }
  }
}
