# Registrazioni di prova

Registrate in WAV, telefono sul leggio. Per ogni `nome.wav` serve `nome.json`:

```json
{ "notes": [{ "midi": 69, "cents": 0 }] }
```

`cents` è lo scarto letto sull'accordatore. Elenco richiesto: La4 accordato, La4 calante,
scala di Sol maggiore su due ottave, scala lenta con vibrato, quattro La ripetuti,
un motivo del livello 4, un motivo del livello 6, l'Inno alla gioia.

Se un test fallisce si regolano le soglie in `src/core/segment.ts`, non i test.
