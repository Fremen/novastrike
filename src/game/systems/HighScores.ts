/**
 * NOVASTRIKE — high score table (localStorage).
 */

export interface ScoreEntry {
  name: string;
  score: number;
  stage: number;
  mode: 'arcade' | 'survival';
}

const KEY = 'novastrike-hiscores-v1';
const MAX = 10;

const DEFAULTS: ScoreEntry[] = [
  { name: 'DAZ', score: 50000, stage: 3, mode: 'arcade' },
  { name: 'JEZ', score: 42000, stage: 2, mode: 'arcade' },
  { name: 'SAL', score: 35000, stage: 2, mode: 'arcade' },
  { name: 'MEL', score: 28000, stage: 2, mode: 'arcade' },
  { name: 'TEAM17', score: 22000, stage: 1, mode: 'arcade' },
  { name: 'BIT', score: 17000, stage: 1, mode: 'survival' },
  { name: 'AGA', score: 12000, stage: 1, mode: 'arcade' },
  { name: 'MOD', score: 8000, stage: 1, mode: 'survival' },
  { name: 'CPU', score: 5000, stage: 1, mode: 'arcade' },
  { name: 'A500', score: 2500, stage: 1, mode: 'arcade' },
].map((e) => ({ ...e, name: e.name.slice(0, 3) })) as ScoreEntry[];

export function loadScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS.slice();
    const parsed = JSON.parse(raw) as ScoreEntry[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULTS.slice();
    return parsed.slice(0, MAX);
  } catch {
    return DEFAULTS.slice();
  }
}

export function qualifies(score: number): boolean {
  const scores = loadScores();
  return score > 0 && (scores.length < MAX || score > scores[scores.length - 1].score);
}

export function saveScore(entry: ScoreEntry): ScoreEntry[] {
  const scores = loadScores();
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  const top = scores.slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(top));
  } catch {
    /* private mode — table just won't persist */
  }
  return top;
}

export function topScore(): number {
  return loadScores()[0]?.score ?? 0;
}
