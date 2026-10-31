import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './style.css';
import type { App } from './ui/app';
import { Player } from './audio/player';
import { loadState, saveState } from './storage';
import { renderHome } from './ui/home';
import { renderExercise } from './ui/exercise';
import { renderSummary } from './ui/summary';
import { renderCalibration } from './ui/calibration';
import { renderProva } from './ui/prova';

async function start(): Promise<void> {
  const root = document.querySelector<HTMLElement>('#app')!;
  const { state, wasReset } = await loadState();
  const app: App = {
    root,
    state,
    player: new Player(),
    async setState(s) {
      app.state = s;
      try { await saveState(s); } catch { /* resta in memoria per questa sessione */ }
    },
    home: notice => {
      if (location.hash) history.replaceState(null, '', location.pathname + location.search);
      renderHome(app, notice);
    },
    exercise: (ex, notice) => renderExercise(app, ex, notice),
    summary: outcome => renderSummary(app, outcome),
    calibration: () => renderCalibration(app),
    prova: () => renderProva(app),
  };
  window.addEventListener('hashchange', () => (location.hash === '#prova' ? app.prova() : renderHome(app)));
  if (location.hash === '#prova') app.prova();
  else renderHome(app, wasReset ? 'storageReset' : undefined);
}

void start();
