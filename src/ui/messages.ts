import { h } from './dom';
import { MicPermissionError, MicUnavailableError } from '../audio/listener';

export type MessageKey =
  | 'micDenied' | 'micUnavailable' | 'silent' | 'noisy' | 'interrupted'
  | 'calibrationFailed' | 'storageReset' | 'audioFailed' | 'samplesMissing' | 'notCalibrated';

type Message = { title: string; body: string; tone: 'error' | 'info' };

// Un messaggio per ogni riga della tabella "Gestione degli errori" della specifica, più i casi tecnici.
export const MESSAGES: Record<MessageKey, Message> = {
  micDenied: { tone: 'error', title: 'Il microfono è bloccato',
    body: "Senza microfono l'app non può ascoltarti. Consenti l'accesso al microfono nelle impostazioni del browser per questo sito, poi riprova. Intanto puoi ascoltare gli esercizi." },
  micUnavailable: { tone: 'error', title: 'Nessun microfono disponibile',
    body: "Il dispositivo non offre un microfono, oppure un'altra app lo sta usando. Chiudi le altre app che registrano e riprova." },
  silent: { tone: 'info', title: 'Non ho sentito niente',
    body: 'Per 5 secondi dopo il conteggio non è arrivato alcun suono. Il microfono è coperto o il telefono è troppo lontano? L’esercizio non conta: sistema e riprova.' },
  noisy: { tone: 'info', title: 'C’è troppo rumore',
    body: 'C’è troppo rumore di fondo e il segnale non è chiaro, quindi l’esercizio non conta. Cerca un ambiente più silenzioso e riprova.' },
  interrupted: { tone: 'info', title: 'Esercizio interrotto',
    body: 'L’hai fermato prima della fine, quindi non conta per lo sblocco.' },
  calibrationFailed: { tone: 'info', title: 'Calibrazione non riuscita',
    body: 'Ho riconosciuto meno di 6 La sugli 8 click. Suona un La breve e deciso su ogni click, poi ripeti.' },
  storageReset: { tone: 'info', title: 'Progressi azzerati',
    body: 'I dati salvati erano illeggibili, quindi riparti dal livello 1. Se succede spesso, controlla che il browser non cancelli i dati del sito.' },
  audioFailed: { tone: 'error', title: 'L’audio non parte',
    body: 'Il browser non ha avviato l’audio. Tocca di nuovo il pulsante; se non basta, ricarica la pagina.' },
  samplesMissing: { tone: 'info', title: 'Suono di violino non disponibile',
    body: 'I campioni di violino non sono stati caricati: gli esercizi suonano con un timbro sintetico.' },
  notCalibrated: { tone: 'info', title: 'Ritmo non valutato',
    body: 'Calibra il ritardo del microfono dalla schermata iniziale per avere anche il giudizio sul ritmo.' },
};

export function messageBox(key: MessageKey, ...actions: HTMLElement[]): HTMLElement {
  return messageWithDetail(key, null, ...actions);
}

function messageWithDetail(key: MessageKey, detail: string | null, ...actions: HTMLElement[]): HTMLElement {
  const m = MESSAGES[key];
  return h('section', { class: `message message-${m.tone}`, role: m.tone === 'error' ? 'alert' : 'status' },
    h('h2', { tabindex: -1 }, m.title), h('p', {}, m.body),
    detail ? h('p', { class: 'detail' }, `Dettaglio tecnico: ${detail}`) : null,
    actions.length ? h('div', { class: 'actions' }, ...actions) : null);
}

/** Il messaggio giusto per un errore dell'ascolto: permesso, microfono assente o problema audio. */
export function messageKeyFor(e: unknown): MessageKey {
  if (e instanceof MicPermissionError) return 'micDenied';
  if (e instanceof MicUnavailableError) return 'micUnavailable';
  return 'audioFailed';
}

export function errorBox(e: unknown, ...actions: HTMLElement[]): HTMLElement {
  const key = messageKeyFor(e);
  return messageWithDetail(key, key === 'micDenied' ? null : (e instanceof Error ? e.message : String(e)), ...actions);
}
