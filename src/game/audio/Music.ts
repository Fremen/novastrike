/**
 * NOVASTRIKE — music engine.
 *
 * A tiny 4-channel tracker in the spirit of a ProTracker MOD:
 *   ch0 bass (square), ch1 lead (pulse-ish saw), ch2 arp chords (square),
 *   ch3 drums (noise hat / sine kick). 16-step patterns, lookahead-scheduled
 *   against the AudioContext clock for rock-solid timing.
 *
 * Songs are tiny data tables; each level has its own key/tempo/riff and the
 * boss song is a faster minor-key hammer.
 */

import { sfx } from './Sfx';

interface Song {
  bpm: number;
  /** semitone offsets from root, -1 = rest; two 16-step bars */
  bass: number[];
  lead: number[];
  arp: number[][]; // chord per beat (4 steps), semitone offsets
  rootHz: number;
  kick: number[]; // steps with a kick
  hat: number[]; // steps with a hat
}

const MINOR = [0, 3, 7, 12];
const SUS = [0, 5, 7, 12];

const SONGS: Record<string, Song> = {
  title: {
    bpm: 112,
    rootHz: 87.31, // F2
    bass: [0, -1, 0, 0, 3, -1, 3, 3, 5, -1, 5, 5, 3, -1, 7, 5,
           0, -1, 0, 0, 3, -1, 3, 3, -2, -1, -2, -2, 0, -1, 0, 0],
    lead: [12, -1, 15, -1, 12, -1, 10, -1, 8, -1, -1, 10, 12, -1, -1, -1,
           12, -1, 15, -1, 17, -1, 15, -1, 12, -1, -1, 10, 8, -1, -1, -1],
    arp: [MINOR, MINOR, SUS, MINOR, MINOR, MINOR, SUS, SUS],
    kick: [0, 4, 8, 12, 16, 20, 24, 28],
    hat: [2, 6, 10, 14, 18, 22, 26, 30],
  },
  level0: {
    bpm: 125,
    rootHz: 98, // G2
    bass: [0, 0, 12, 0, 0, 0, 10, 0, 8, 8, 20, 8, 10, 10, 7, 10,
           0, 0, 12, 0, 0, 0, 10, 0, 5, 5, 17, 5, 7, 7, 10, 12],
    lead: [-1, -1, -1, -1, 12, -1, 15, 17, -1, -1, 20, -1, 19, 17, 15, -1,
           12, -1, -1, 15, -1, 17, -1, -1, 20, 19, 17, 15, 12, -1, 10, -1],
    arp: [MINOR, MINOR, [0, 3, 8, 12], MINOR, SUS, SUS, MINOR, MINOR],
    kick: [0, 4, 8, 10, 12, 16, 20, 24, 26, 28],
    hat: [2, 6, 10, 14, 18, 22, 26, 30],
  },
  level1: {
    bpm: 118,
    rootHz: 82.41, // E2
    bass: [0, -1, 0, 3, 0, -1, 0, 3, 5, -1, 5, 8, 5, -1, 3, 2,
           0, -1, 0, 3, 0, -1, 0, 3, -4, -1, -4, 0, -2, -1, 2, 3],
    lead: [12, 15, 12, -1, 10, 12, 10, -1, 8, -1, 12, -1, 15, -1, 14, -1,
           12, 15, 12, -1, 17, -1, 15, -1, 12, -1, 10, -1, 8, -1, -1, -1],
    arp: [[0, 3, 7, 10], MINOR, [0, 5, 8, 12], MINOR, MINOR, SUS, MINOR, MINOR],
    kick: [0, 6, 8, 14, 16, 22, 24, 30],
    hat: [4, 12, 20, 28, 2, 10, 18, 26],
  },
  level2: {
    bpm: 132,
    rootHz: 73.42, // D2
    bass: [0, 0, 0, 12, 0, 0, 10, 0, 0, 0, 0, 12, 0, 0, 8, 7,
           5, 5, 5, 17, 5, 5, 15, 5, 3, 3, 3, 15, 7, 7, 10, 11],
    lead: [-1, 12, -1, 12, -1, 15, 14, 12, -1, 12, -1, 17, -1, 15, 14, 12,
           -1, 12, -1, 19, -1, 17, 15, 14, 12, -1, 14, -1, 15, -1, 11, -1],
    arp: [MINOR, MINOR, MINOR, [0, 2, 7, 12], MINOR, MINOR, SUS, [0, 4, 7, 11]],
    kick: [0, 3, 8, 11, 16, 19, 24, 27, 30],
    hat: [2, 6, 10, 14, 18, 22, 26, 28, 30],
  },
  boss: {
    bpm: 150,
    rootHz: 65.41, // C2
    bass: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 3, 3, 4, 3,
           0, 0, 1, 0, 0, 0, 1, 0, 6, 6, 7, 6, 5, 5, 4, 1],
    lead: [12, -1, 13, 12, -1, 12, 13, -1, 12, -1, 16, -1, 15, 13, 12, -1,
           12, -1, 13, 12, -1, 12, 13, -1, 18, -1, 17, -1, 16, -1, 13, -1],
    arp: [[0, 1, 7, 12], MINOR, [0, 1, 7, 12], MINOR, [0, 6, 7, 12], MINOR, MINOR, [0, 1, 6, 12]],
    kick: [0, 2, 4, 8, 10, 12, 16, 18, 20, 24, 26, 28],
    hat: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31],
  },
};

export type SongKey = keyof typeof SONGS;

class Music {
  private timer: number | null = null;
  private step = 0;
  private nextTime = 0;
  private song: Song | null = null;
  private gain: GainNode | null = null;
  current: SongKey | null = null;

  play(key: SongKey) {
    const ctx = sfx.audioContext;
    if (!ctx || !sfx.masterGain) return;
    if (this.current === key && this.timer !== null) return;
    this.stop();
    this.current = key;
    this.song = SONGS[key];
    this.gain = ctx.createGain();
    this.gain.gain.value = 0.42;
    this.gain.connect(sfx.masterGain);
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.06;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  stop() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.current = null;
    if (this.gain) {
      const ctx = sfx.audioContext;
      if (ctx) this.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      const g = this.gain;
      window.setTimeout(() => g.disconnect(), 400);
      this.gain = null;
    }
  }

  pause() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  resume() {
    const ctx = sfx.audioContext;
    if (!ctx || !this.song || this.timer !== null || !this.current) return;
    this.nextTime = Math.max(this.nextTime, ctx.currentTime + 0.06);
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  private schedule() {
    const ctx = sfx.audioContext;
    if (!ctx || !this.song || !this.gain) return;
    const stepDur = 60 / this.song.bpm / 4; // 16th notes
    while (this.nextTime < ctx.currentTime + 0.12) {
      this.playStep(ctx, this.step % 32, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step++;
    }
  }

  private note(
    ctx: AudioContext,
    type: OscillatorType,
    freq: number,
    t: number,
    dur: number,
    vol: number,
  ) {
    if (!this.gain) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(this.gain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private playStep(ctx: AudioContext, s: number, t: number, stepDur: number) {
    const song = this.song!;
    const semi = (n: number) => song.rootHz * Math.pow(2, n / 12);

    const b = song.bass[s];
    if (b !== -1) this.note(ctx, 'square', semi(b) / 2, t, stepDur * 0.9, 0.22);

    const l = song.lead[s];
    if (l !== -1) {
      this.note(ctx, 'sawtooth', semi(l) * 2, t, stepDur * 1.6, 0.1);
      this.note(ctx, 'sawtooth', semi(l) * 2 * 1.006, t, stepDur * 1.6, 0.07);
    }

    // arpeggio channel: cycles chord tones every step
    const chord = song.arp[Math.floor(s / 4) % song.arp.length];
    const tone = chord[s % chord.length];
    this.note(ctx, 'square', semi(tone) * 4, t, stepDur * 0.55, 0.045);

    if (song.kick.includes(s)) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.1);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(g).connect(this.gain!);
      osc.start(t);
      osc.stop(t + 0.14);
    }
    if (song.hat.includes(s)) {
      // short bright noise via high square cluster
      this.note(ctx, 'square', 6200 + (s % 3) * 800, t, 0.025, 0.03);
    }
  }
}

export const music = new Music();
