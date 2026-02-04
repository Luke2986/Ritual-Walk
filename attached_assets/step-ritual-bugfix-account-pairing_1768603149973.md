# Step Ritual — BUGFIX: Pairing “Account” (invita vs inserisci codice) — logica stati corretta
## Problema (come descritto)
Nella schermata **Account** c’è confusione:
- non riesco a **inserire un codice quando voglio**
- sembra che “solo chi fa login per primo” riesca a fare una cosa (es. inserire) ma non può **invitare** l’altro
- quindi il flusso “Invita → Partner inserisce → Collegamento” non è chiaro né sempre disponibile

Questo indica che la UI sta usando condizioni sbagliate (es. `if user.couple_id != null` nasconde tutto) oppure che lo stato `pending/active` non viene gestito, o che dopo generate/join non viene fatto refetch del profilo.

---

## Obiettivo
Rendere il pairing **deterministico e chiaro** in Account:
- **Qualsiasi utente NON ancora in coppia** deve poter:
  1) **Generare codice invito** (Invita)
  2) **Inserire codice** (Ho un codice)
- Se l’utente ha **già generato un invito pending**, deve vedere:
  - codice + copia + condividi
  - stato “In attesa…”
  - (opzionale) annulla / rigenera
- Se la coppia è **active**, mostra partner e nascondi controlli pairing.
- Nessuna dipendenza dal “chi logga per primo” (bug).

---

## Modello stati (source of truth)
La UI NON deve basarsi solo su `user.couple_id`.
Deve usare anche lo stato coppia dal backend, es:

`me = { id, name, coupleId, couple: { id, status, inviteCode, createdByUserId, expiresAt }, partner: { id, name, avatarUrl } }`

### Stati UI
1) **UNPAIRED**
- `coupleId == null`
- UI: mostra **due azioni**: “Genera codice” + “Inserisci codice”
2) **PENDING_INVITER**
- `couple.status == 'pending'` AND `couple.createdByUserId == me.id`
- UI: mostra **codice invito** + Copia/Condividi + “In attesa”
- “Inserisci codice” disabilitato/nascosto (per evitare self-pair)
3) **ACTIVE**
- `couple.status == 'active'`
- UI: mostra “Sei collegato con {partner.name}” e nascondi controlli pairing

---

## Task A — Backend: endpoint per leggere stato pairing (se manca)
Aggiungi/aggiorna:
- `GET /api/me` (o equivalente) per includere:
  - `user.couple_id`
  - dati `couple` (status, invite_code, created_by_user_id, expires_at)
  - `partner` (altro user con stesso couple_id) se status active

> IMPORTANT: dopo `generate` o `join`, la UI deve fare **refetch** di `GET /api/me`.

---

## Task B — Account UI: card “Partner” pulita
Nella schermata Account crea una sezione/card “Partner” con 3 possibili rendering:

### Stato 1: UNPAIRED
Mostra:
- Bottone primary: **Genera codice invito**
- Input + bottone: **Inserisci codice** / **Collega**
- Helper text: “Condividi il codice con la tua compagna/o per collegarvi.”

### Stato 2: PENDING_INVITER
Mostra:
- Titolo: “Invito in attesa”
- Codice grande (invite_code)
- Bottoni: “Copia” + “Condividi”
- Testo piccolo: “Scade il …” (se expiresAt esiste)
- Bottone secondario: “Annulla invito” (DELETE /api/couple/invite o simile) oppure “Rigenera”

### Stato 3: ACTIVE
Mostra:
- “Sei collegato con {partner.name}”
- avatar se disponibile
- (opzionale) “Scollega” con conferma

---

## Task C — Fix logica: niente “solo chi logga per primo”
Nel codice Account:
- rimuovi condizioni tipo:
  - “se couple_id esiste mostra solo X e nascondi tutto”
- sostituisci con lo state machine sopra basato su:
  - `coupleId`
  - `couple.status`
  - `couple.createdByUserId`

---

## Task D — Refetch & sincronizzazione UI
Dopo:
- `POST /api/couple/generate`
- `POST /api/couple/join`

Esegui:
- refetch `GET /api/me`
- aggiorna lo store globale user
- aggiorna UI immediatamente

Se esiste pull-to-refresh in Account: mantenerlo, ma non affidarsi solo a quello.

---

## Regole di validazione (obbligatorie)
- Se user già in coppia → blocca generate/join con messaggio.
- Se codice scaduto/inesistente/usato → errore chiaro.
- Non permettere self-pair (createdByUserId == me.id).
- Race condition join: solo un join deve riuscire (transaction lato server).

---

## Criteri di accettazione
1) Due account A e B, entrambi UNPAIRED:
- in Account vedono **sia** “Genera codice” **sia** “Inserisci codice”
2) A genera codice:
- A vede “Invito in attesa” con codice + copia/condividi
- B resta UNPAIRED e può inserire codice
3) B inserisce codice:
- entrambi diventano ACTIVE e vedono partner in Account
4) Nessuna dipendenza dal “chi logga per primo”.
