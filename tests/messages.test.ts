import { describe, it, expect } from 'vitest';
import { MESSAGES } from '../src/ui/messages';

describe('messaggi della tabella "Gestione degli errori"', () => {
  it('microfono negato: spiega il permesso e che gli esercizi restano ascoltabili', () => {
    expect(MESSAGES.micDenied.body).toMatch(/permesso|consenti/i);
    expect(MESSAGES.micDenied.body).toMatch(/ascoltare gli esercizi/);
  });
  it('silenzio: chiede se il microfono è coperto o troppo lontano e propone di riprovare', () => {
    expect(MESSAGES.silent.body).toMatch(/coperto/);
    expect(MESSAGES.silent.body).toMatch(/lontano/);
    expect(MESSAGES.silent.body).toMatch(/riprova/i);
  });
  it('rumore: segnale non chiaro, esercizio non conteggiato', () => {
    expect(MESSAGES.noisy.body).toMatch(/non è chiaro/);
    expect(MESSAGES.noisy.body).toMatch(/non conta/);
  });
  it('calibrazione mai fatta: ritmo non valutato finché non la fai', () => {
    expect(MESSAGES.notCalibrated.body).toMatch(/ritmo/i);
  });
  it('dati illeggibili: si riparte dal livello 1', () => {
    expect(MESSAGES.storageReset.body).toMatch(/livello 1/);
  });
});
