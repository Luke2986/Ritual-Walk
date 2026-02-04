# Step Ritual — TASK: Fix tracking GPS in background (schermo spento) — Expo + React Native
## Problema
Durante una camminata, quando lo schermo si spegne / telefono viene bloccato, il tracking si **ferma**.
Questo succede quasi sempre perché state usando un watcher “foreground” (`watchPositionAsync`) che funziona solo quando l’app è attiva.

## Obiettivo
Durante la schermata **Camminata (tracking live)**:
- il GPS continua a registrare punti **anche a schermo spento / app in background**
- al ritorno in app, la traccia è completa (stile Strava)
- niente mock: punti reali
- stop tracking = stop totale (niente batteria bruciata)

> Nota di piattaforma: il background tracking **si ferma se l’utente termina/kill-a l’app**. citeturn1view0

---

## Requisiti tecnici (Expo)
Usare **expo-location + expo-task-manager**:
- `Location.startLocationUpdatesAsync` per ricevere update anche in background citeturn1view0
- `TaskManager.defineTask` deve essere definito **a livello globale** (non dentro componenti) citeturn1view1

⚠️ Importante: per background location serve una **development build** (non Expo Go). citeturn1view0

---

## Task 1 — Config app (iOS/Android)
### iOS
Aggiungere in config (app.json/app.config):
- `ios.infoPlist.UIBackgroundModes = ["location"]` citeturn1view0
- strings permessi:
  - `NSLocationWhenInUseUsageDescription`
  - `NSLocationAlwaysAndWhenInUseUsageDescription`
  - `NSLocationAlwaysUsageDescription` citeturn1view0

Permessi:
- chiedere “When In Use” e poi “Always” (background). citeturn1view0  
Nota: se l’utente sceglie “Allow once”, iOS non mostrerà la seconda richiesta e bisogna mandarlo a Settings. citeturn1view0

### Android
- Richiedere foreground + background location. citeturn1view0
- Per tracking a schermo spento serve un **foreground service** con notifica persistente (config `foregroundService` in `startLocationUpdatesAsync`). citeturn0search2turn0search18
- Assicurarsi che i permessi nel manifest/config includano:
  - `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`
  - `FOREGROUND_SERVICE` e `FOREGROUND_SERVICE_LOCATION` (se richiesto) citeturn1view0

---

## Task 2 — Definire il task background (top-level)
Creare file tipo:
- `src/tasks/backgroundLocationTask.ts`

```ts
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import { persistLocationsBatch } from "../tracking/persist";

export const LOCATION_TASK = "step-ritual-location-task";

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const locations = (data as any)?.locations as Location.LocationObject[] | undefined;
  if (!locations?.length) return;

  // Nel task non esistono componenti React: salva su storage locale.
  await persistLocationsBatch(locations);
});
```

> `defineTask` deve restare in global scope. citeturn1view1

Assicurarsi che questo file venga importato **una volta** all’avvio (es. in `App.tsx`).

---

## Task 3 — Service di tracking “Camminata”
Creare `src/tracking/TrackingService.ts` con:
- `startTracking(walkId)`
- `stopTracking()`
- `isTracking()`

### Start tracking
1) Permessi:
- `requestForegroundPermissionsAsync()`
- `requestBackgroundPermissionsAsync()` citeturn1view0
2) Avvia background updates:

```ts
await Location.startLocationUpdatesAsync(LOCATION_TASK, {
  accuracy: Location.Accuracy.Highest,
  distanceInterval: 5,
  timeInterval: 5000,
  showsBackgroundLocationIndicator: true,
  pausesUpdatesAutomatically: false,
  foregroundService: {
    notificationTitle: "Step Ritual attivo",
    notificationBody: "Tracciamento camminata in corso",
  },
});
```

> `foregroundService` è fondamentale su Android. citeturn0search2turn0search18

### Stop tracking
- `await Location.stopLocationUpdatesAsync(LOCATION_TASK);` citeturn1view0
- flush buffer punti + calcoli finali + sync (se online)

---

## Task 4 — Persistenza punti (fondamentale)
Nel task background NON aggiornare state React.
Salvare punti in modo robusto (preferibile SQLite):
- tabella `track_points`: `walk_id`, `ts`, `lat`, `lng`, `alt`, `accuracy`, `speed`, `heading`

La UI Camminata legge i punti dal DB locale per disegnare la polilinea e aggiornare stats.

---

## Task 5 — Criteri di accettazione
1) Avvio camminata → punti GPS arrivano.
2) Blocca telefono (schermo nero) e cammina 2–5 minuti.
3) Sblocca → la traccia include il pezzo in background.
4) Android: notifica persistente mentre tracking è attivo.
5) iOS: gestito “Always” (se negato, CTA impostazioni; non finge).
6) Stop → background updates fermati.

---

## Output richiesto
- Config iOS/Android per background location
- TaskManager task registrato a startup
- TrackingService start/stop
- Persistenza locale punti + lettura per UI mappa
