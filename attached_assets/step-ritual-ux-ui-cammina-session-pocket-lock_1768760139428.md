# Step Ritual — SPEC UX/UI “Cammina” Sessione (Start/Stop + Passi + Pocket Lock) — **Impeccabile**
> Obiettivo: feature nuova con UX pulita, “pocket‑safe”, coerente con palette Step Ritual e comportamento intuitivo.
> Vincolo: Expo Go (no background GPS serio). I passi sono la metrica primaria.

---

## 0) Principi UX (da rispettare)
1) **Zero ansia**: l’utente deve capire subito se sta registrando o no.
2) **Pocket‑safe**: nessun tap accidentale può fermare la sessione.
3) **Un’azione primaria per stato**: Start quando fermo, Stop quando attivo.
4) **Feedback sempre**: haptic + micro‑animazioni + toast discreti.
5) **Accessibilità**: testo grande, contrasto, hit‑area >= 44px, VoiceOver labels.

---

## 1) IA / Flusso schermate
### Stati principali della schermata Cammina
A) **Idle (non in sessione)**
- KPI di “oggi” (passi, km stimati, tempo attivo oggi opzionale)
- CTA primaria: **Start sessione**
- CTA secondaria: “Impostazioni passo” (facoltativa) / info limiti Android

B) **Running (sessione attiva, sbloccata)**
- KPI live: Passi / Km / Tempo
- CTA primaria: **Stop (protetto)** (slide o long‑press)
- CTA secondaria: **Pocket Lock** (toggle)

C) **Locked (Pocket Lock attivo)**
- Overlay che blocca tocchi
- Mostra SOLO: lucchetto + KPI essenziali + istruzione “Tieni premuto per sbloccare”
- Nessun altro controllo attivo

D) **Paused (opzionale)**
- Se vuoi: Pausa (protetta come Stop)
- In pausa, la sessione resta attiva ma timer non avanza (o avanza separatamente).  
> Se vuoi UX più semplice: **niente Pausa** nella v1.

E) **Summary (fine sessione)**
- Riepilogo con 3 KPI + “Salva”
- Possibilità di aggiungere nota/emoji (facoltativo)
- “Fatto” → torna a Home (Camminate recenti aggiornate)

---

## 2) Layout UI (coerente col tuo UI kit)
### Struttura schermata (running)
- **Header**: titolo “Cammina” + indicatore stato
  - Chip “● In corso” (magenta o lemon) con animazione pulse leggera
- **Sezione KPI** (sempre visibile, top):
  - 3 card orizzontali (o 2+1) con:
    - label piccola
    - valore grande
    - unità
  - Colori:
    - testo: #1A1458
    - background card: bianco/creamy con shadow soft
    - accenti: cyan #00E5FF / violet #B88BFF / lemon #FFE66D
- **Sezione secondaria**:
  - opzionale “mappa mini” solo se già presente (non centrale in Expo Go)
  - altrimenti micro‑motivazione (“Keep going 💛” + frase personalizzata)
- **Bottom Action Bar** (sticky, sempre in vista):
  - toggle 🔒 Pocket Lock a sinistra (icona + label piccola)
  - CTA Stop protetta al centro/destra (grande)
  - spazio per safe‑area iPhone

### Idle
- KPI “Oggi” + CTA Start grande centrata in basso
- Microcopy: “Avvia una sessione per il tuo rituale” (tono leggero)

---

## 3) Interazioni “impeccabili”
### 3.1 Start sessione
- Tap Start → haptic “success” + animazione:
  - bottone che si “contrae” e diventa stato “In corso”
  - appare chip “● In corso”
- Mostra toast breve: “Sessione avviata”

### 3.2 Stop protetto (obbligatorio)
Scegli UNA modalità (consigliata: slide):
**Opzione 1 — Slide to Stop (consigliata)**
- componente “slider” con maniglia
- testo: “Scorri per fermare”
- evita stop per tap casuali

**Opzione 2 — Press & hold**
- pulsante Stop richiede press 2s
- mostra progress ring che si completa

> Se Pocket Lock è ON, Stop non è accessibile finché non sblocchi.

### 3.3 Pocket Lock
- Toggle “🔒 Blocca tocchi”
- All’attivazione:
  - haptic “impact”
  - overlay fade‑in 150–250ms
  - overlay deve intercettare TUTTI i tocchi

### 3.4 Sblocco Pocket Lock
- Solo con **long press >= 2s**
- Mostra progress bar/cerchio attorno al lucchetto durante la pressione
- haptic “success” su sblocco

### 3.5 Gestione schermo spento / ritorno
- Timer: calcolato da `now - startedAt` (non dipendere da interval)
- iOS: al ritorno in foreground fai “catch‑up” passi (getStepCountAsync)
- Mostra micro toast: “Dati sincronizzati” (solo se cambia significativamente)

---

## 4) Microcopy (italiano, tono Step Ritual)
- Idle:
  - “Pronto per il rituale di oggi?”
  - Start: “Inizia”
- Running:
  - chip: “In corso”
  - stop slider: “Scorri per fermare”
  - lock: “Blocca tocchi”
- Locked:
  - “Tieni premuto per sbloccare”
  - “Sessione in corso…”
- Summary:
  - “Bel rituale ✨”
  - “Salvato nello storico”

Errori/limiti:
- Android (Expo Go): “Su Android, i passi in background richiedono Health Connect (fase 2).”
- Motion permission iOS negata: “Abilita ‘Movimento’ nelle impostazioni per contare i passi.”

---

## 5) Accessibilità & qualità UI
- Font:
  - valore KPI grande (min 32–40)
  - label 12–14
- Hit targets min 44px
- VoiceOver:
  - “Passi: 1.234”
  - “Distanza stimata: 1.2 chilometri”
  - “Tempo: 18 minuti e 42 secondi”
- Contrasto: testo #1A1458 su #FFF3D6 / bianco
- Riduci motion: se `reduceMotion` attivo, disabilita pulse/animazioni superflue

---

## 6) Implementazione (istruzioni per Replit Agent)
### Stack
- `expo-sensors` → Pedometer
- `expo-haptics` → feedback
- (opzionale) `react-native-reanimated` per transizioni, ma ok anche `Animated`

### Componenti da creare
1) `WalkKpiRow` (3 card KPI)
2) `StartButton`
3) `StopSlider` (o `HoldToStopButton`)
4) `PocketLockOverlay` (intercetta tocchi + long press unlock con progress)
5) `WalkSummarySheet` (modal/bottom sheet)

### Stato logico
- `useWalkSession()` (già definito nel task precedente) gestisce:
  - start/stop
  - steps/time/distance
  - lock
  - AppState catch‑up iOS

### Persistenza
- salva `stepsTotal`, `distanceKm`, `durationSec` nel record camminata e aggiorna “Camminate recenti”.

---

## 7) Criteri di accettazione UX (impeccabile)
- Nessun modo di stoppare con 1 tap accidentale
- Pocket Lock blocca davvero ogni touch
- L’utente capisce in < 2 secondi se la sessione è attiva (chip + KPI + CTA)
- Layout non “salta” tra stati (transizioni fluide)
- Riepilogo finale è chiaro e conferma salvataggio
- Tutto in italiano, coerente con palette Step Ritual

---

## 8) Deliverable richiesti
- Implementazione UI completa in “Cammina” per tutti gli stati (Idle/Running/Locked/Summary)
- Componenti riutilizzabili + stili coerenti
- Haptics + animazioni base
- Test manuale: tasca‑safe (simulare tap random) → sessione non si ferma
