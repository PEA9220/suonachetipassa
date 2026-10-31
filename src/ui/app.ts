import type { ProgressState } from '../core/progress';
import type { Exercise, PlayedNote } from '../core/types';
import type { PitchFrame } from '../core/pitch';
import type { Evaluation } from '../core/evaluate';
import type { Player } from '../audio/player';
import type { MessageKey } from './messages';

export type Outcome = {
  ex: Exercise; evaluation: Evaluation; newlyUnlocked: number | null; rhythmSkipped: 'level' | 'calibration' | null;
  /** Note e frame del tentativo, con i tempi misurati dalla fine del conteggio. */
  played: PlayedNote[]; frames: PitchFrame[]; latencyMs: number | null;
};

/** Ciò che ogni schermata riceve: stato, riproduttore e navigazione. */
export type App = {
  root: HTMLElement;
  state: ProgressState;
  player: Player;
  setState(s: ProgressState): Promise<void>;
  home(notice?: MessageKey): void;
  exercise(ex: Exercise, notice?: MessageKey): void;
  summary(outcome: Outcome): void;
  calibration(firstRun?: boolean): void;
  prova(): void;
};

export function newSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}
