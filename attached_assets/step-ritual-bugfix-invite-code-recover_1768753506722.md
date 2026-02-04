# Step Ritual — BUGFIX CRITICO: il codice invito non si genera/più e non è recuperabile dopo re-login
## Sintomo (come riportato)
- Una volta creato un codice invito, **al login successivo** non è più possibile:
  - rigenerarlo
  - rivederlo
  - “rinviarlo”/condividerlo di nuovo
- In alcuni casi il bottone “Genera codice” non produce nulla.
- Scenario reale: un account è stato perso e ricreato, quindi serve che l’altro partner possa **recuperare e reinviare** il codice (se l’invito è ancora pending) o **rigenerarlo** (se scaduto/rotto).

## Diagnosi probabile
1) La UI usa **stato locale** invece della sorgente DB, quindi dopo re-login “non sa” che esiste un invito pending.
2) L’endpoint `POST /api/couple/generate` non è **idempotente**: se l’utente ha già `couple_id`, torna errore o non ritorna l’invite_code.
3) La risposta di `GET /api/me` non include i dati `couple` (status, invite_code, expiresAt), quindi l’app non può ricostruire lo stato dopo riapertura.
4) Esistono casi incoerenti: couple `pending` ma `invite_code` NULL (bug) → UI resta bloccata.

---

# OBIETTIVO
Rendere il sistema “invite code” robusto:
- Il codice invito deve essere **persistito nel DB** e **sempre recuperabile** finché l’invito è `pending` e non scaduto.
- Dopo ogni login, l’utente che ha creato l’invito deve poter:
  - vedere il codice
  - copiarlo/condividerlo
  - rigenerarlo (se vuole o se scaduto)
- Il bottone “Genera codice” deve funzionare **anche al secondo/terzo login**.

---

# Task A — Backend: rendere `generate` idempotente e “recoverable”
## Endpoint: `POST /api/couple/generate`
Comportamento richiesto (Auth required):

### Caso 1 — Utente UNPAIRED
- Se `users.couple_id IS NULL`:
  - crea `couples` con `status='pending'`, `invite_code` univoco, `expires_at=now()+24h`, `created_by_user_id=me.id`
  - setta `users.couple_id = couples.id`
  - ritorna `{ invite_code, expires_at, couple_id }`

### Caso 2 — Utente ha già `couple_id`
Carica la coppia associata:
- Se `couple.status='pending'` **e** `created_by_user_id == me.id`:
  - Se `invite_code` esiste e `expires_at > now()`:
    - **ritorna lo stesso codice** (RECOVER) `{ invite_code, expires_at, couple_id }`
  - Se scaduto (`expires_at <= now()`) **oppure** `invite_code` è NULL:
    - rigenera **in place** (UPDATE sulla stessa riga):
      - nuovo `invite_code` univoco
      - nuovo `expires_at=now()+24h`
    - ritorna il nuovo `{ invite_code, expires_at, couple_id }`
- Se `couple.status='active'`:
  - 409 `ALREADY_PAIRED`
- Se `couple.status='archived'` (o stato non attivo):
  - ripulisci: `UPDATE users SET couple_id=NULL WHERE id=me.id`
  - poi ripeti Caso 1 (crea nuovo pending)

### Concorrenza / unicità
- `invite_code` deve avere vincolo UNIQUE (già previsto).
- In caso di collisione: retry max 5.

> IMPORTANT: questo endpoint deve SEMPRE rispondere con un codice valido quando l’utente è inviter e la coppia è pending (anche al secondo login).

---

# Task B — Backend: endpoint/risposta per leggere lo stato dopo login
Aggiorna `GET /api/me` (o endpoint equivalente) per includere:
- `couple_id`
- `couple: { id, status, invite_code, created_by_user_id, expires_at }` (se esiste)
- `partner` se `status='active'` (profilo minimo)

Così la UI può ricostruire lo stato “pending inviter” e mostrare il codice senza rigenerarlo.

---

# Task C — Backend: rigenera/cancella esplicito (UI)
Aggiungere endpoint dedicati (opzionali ma consigliati):

## `POST /api/couple/regenerate`
- Forza rigenerazione codice se `pending` e `created_by_user_id==me.id`
- Aggiorna `invite_code` + `expires_at`
- ritorna nuovo `{ invite_code, expires_at }`

## `POST /api/couple/cancel-invite`
- Se `pending` e inviter:
  - set `users.couple_id=NULL` per me
  - archivia `couples` (status archived, invite_code NULL)
- ritorna `{ ok:true }`

---

# Task D — Frontend: UI Account “Partner” corretta (state machine)
La UI NON deve dipendere da “primo login”.
Deve basarsi su:
- `me.couple_id`
- `me.couple.status`
- `me.couple.created_by_user_id`
- `me.couple.invite_code` + `expires_at`

## Stato 1: UNPAIRED
Mostra SEMPRE:
- Bottone: **Genera codice**
- Input: **Ho un codice** + bottone “Collega”

## Stato 2: PENDING_INVITER (pending + created_by == me)
Mostra:
- Codice grande (invite_code) + “Copia” + “Condividi”
- Label “In attesa” + “Scade il …”
- Bottone secondario: “Rigenera codice” (chiama regenerate oppure generate idempotente)
- Bottone secondario: “Annulla invito”

## Stato 3: ACTIVE
Mostra:
- “Sei collegato con {PartnerName}”
- (già previsto) “Scollega partner”

## Stato errore (pending ma invite_code mancante)
Mostra:
- messaggio: “Invito non valido, rigenera il codice”
- bottone “Rigenera”

### Refetch obbligatorio
Dopo:
- generate
- regenerate
- cancel
- join
fai refetch di `/api/me` e aggiorna lo store globale.

---

# Task E — Caso reale “ho perso il primo account”
Nota di prodotto:
- Se TU hai creato un nuovo account, il partner deve semplicemente:
  - aprire Account → vedere il codice pending → **condividerlo di nuovo**
  - se scaduto → “Rigenera”
- Se invece il codice era legato a un account che non esiste più (o non accessibile), serve un nuovo invito. Con le fix sopra, l’utente inviter può sempre rigenerare.

---

# Criteri di accettazione (test con 2 account)
1) A è UNPAIRED → genera codice → vede codice.
2) A fa logout/login → deve ancora vedere lo stesso codice (RECOVER).
3) A preme “Rigenera” → nuovo codice, quello vecchio non valido.
4) B inserisce codice → coppia ACTIVE.
5) A non può generare codice se ACTIVE (409).
6) Se pending scade → A può generare di nuovo e vede codice valido.
