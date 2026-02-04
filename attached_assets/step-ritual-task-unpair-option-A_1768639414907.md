# Step Ritual — TASK: Scollega Partner (UNPAIR) — **Opzione A**
## Policy scelta: mantieni storico personale, rimuovi accesso “di coppia” (NO riscrittura del passato)

### Obiettivo
Implementare una funzione **Scollega partner** che:
- riporta entrambi gli utenti a stato **UNPAIRED** (`users.couple_id = NULL`)
- rende **inaccessibili** tutte le viste “di coppia” (confronto, partner stats, calendario “insieme”, avvisi partner)
- **NON cancella** e **NON modifica** le camminate già registrate (storico personale intatto)
- non riscrive tag/relazioni “insieme” nel DB: semplicemente, dopo unpair, la UI/queries non devono più mostrarle come contenuti di coppia

---

## 1) Backend — Database (PostgreSQL + Drizzle)
### 1.1 Estendere `couples.status`
Attualmente: `pending | active`.  
Aggiungere: `archived`.

Aggiungere colonne:
- `archived_at` TIMESTAMP NULL
- `archived_by_user_id` UUID NULL (FK users.id)

Regola:
- quando `status='archived'`, `invite_code` deve essere `NULL` (non riutilizzabile).

> Migrazione Drizzle obbligatoria: enum + colonne.

### 1.2 Nota su “camminate insieme”
Non cancellare nulla.  
Se nel DB esistono campi come `together`, `shared_session_id`, `couple_id_at_time`, ecc.:
- **non** modificarli in questa policy.
- assicurarsi che, dopo unpair, nessuna endpoint/UI li usi per mostrare dati del partner o confronto.

---

## 2) Backend — Endpoint Unpair (Transazione atomica)
### Endpoint
`POST /api/couple/unpair` (Auth required)

### Validazioni
- Se `me.couple_id` è NULL → 409 `NOT_PAIRED`
- Carica `couple` per `me.couple_id`
  - deve esistere
  - deve essere `status='active'`
- Verifica membership: l’utente chiamante deve essere uno dei membri (users con quel couple_id)

### Transazione SQL (OBBLIGATORIA)
All’interno di UNA transazione:
1) Archivia la coppia con update condizionale:
   - `UPDATE couples
      SET status='archived', archived_at=now(), archived_by_user_id=:meId, invite_code=NULL
      WHERE id=:coupleId AND status='active'`
   - verifica `rowsAffected === 1` (se 0 → 409 `COUPLE_NOT_ACTIVE`)
2) Scollega entrambi:
   - `UPDATE users SET couple_id=NULL WHERE couple_id=:coupleId`
3) Cleanup preferenze partner alerts (se esiste sistema notifiche):
   - imposta `partner_alerts_enabled=false` per entrambi (o equivalente)
   - opzionale: revoca token/subscribe legati a couple

Risposta:
- 200 `{ ok: true }`

### Sicurezza / anti‑race
- l’update condizionale su `couples` evita doppi unpair e race.
- solo membri possono scollegare.

---

## 3) Backend — Coerenza API post-unpair (IMPORTANTISSIMO)
Aggiornare tutte le endpoint “di coppia” (stats confronto, partner info, calendario insieme, avvisi partner) con questa regola:

- Se `me.couple_id` è NULL → ritorna solo dati personali / oppure 200 con payload “no partner”
- Se `couple.status != 'active'` → stesso comportamento (no dati partner)
- Non deve mai essere possibile ricostruire i dati del partner tramite una `couple_id` archiviata.

In pratica:
- tutte le query devono filtrare per `couples.status='active'` quando serve accesso a contenuti “di coppia”.

---

## 4) Frontend — UI “Area Pericolosa” in Account
### Quando mostrare
Solo se lo stato coppia è **ACTIVE** (pair presente e couple active).

### Dove
In fondo ad Account: sezione “Area pericolosa” / “Gestione legame”.

### Bottone
- Label: **Scollega partner**
- Stile: distruttivo (Magenta `#FF2FB3` o stile destructive nativo)

### Conferma (obbligatoria)
Alert nativo:
- Titolo: “Interrompere il Rituale?”
- Messaggio: “Tornerete entrambi single. Non vedrete più statistiche condivise né confronto. Le tue camminate resteranno salvate.”
- Bottoni: [Annulla] [Sì, scollega] (distruttivo)

### Post‑azione
Dopo successo:
- refetch immediato di `/api/me` (o store globale)
- invalida cache query: profilo, partner, stats, calendario, notifiche
- redirect a “Oggi”
- toast: “Rituale interrotto. Sei tornato single.”

---

## 5) Frontend — Coerenza app dopo unpair
Dopo unpair:
- **Home**: card Partner torna a “Invita” / “Ho un codice”
- **Storia**:
  - rimuovi serie partner (viola) dai grafici
  - mostra solo “Io”
  - oppure mostra CTA: “Collega un partner per vedere il confronto”
- **Notifiche**:
  - disabilita “Avvisi partner” (se categoria esiste)

---

## 6) Criteri di accettazione (test con 2 account reali)
1) A e B sono collegati (active).
2) A → Account → Scollega partner → conferma.
3) DB:
   - `users.couple_id` è NULL per A e B
   - `couples.status='archived'`, `invite_code NULL`, `archived_at` valorizzato
4) App:
   - A torna in Home e vede “Invita”
   - B fa pull‑to‑refresh (Home/Account) e vede UNPAIRED
   - In Storia non appare più confronto partner
5) Storico:
   - le camminate personali restano visibili (nessuna cancellazione)
6) Notifiche partner:
   - nessuna notifica “partner alert” dopo unpair

---

## Output richiesto
- Migrazione Drizzle per `archived` + colonne
- Endpoint `POST /api/couple/unpair`
- Aggiornamento protezioni endpoint “di coppia” (richiedere couple active)
- UI Account: Area pericolosa + conferma + refresh stato
