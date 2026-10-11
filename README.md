# Step Ritual

**[Italiano](#italiano) · [English](#english)**

---

## Italiano

App per coppie che vogliono camminare insieme e farne un rituale quotidiano.

- **Coppia**: uno dei due genera un _Ritual Code_, l'altro lo inserisce e i due account si collegano.
- **Camminata con GPS**: mappa in tempo reale del percorso (tipo Strava), distanza, tempo, passi, pausa/ripresa e blocco schermo "in tasca".
- **Storico**: grafici settimana/mese/anno di te e del partner, elenco delle camminate e dettaglio con la mappa del percorso.
- **Streak di coppia**: i giorni consecutivi in cui almeno uno dei due ha camminato, più il record personale.
- **Premi**: badge per km totali, streak e numero di camminate.
- **Promemoria**: notifiche locali nei giorni e all'ora che scegli, riepilogo settimanale e ore silenziose.
- **Avvisi al partner** (facoltativi): quando finisci una camminata, il partner riceve una notifica, ad esempio "Luca ha appena camminato 3 km".
- **Account**: recupero della password via email (facoltativo), eliminazione di una singola camminata e dell'intero account direttamente dall'app. Dopo troppi tentativi di accesso sbagliati il login si blocca per 15 minuti.

L'interfaccia è in italiano.

### Com'è fatto

| Cartella  | Cosa contiene                                                         |
| --------- | --------------------------------------------------------------------- |
| `client/` | App mobile (Expo SDK 54, React Native, React Navigation, React Query) |
| `server/` | API REST (Express, Drizzle ORM, PostgreSQL, login con JWT)            |
| `api/`    | Punto di ingresso per Vercel (riusa `server/`)                        |
| `shared/` | Schema del database e validazioni condivise tra app e server          |

L'app parla con l'API tramite l'indirizzo in `EXPO_PUBLIC_API_URL`. L'API può girare su qualsiasi host Node.js con un database Postgres.

### Requisiti

- Node.js **20.12 o più recente** (consigliato 22 LTS)
- Un database PostgreSQL (va benissimo il piano gratuito di [Neon](https://neon.tech))
- Sul telefono: l'app **Expo Go** (iOS o Android)

### Avvio in locale

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

Poi crea le tabelle e avvia server e app (in due terminali). Ogni volta che scarichi una versione nuova del codice, riesegui `npm run db:push`: aggiorna le tabelle senza cancellare i dati.

```bash
npm run db:push
npm run server:dev
npm start
```

Scansiona il QR code con la fotocamera (iOS) o con Expo Go (Android).

### Pubblicare l'API su Vercel + Neon (gratis)

1. **Database.** Crea un progetto su [Neon](https://neon.tech). Nella dashboard copia la **Pooled connection string** (l'host contiene `-pooler`).
2. **Tabelle.** In locale metti quella stringa in `DATABASE_URL` dentro `.env` ed esegui `npm run db:push`.
3. **Progetto Vercel.** Fai il fork di questo repository, poi su [vercel.com](https://vercel.com) scegli _Add New → Project_ e importa il fork. Le impostazioni di build sono già in `vercel.json`, non serve cambiarle.
4. **Variabili d'ambiente.** Nelle impostazioni del progetto Vercel aggiungi:
   - `DATABASE_URL`: la stringa di Neon
   - `JWT_SECRET`: una stringa casuale lunga, diversa da quella locale
   - facoltative: `SMTP_URL` ed `EMAIL_FROM` per il recupero password, `EXPO_ACCESS_TOKEN` per gli avvisi push (vedi [Notifiche](#notifiche))
5. **Deploy.** Al termine apri `https://<nome-progetto>.vercel.app/api/health`: deve rispondere `{"ok":true}`.
6. **Collega l'app.** Metti `EXPO_PUBLIC_API_URL=https://<nome-progetto>.vercel.app` nel tuo `.env` e riavvia `npm start`.

#### Altri host (Render, Railway, Fly.io, un VPS…)

Qualsiasi servizio che esegue Node.js va bene. Il comando di installazione è `npm install`, quello di avvio `npm run server:start`. Imposta le variabili `DATABASE_URL` e `JWT_SECRET` (più quelle facoltative descritte in [Notifiche](#notifiche)). La porta viene letta da `PORT` (predefinita 5000).

### GPS, passi e limiti di Expo Go

- **In Expo Go** il GPS funziona solo con l'app aperta: se blocchi lo schermo, il percorso riprende quando riapri l'app (il tratto mancante diventa una linea retta). L'app lo indica con "GPS solo ad app aperta".
- **Per tracciare anche a schermo spento** serve una build vera dell'app (development build o build per gli store), ad esempio con [EAS Build](https://docs.expo.dev/build/introduction/) oppure `npx expo run:ios` / `npx expo run:android`. I permessi per la posizione in background sono già configurati in `app.json`.
- **Android, build vere:** la mappa usa Google Maps e richiede una chiave API. Mettila in `GOOGLE_MAPS_ANDROID_API_KEY` (in `.env` o nei secrets di EAS). Expo Go non ne ha bisogno.
- **Distanza:** si usa quella del GPS. Se il GPS non è disponibile, viene stimata dai passi.
- **Solo telefono:** Step Ritual è pensata solo per smartphone. Se la apri da computer o da tablet, l'app resta in formato telefono, in una colonna al centro dello schermo. Su iPad gira come app per iPhone.
- **Versione web:** utile solo come anteprima. Non ha GPS né contapassi.

### Notifiche

Promemoria e riepilogo settimanale sono notifiche **locali**: vengono programmate sul telefono in base alle impostazioni e non serve alcun server di push.

#### Avvisi al partner (push, facoltativi)

Quando uno dei due finisce una camminata, l'altro riceve una notifica push tramite il servizio gratuito di Expo. Non arriva durante le ore silenziose del partner. Per attivarli:

1. Crea un account gratuito su [expo.dev](https://expo.dev) ed esegui `npx eas init`: ti dà un _project ID_.
2. Mettilo in `EAS_PROJECT_ID`, nel `.env` e nelle variabili di EAS Build.
3. **iOS:** funziona anche in Expo Go. **Android:** serve una development build o una build per gli store, con le credenziali FCM caricate su EAS (Expo Go per Android non riceve push).
4. Se nel tuo account Expo hai attivato la _push security_, metti il token in `EXPO_ACCESS_TOKEN` sul server.

Senza `EAS_PROJECT_ID` la voce "Avvisi partner" resta disattivata e mostra "Non disponibile in questa versione dell'app".

#### Recupero password (email, facoltativo)

Il link "Password dimenticata?" compare solo se il server può inviare email. Imposta sul server:

- `SMTP_URL`: il server di posta, ad esempio `smtps://utente:password@smtp.tuoprovider.it:465`. Va bene qualsiasi provider con SMTP.
- `EMAIL_FROM`: il mittente, ad esempio `Step Ritual <noreply@tuodominio.it>`.

L'utente riceve un codice di 6 cifre, valido 15 minuti, con al massimo 5 tentativi. Dopo il cambio password, le sessioni aperte sugli altri telefoni vengono chiuse.

### Comandi utili

| Comando               | A cosa serve                                  |
| --------------------- | --------------------------------------------- |
| `npm start`           | Avvia l'app con Expo                          |
| `npm run server:dev`  | Avvia l'API in locale con ricarica automatica |
| `npm run db:push`     | Crea o aggiorna le tabelle del database       |
| `npm run check:types` | Controllo dei tipi TypeScript (app e server)  |
| `npm run lint`        | Controllo del codice                          |

### Licenza

Il codice è distribuito con licenza [PolyForm Noncommercial 1.0.0](LICENSE).

- **Puoi** usarlo, studiarlo, modificarlo, farne un fork e condividerlo per scopi **non commerciali** (uso personale, studio, hobby, organizzazioni non profit).
- **Non puoi** usarlo per guadagnare: ad esempio venderlo, pubblicarlo come app a pagamento o con pubblicità, oppure offrirlo come servizio a pagamento.

Per un uso commerciale serve un accordo separato con l'autore. Chi ridistribuisce il codice deve includere il file `LICENSE` con la riga `Required Notice`. Questo è solo un riassunto: fa fede il testo del file `LICENSE`.

---

## English

An app for couples who want to walk together and make it a daily ritual.

- **Couple**: one partner generates a _Ritual Code_, the other enters it, and the two accounts are linked.
- **GPS walks**: live map of your route (like Strava), distance, time, steps, pause/resume and an "in your pocket" screen lock.
- **History**: weekly/monthly/yearly charts for you and your partner, a list of walks and a detail view with the route map.
- **Couple streak**: consecutive days on which at least one of you walked, plus your best streak.
- **Rewards**: badges for total km, streaks and number of walks.
- **Reminders**: local notifications on the days and time you choose, a weekly summary and quiet hours.
- **Partner alerts** (optional): when you finish a walk, your partner gets a notification such as "Luca ha appena camminato 3 km" ("Luca just walked 3 km").
- **Account**: password recovery by email (optional), and deleting a single walk or your whole account right from the app. After too many failed sign-in attempts, login is locked for 15 minutes.

The user interface is in Italian.

### How it's built

| Folder    | Contents                                                              |
| --------- | --------------------------------------------------------------------- |
| `client/` | Mobile app (Expo SDK 54, React Native, React Navigation, React Query) |
| `server/` | REST API (Express, Drizzle ORM, PostgreSQL, JWT login)                |
| `api/`    | Vercel entry point (reuses `server/`)                                 |
| `shared/` | Database schema and validation shared by the app and the server       |

The app talks to the API at the address in `EXPO_PUBLIC_API_URL`. The API runs on any Node.js host with a Postgres database.

### Requirements

- Node.js **20.12 or newer** (22 LTS recommended)
- A PostgreSQL database (the free [Neon](https://neon.tech) plan works fine)
- On your phone: the **Expo Go** app (iOS or Android)

### Run locally

```bash
git clone https://github.com/Luke2986/Ritual-Walk.git
cd Ritual-Walk
npm install
cp .env.example .env
```

Open `.env` and fill in at least:

- `DATABASE_URL`: your Postgres connection string
- `JWT_SECRET`: a long random string (`openssl rand -hex 32`)
- `EXPO_PUBLIC_API_URL`: where the API runs. When testing from a phone, use your computer's Wi-Fi IP address (e.g. `http://192.168.1.20:5000`), not `localhost`.

Then create the tables and start the server and the app (in two terminals). Whenever you pull a new version of the code, run `npm run db:push` again: it updates the tables without deleting data.

```bash
npm run db:push
npm run server:dev
npm start
```

Scan the QR code with the Camera app (iOS) or with Expo Go (Android).

### Deploy the API on Vercel + Neon (free)

1. **Database.** Create a project on [Neon](https://neon.tech). In the dashboard, copy the **Pooled connection string** (the host contains `-pooler`).
2. **Tables.** Locally, put that string in `DATABASE_URL` in `.env` and run `npm run db:push`.
3. **Vercel project.** Fork this repository, then on [vercel.com](https://vercel.com) choose _Add New → Project_ and import your fork. Build settings are already in `vercel.json`; no changes needed.
4. **Environment variables.** In the Vercel project settings, add:
   - `DATABASE_URL`: the Neon string
   - `JWT_SECRET`: a long random string, different from your local one
   - optional: `SMTP_URL` and `EMAIL_FROM` for password recovery, `EXPO_ACCESS_TOKEN` for push alerts (see [Notifications](#notifications))
5. **Deploy.** When it finishes, open `https://<project-name>.vercel.app/api/health`: it should return `{"ok":true}`.
6. **Connect the app.** Set `EXPO_PUBLIC_API_URL=https://<project-name>.vercel.app` in your `.env` and restart `npm start`.

#### Other hosts (Render, Railway, Fly.io, a VPS…)

Any service that runs Node.js works. The install command is `npm install` and the start command is `npm run server:start`. Set `DATABASE_URL` and `JWT_SECRET` (plus the optional variables described in [Notifications](#notifications)). The port is read from `PORT` (default 5000).

### GPS, steps and Expo Go limits

- **In Expo Go**, GPS only works while the app is open: if you lock the screen, tracking resumes when you reopen the app (the missing stretch becomes a straight line). The app shows this as "GPS solo ad app aperta" ("GPS only while the app is open").
- **To track with the screen off** you need a real build of the app (a development build or a store build), for example with [EAS Build](https://docs.expo.dev/build/introduction/) or `npx expo run:ios` / `npx expo run:android`. Background location permissions are already configured in `app.json`.
- **Android, real builds:** the map uses Google Maps and needs an API key. Put it in `GOOGLE_MAPS_ANDROID_API_KEY` (in `.env` or in EAS secrets). Expo Go doesn't need it.
- **Distance:** taken from GPS. If GPS isn't available, it's estimated from steps.
- **Phone only:** Step Ritual is designed for smartphones only. On a computer or tablet the app keeps its phone layout, in a column in the middle of the screen. On iPad it runs as an iPhone app.
- **Web version:** only useful as a preview. It has no GPS or step counter.

### Notifications

Reminders and the weekly summary are **local** notifications: they're scheduled on the phone from your settings, so no push server is needed.

#### Partner alerts (push, optional)

When one partner finishes a walk, the other gets a push notification through Expo's free push service. It isn't sent during the partner's quiet hours. To enable it:

1. Create a free account on [expo.dev](https://expo.dev) and run `npx eas init`: it gives you a _project ID_.
2. Put it in `EAS_PROJECT_ID`, both in `.env` and in your EAS Build environment variables.
3. **iOS:** works in Expo Go too. **Android:** needs a development build or a store build, with FCM credentials uploaded to EAS (Expo Go on Android can't receive push notifications).
4. If you turned on _push security_ in your Expo account, put the access token in `EXPO_ACCESS_TOKEN` on the server.

Without `EAS_PROJECT_ID`, the "Avvisi partner" (partner alerts) setting stays off and shows "Non disponibile in questa versione dell'app" ("Not available in this version of the app").

#### Password recovery (email, optional)

The "Password dimenticata?" ("Forgot password?") link only appears when the server can send email. Set on the server:

- `SMTP_URL`: your mail server, for example `smtps://user:password@smtp.yourprovider.com:465`. Any provider with SMTP works.
- `EMAIL_FROM`: the sender, for example `Step Ritual <noreply@yourdomain.com>`.

The user gets a 6-digit code, valid for 15 minutes, with at most 5 attempts. After a password change, sessions open on other phones are signed out.

### Useful commands

| Command               | What it does                           |
| --------------------- | -------------------------------------- |
| `npm start`           | Start the app with Expo                |
| `npm run server:dev`  | Run the API locally with auto-reload   |
| `npm run db:push`     | Create or update the database tables   |
| `npm run check:types` | TypeScript type check (app and server) |
| `npm run lint`        | Lint the code                          |

### License

The code is released under the [PolyForm Noncommercial 1.0.0](LICENSE) license.

- **You can** use, study, modify, fork and share it for **noncommercial** purposes (personal use, study, hobby projects, nonprofit organizations).
- **You can't** use it to make money: for example selling it, publishing it as a paid or ad-supported app, or offering it as a paid service.

Commercial use requires a separate agreement with the author. Anyone who redistributes the code must include the `LICENSE` file with its `Required Notice` line. This is only a summary: the text in the `LICENSE` file is what applies.
