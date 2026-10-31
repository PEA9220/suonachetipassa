import type { ProgressState } from '../core/progress';
import type { Exercise } from '../core/types';
import type { Evaluation } from '../core/evaluate';
import type { Player } from '../audio/player';
import type { MessageKey } from './messages';

export type Outcome = { ex: Exercise; evaluation: Evaluation; newlyUnlocked: number | null; rhythmSkipped: 'level' | 'calibration' | null };

/** Ciò che ogni schermata riceve: stato, riproduttore e navigazione. */
export type App = {
  root: HTMLElement;
  state: ProgressState;
  player: Player;
  setState(s: ProgressState): Promise<void>;
  home(notice?: MessageKey): void;
  exercise(ex: Exercise, notice?: MessageKey): void;
  summary(outcome: Outcome): void;
  calibration(): void;
  prova(): void;
};

export function newSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}
