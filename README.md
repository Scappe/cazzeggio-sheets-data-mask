# cazzeggio-sheets-data-mask

Sorgente canonica della web app `axante-lead-mask`.

## Regole di sicurezza

- La produzione deve restare accessibile senza login Vercel.
- L’accesso ai dati è consentito solo con una `k` valida.
- La chiave non va mai hardcodata nel frontend o nel repository: deve restare una variabile d’ambiente lato server.
- Senza `k`, o con `k` errata, la pagina mostra esclusivamente:

  **Hai fatto qualcosa di strano…**  
  **Contatta il tuo referente.**

- Senza chiave valida non vengono inizializzate mappa, lista lead o azioni della web app.
- `/api/leads`, `/api/outcomes` e `/api/geocode` rifiutano lato server le richieste non autorizzate.

## Dati

Il foglio collegato è `1R5m6-tF96Fptt01QU5B_yDesKnuYLJBFLTbLFOIWqsQ`, tab `Foglio1`:

- A: Nome
- B: Link Maps
- C: Contattato
- D: Esito

La lettura può usare Google Sheets API e, solo come fallback read-only, il CSV pubblico. Le scritture richiedono credenziali Google lato server.

Variabili supportate per la chiave di accesso: `LEAD_MASK_KEY`, `MASK_KEY`, `ACCESS_KEY`, `APP_KEY`, `AUTH_KEY`, `DATA_MASK_KEY`.

Credenziali Google supportate: JSON service account (`GOOGLE_SERVICE_ACCOUNT_JSON` / `GOOGLE_CREDENTIALS` / `GOOGLE_SERVICE_ACCOUNT_KEY`) oppure email + private key (`GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY`, con alias compatibili nel codice).

## UI

Sono mantenute le correzioni correnti:

- testo `.roast` sempre con sfondo trasparente;
- colori di stato applicati soltanto ai pin della mappa;
- accesso tramite `?k=`;
- mappa, ricerca, ordinamento per distanza, stati e battute.

## Rollout

**Non promuovere direttamente su produzione.** Prima si crea e verifica una preview con le stesse variabili d’ambiente del progetto Vercel esistente. Solo dopo aver verificato lettura foglio, geocoding e una scrittura di test si promuove il deployment.

La produzione attuale resta intatta finché questa verifica non è completata.
