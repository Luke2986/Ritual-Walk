# Step Ritual — TASK: Notifiche configurabili (categorie + sotto‑menu) + collegamento a permessi OS
## Contesto
In **Account** esiste già la riga “Notifiche” con switch (master). La posizione va bene.
Ora serve:
1) che lo switch sia **reale** (permessi OS + preferenza in-app)
2) che l’utente possa scegliere **quali notifiche** attivare (categorie + dettagli)

---

## Obiettivo UX
- **Account → Notifiche (switch master)**: abilita/disabilita *tutte* le notifiche Step Ritual.
- **Tap sulla riga Notifiche** (non solo sullo switch) apre **NotificationsScreen** con:
  - Stato notifiche di sistema (OS)
  - Switch master in-app
  - **Categorie** attivabili singolarmente + configurazione (sotto‑menu)

---

## Regola chiave (2 livelli)
### 1) Permesso OS (iOS/Android)
- granted / denied / limited
- Se denied, l’app non può “accendere” notifiche: può solo chiedere permesso (prima volta) oppure aprire impostazioni.

### 2) Preferenze Step Ritual (in-app)
- master ON/OFF + toggles per categorie
- anche con permesso OS granted, l’utente può disattivare alcune categorie.

---

## Categorie richieste (scelte notifiche)
Implementare queste 4 categorie (minimo), con toggle ON/OFF:

1) **Promemoria camminata**
   - Tipo: **Local notifications** (schedulate sul device)
   - Config:
     - Orario (HH:mm)
     - Giorni settimana (Lun…Dom)
     - Testo (scegli preset o frase personalizzata)
   - Nota: quando ON, crea schedule; quando OFF, cancella schedule relativa.

2) **Avvisi partner**
   - Tipo: **Push** (server → device) *oppure* placeholder “coming soon” se non avete ancora push complete
   - Eventi consigliati:
     - “Il partner ha iniziato una camminata”
     - “Il partner ha completato una camminata”
     - “Il partner ti ha invitato / collegato”
   - Config:
     - Toggle generale
     - Sub‑toggles per evento (opzionale)

3) **Streak e badge**
   - Tipo: local o push (scegli il più semplice con la vostra architettura)
   - Eventi:
     - streak mantenuta / streak a rischio (es. “oggi mancano 20 min al tuo rituale”)
     - badge sbloccato

4) **Riepilogo settimanale**
   - Tipo: **Local scheduled**
   - Config:
     - Giorno (es. Domenica)
     - Orario

### Extra consigliato (facoltativo)
5) **Ore silenziose**
   - ON/OFF
   - Start/End (es. 22:00–08:00)
   - Applicazione:
     - per local schedule: non programmare in fascia silenziosa
     - per push: se possibile filtra lato server o “mute” lato client

---

## UI — NotificationsScreen (struttura)
1) **Stato sistema**
   - “Notifiche di sistema: Attive / Disattivate”
   - CTA: “Apri impostazioni”
2) **Switch master**
   - “Abilita notifiche in Step Ritual”
3) **Sezione Categorie** (cards o list items)
   - Ogni categoria ha:
     - titolo + descrizione breve
     - toggle ON/OFF
     - chevron “Dettagli” → apre sotto‑menu (screen/modal)

### Regole UI
- Se master OFF → tutte le categorie disabilitate (toggle grigi)
- Se OS denied → mostra warning e CTA “Apri impostazioni”
- Cambiare toggle deve aggiornare immediatamente lo stato UI (optimistic) ma salvare anche persistente.

---

## Persistenza preferenze (OBBLIGATORIA)
Salvare preferenze per utente (backend + cache locale).

### Schema consigliato (esempio)
`notification_prefs` (o colonna json su users):
- `notifications_enabled` (master)
- `reminders_enabled`
- `reminder_time` (HH:mm)
- `reminder_days` (array int 1-7)
- `reminder_message` (string)
- `partner_alerts_enabled`
- `partner_alert_start` / `partner_alert_finish` (opzionale)
- `badges_enabled`
- `weekly_summary_enabled`
- `weekly_summary_day` (1-7)
- `weekly_summary_time` (HH:mm)
- `quiet_hours_enabled`
- `quiet_start` / `quiet_end`

### API
- `GET /api/notification-prefs` → ritorna prefs
- `PUT /api/notification-prefs` → aggiorna prefs (partial update ok)

---

## Comportamento tecnico (Expo)
### A) Master switch in Account
- ON:
  - se permesso OS non granted → `requestPermissionsAsync`
  - se granted → salva `notifications_enabled=true`
- OFF:
  - salva `notifications_enabled=false`
  - disabilita tutte le categorie
  - cancella local schedules

### B) Local schedules (Promemoria + Riepilogo)
- Quando una categoria local passa ON:
  - cancella schedule precedente per quella categoria (se esiste)
  - crea nuova schedule
  - salva l’ID schedule localmente (per cancellazioni future)
- Quando passa OFF:
  - cancella schedule e rimuovi id

### C) Push (Avvisi partner)
Se già avete push token + backend:
- al primo enable master:
  - registra push token e invialo al backend
- backend invia solo se `partner_alerts_enabled=true` e `notifications_enabled=true`

Se push non sono ancora implementate:
- salva la preferenza comunque
- UI può indicare “Disponibile a breve” ma il toggle deve rimanere coerente e persistito.

---

## Criteri di accettazione
- Dall’Account: switch Notifiche è reale e coerente con permesso OS + master pref
- NotificationsScreen mostra categorie con toggle e sotto‑menu
- Posso attivare SOLO alcune notifiche (es. promemoria sì, badge no)
- Le preferenze restano salvate dopo riavvio app / logout-login
- Se master OFF: nessuna schedule locale rimane attiva
- Se OS denied: non “finge” di attivare; mostra guida e CTA impostazioni

---

## Output richiesto
- `NotificationsScreen` completo (stato sistema + master + categorie + sotto‑menu)
- Persistenza preferenze (API + store)
- Implementazione local notifications per Promemoria e Riepilogo
- (Opzionale) base push token + hook per avvisi partner
