# Violino a orecchio

PWA personale: genera esercizi di violino a difficoltà crescente, li fa ascoltare,
ascolta l'esecuzione dal microfono e valuta note, intonazione e ritmo. Tutto gira nel
browser; i progressi restano sul dispositivo.

## Comandi

```bash
npm install
npm run dev      # sviluppo
npx vitest run   # test
npm run build    # versione da pubblicare in dist/
```

## Da completare a mano

- **Campioni di violino**: vedi `public/samples/violin/LEGGIMI.md`. Senza, suona un sintetizzatore.
- **Registrazioni di prova**: vedi `tests/fixtures/audio/LEGGIMI.md`.
- **Estratti del repertorio** in `src/repertoire/`: trascritti a memoria, da confrontare con lo spartito
  (soprattutto Vivaldi).
- **Pubblicazione**: crea il repository su GitHub, attiva Pages con sorgente "GitHub Actions" e fai push su
  `main`; il workflow `.github/workflows/deploy.yml` esegue test, build e pubblicazione.

## Pagina di prova

`#prova` mostra i frame del microfono dal vivo e permette di avviare gli estratti del repertorio.

## Icone

`node scripts/make-icons.mjs` rigenera le icone in `public/icons/`.
