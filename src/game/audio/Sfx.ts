/**
 * NOVASTRIKE — sound synth.
 *
 * Every effect is synthesised with the Web Audio API — square/saw sweeps and
 * filtered noise, the way an Amiga soundchip would fake it. No audio files.
 * The shared AudioContext is created lazily and resumed on first user input.
 */

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  muted = false;

  /** call from any user-gesture handler */
  unlock(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      // 1s of white noise, reused by every noise-based effect
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx)
      this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.02);
  }

  get audioContext(): AudioContext | null {
    return this.ctx;
  }
  get masterGain(): GainNode | null {
    return this.master;
  }

  /* ----------------------------- helpers ----------------------------- */

  private tone(
    type: OscillatorType,
    f0: number,
    f1: number,
    dur: number,
    vol: number,
    delay = 0,
  ) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, fc0: number, fc1: number, delay = 0) {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(fc0, t);
    filt.frequency.exponentialRampToValueAtTime(Math.max(40, fc1), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filt).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  /* ----------------------------- effects ----------------------------- */

  shoot(kind: 'laser' | 'spread' | 'plasma' | 'homing' | 'lightning') {
    switch (kind) {
      case 'laser':
        this.tone('square', 920, 240, 0.09, 0.1);
        break;
      case 'spread':
        this.tone('square', 700, 330, 0.08, 0.09);
        this.tone('square', 540, 260, 0.08, 0.06, 0.012);
        break;
      case 'plasma':
        this.tone('sawtooth', 160, 60, 0.22, 0.16);
        this.tone('square', 320, 110, 0.18, 0.07);
        break;
      case 'homing':
        this.noise(0.18, 0.12, 3200, 700);
        this.tone('square', 480, 180, 0.14, 0.05);
        break;
      case 'lightning':
        this.noise(0.12, 0.16, 7000, 2000);
        this.tone('sawtooth', 1400, 200, 0.12, 0.08);
        break;
    }
  }

  beamLoopTick() {
    this.tone('sawtooth', 70 + Math.random() * 12, 70, 0.06, 0.05);
  }

  explosion(big = false) {
    if (big) {
      this.noise(0.7, 0.4, 1400, 80);
      this.tone('triangle', 130, 28, 0.6, 0.3);
      this.noise(0.35, 0.2, 4000, 300, 0.04);
    } else {
      this.noise(0.3, 0.26, 2200, 150);
      this.tone('triangle', 200, 50, 0.2, 0.16);
    }
  }

  hit() {
    this.noise(0.05, 0.1, 3500, 1200);
  }

  shieldHit() {
    this.tone('square', 300, 90, 0.18, 0.2);
    this.noise(0.12, 0.12, 1800, 400);
  }

  powerup() {
    this.tone('square', 440, 440, 0.06, 0.14);
    this.tone('square', 660, 660, 0.06, 0.14, 0.07);
    this.tone('square', 880, 880, 0.1, 0.14, 0.14);
  }

  extraLife() {
    const seq = [523, 659, 784, 1047, 784, 1047];
    seq.forEach((f, i) => this.tone('square', f, f, 0.1, 0.13, i * 0.09));
  }

  smartBomb() {
    this.noise(1.0, 0.4, 600, 8000);
    this.tone('sawtooth', 60, 700, 0.5, 0.2);
    this.tone('triangle', 100, 24, 0.9, 0.25, 0.1);
  }

  /** boss warning siren — two alternating tones */
  siren() {
    for (let i = 0; i < 4; i++) {
      this.tone('square', 740, 740, 0.22, 0.12, i * 0.5);
      this.tone('square', 524, 524, 0.22, 0.12, i * 0.5 + 0.25);
    }
  }

  bossDeath() {
    for (let i = 0; i < 7; i++) {
      this.noise(0.4, 0.3, 1800, 100, i * 0.16);
      this.tone('triangle', 160 - i * 14, 30, 0.35, 0.2, i * 0.16);
    }
  }

  playerDeath() {
    this.noise(0.8, 0.4, 2600, 60);
    this.tone('sawtooth', 400, 30, 0.7, 0.25);
  }

  uiMove() {
    this.tone('square', 600, 600, 0.04, 0.08);
  }

  uiSelect() {
    this.tone('square', 520, 1040, 0.12, 0.12);
  }

  levelClear() {
    const seq = [392, 523, 659, 784, 659, 784, 1047];
    seq.forEach((f, i) => this.tone('square', f, f, 0.12, 0.12, i * 0.11));
  }
}

export const sfx = new Sfx();
