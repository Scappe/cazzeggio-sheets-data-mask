# cazzeggio-sheets-data-mask

Sorgente canonica della web app `axante-lead-mask`.

## Regole di sicurezza

- La produzione deve restare accessibile senza login Vercel.
- L’accesso ai dati è consentito solo con una `k` valida.
- La chiave non va mai hardcodata nel frontend o nel repository: deve restare una variabile d’ambiente lato server.
- Senza `k`, o con `k` errata, la pagina deve mostrare esclusivamente:

  **Hai fatto qualcosa di strano…**  
  **Contatta il tuo referente.**

- In stato non autorizzato non devono partire richieste ai dati, inizializzarsi la mappa o comparire elementi della web app.
- Tutte le API private devono continuare a rifiutare richieste non autorizzate lato server.

## Stato

Il deployment di produzione sicuro esiste già su Vercel. Questo repository non va collegato/deployato in produzione finché non sono stati riversati qui anche i sorgenti delle API correnti, per evitare di rompere `/api/leads`, `/api/outcomes` e `/api/geocode`.

## UI

Mantenere le correzioni correnti:

- testo `.roast` sempre con sfondo trasparente;
- colori di stato applicati soltanto ai pin della mappa;
- comportamento e dati della web app invariati quando la `k` è valida.
