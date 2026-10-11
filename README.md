# Step Ritual

App per coppie che vogliono camminare insieme e farne un rituale quotidiano.

- **Coppia**: uno dei due genera un _Ritual Code_, l'altro lo inserisce e i due account si collegano.
- **Camminata con GPS**: mappa in tempo reale del percorso (tipo Strava), distanza, tempo, passi, pausa/ripresa e blocco schermo "in tasca".
- **Storico**: grafici settimana/mese/anno di te e del partner, elenco delle camminate e dettaglio con la mappa del percorso.
- **Streak di coppia**: i giorni consecutivi in cui almeno uno dei due ha camminato, più il record personale.
- **Premi**: badge per km totali, streak e numero di camminate.
- **Promemoria**: notifiche locali nei giorni e all'ora che scegli, riepilogo settimanale e ore silenziose.

L'interfaccia è in italiano.

## Com'è fatto

| Cartella  | Cosa contiene                                                          |
| --------- | ---------------------------------------------------------------------- |
| `client/` | App mobile (Expo SDK 54, React Native, React Navigation, React Query)  |
| `server/` | API REST (Express, Drizzle ORM, PostgreSQL, login con JWT)             |
| `api/`    | Punto di ingresso per Vercel (riusa `server/`)                         |
| `shared/` | Schema del database e validazioni condivise tra app e server          |

L'app parla con l'API tramite l'indirizzo in `EXPO_PUBLIC_API_URL`. L'API può girare su qualsiasi host Node.js con un database Postgres.

## Requisiti

- Node.js **20.12 o più recente** (consigliato 22 LTS)
- Un database PostgreSQL (va benissimo il piano gratuito di [Neon](https://neon.tech))
- Sul telefono: l'app **Expo Go** (iOS o Android)

## Avvio in locale

```bash
git clone https://github.com/Luke2986/Ritual-Walk.git
cd Ritual-Walk
npm install
cp .env.example .env
```

Apri `.env` e compila almeno:

- `DATABASE_URL`: la stringa di connessione del tuo Postgres
- `JWT_SECRET`: una stringa casuale lunga (`openssl rand -hex 32`)
- `EXPO_PUBLIC_API_URL`: dove gira l'API. Se provi dal telefono, usa l'IP del computer nella rete Wi-Fi (es. `http://192.168.1.20:5000`), non `localhost`.

Poi crea le tabelle e avvia server e app (in due terminali):

```bash
npm run db:push
npm run server:dev
npm start
```

Scansiona il QR code con la fotocamera (iOS) o con Expo Go (Android).

## Pubblicare l'API su Vercel + Neon (gratis)

1. **Database.** Crea un progetto su [Neon](https://neon.tech). Nella dashboard copia la **Pooled connection string** (l'host contiene `-pooler`).
2. **Tabelle.** In locale metti quella stringa in `DATABASE_URL` dentro `.env` ed esegui `npm run db:push`.
3. **Progetto Vercel.** Fai il fork di questo repository, poi su [vercel.com](https://vercel.com) scegli _Add New → Project_ e importa il fork. Le impostazioni di build sono già in `vercel.json`, non serve cambiarle.
4. **Variabili d'ambiente.** Nelle impostazioni del progetto Vercel aggiungi:
   - `DATABASE_URL`: la stringa di Neon
   - `JWT_SECRET`: una stringa casuale lunga, diversa da quella locale
5. **Deploy.** Al termine apri `https://<nome-progetto>.vercel.app/api/health`: deve rispondere `{"ok":true}`.
6. **Collega l'app.** Metti `EXPO_PUBLIC_API_URL=https://<nome-progetto>.vercel.app` nel tuo `.env` e riavvia `npm start`.

### Altri host (Render, Railway, Fly.io, un VPS…)

Qualsiasi servizio che esegue Node.js va bene. Il comando di installazione è `npm install`, quello di avvio `npm run server:start`. Imposta le variabili `DATABASE_URL` e `JWT_SECRET`. La porta viene letta da `PORT` (predefinita 5000).

## GPS, passi e limiti di Expo Go

- **In Expo Go** il GPS funziona solo con l'app aperta: se blocchi lo schermo, il percorso riprende quando riapri l'app (il tratto mancante diventa una linea retta). L'app lo indica con "GPS solo ad app aperta".
- **Per tracciare anche a schermo spento** serve una build vera dell'app (development build o build per gli store), ad esempio con [EAS Build](https://docs.expo.dev/build/introduction/) oppure `npx expo run:ios` / `npx expo run:android`. I permessi per la posizione in background sono già configurati in `app.json`.
- **Android, build vere:** la mappa usa Google Maps e richiede una chiave API. Mettila in `GOOGLE_MAPS_ANDROID_API_KEY` (in `.env` o nei secrets di EAS). Expo Go non ne ha bisogno.
- **Distanza:** si usa quella del GPS. Se il GPS non è disponibile, viene stimata dai passi.
- **Versione web:** utile solo come anteprima. Non ha GPS né contapassi.

## Notifiche

Promemoria e riepilogo settimanale sono notifiche **locali**: vengono programmate sul telefono in base alle impostazioni e non serve alcun server di push. Gli avvisi sul partner e quelli su streak/badge sono indicati come "Presto disponibile".

## Comandi utili

| Comando               | A cosa serve                                     |
| --------------------- | ------------------------------------------------ |
| `npm start`           | Avvia l'app con Expo                             |
| `npm run server:dev`  | Avvia l'API in locale con ricarica automatica    |
| `npm run db:push`     | Crea o aggiorna le tabelle del database          |
| `npm run check:types` | Controllo dei tipi TypeScript (app e server)     |
| `npm run lint`        | Controllo del codice                             |

## Licenza

Il codice è distribuito con licenza [PolyForm Noncommercial 1.0.0](LICENSE).

- **Puoi** usarlo, studiarlo, modificarlo, farne un fork e condividerlo per scopi **non commerciali** (uso personale, studio, hobby, organizzazioni non profit).
- **Non puoi** usarlo per guadagnare: ad esempio venderlo, pubblicarlo come app a pagamento o con pubblicità, oppure offrirlo come servizio a pagamento.

Per un uso commerciale serve un accordo separato con l'autore. Chi ridistribuisce il codice deve includere il file `LICENSE` con la riga `Required Notice`.
