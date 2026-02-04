# Step Ritual — TASK: Pull‑to‑Refresh SOLO su 4 schermate (progetto esistente)
## Schermate abilitate: **Home**, **Premi**, **Storia**, **Account**
## Schermate escluse: **Camminata / Live tracking** (NO pull‑to‑refresh)

---

## Obiettivo
Abilitare il **Pull‑to‑Refresh** (gesture “trascina verso il basso” → spinner → refetch dati reali → stop spinner) **solo** nelle seguenti 4 schermate:

1) Home (tab “Oggi”)
2) Premi
3) Storia / Storico
4) Account

**Non** implementarlo nella schermata **Camminata / Live tracking** (per evitare conflitti con gesture e tracking GPS).

---

## Requisiti comuni (IMPORTANTISSIMI)
- Niente dati inventati: il refresh deve ricaricare **dati reali** dalle sorgenti già presenti (store/API/DB).
- Offline o errore rete:
  - lo spinner **si ferma sempre**
  - mostra un messaggio breve: “Sei offline: dati non aggiornati”.
- Evita refresh simultanei:
  - se `refreshing === true`, ignora nuove richieste.
- Non cambiare navigazione/tab bar.

---

## Strategia tecnica (da seguire)
### 1) Wrapper riutilizzabile
Crea un componente comune:
- `components/RefreshableScreen.tsx`

Che usa:
- `ScrollView` + `RefreshControl`
- `contentContainerStyle={{ flexGrow: 1 }}` per far funzionare il pull anche con poco contenuto
- props:
  - `onRefresh: () => Promise<void>`
  - `children`
  - (opzionale) `style`, `contentContainerStyle`

### 2) Regola per le liste
Se una screen usa una **FlatList** come contenitore principale:
- NON avvolgere in ScrollView
- usa direttamente:
  - `refreshing={refreshing}`
  - `onRefresh={onRefresh}`

Quindi:
- screen “lista” → refresh su `FlatList`
- screen “contenuto” → `RefreshableScreen`

---

## Implementazione per schermata (cosa deve refreshare)

### A) HOME (Oggi)
`refreshHome()` deve aggiornare:
- profilo/streak/kpi in alto
- stato partner (pending/active + nome/avatar se collegato)
- camminate recenti
- eventuali mini statistiche / mini chart in home

### B) PREMI
`refreshPremi()` deve aggiornare:
- badge sbloccati
- progress verso prossimi badge
- streak/achievement counters collegati ai premi

### C) STORIA / STORICO
`refreshStoria()` deve aggiornare:
- elenco attività (se presente)
- statistiche (settimana/mese/anno)
- calendario progressi (se presente)
- qualunque aggregazione derivata dalle camminate reali

### D) ACCOUNT
`refreshAccount()` deve aggiornare:
- profilo utente
- impostazioni account (se vengono da backend)
- stato pairing/coppia (se mostrato qui)
- eventuali preferenze (lingua, notifiche, ecc.)

> Usa `Promise.allSettled([...])` per fare refetch paralleli senza bloccare tutto se uno fallisce.

---

## Schermata esclusa: CAMMINATA / LIVE TRACKING
- Non aggiungere RefreshControl
- Non inserire wrapper ScrollView solo per refresh
- Se serve un refresh dati in questa screen, si farà con un bottone dedicato (non richiesto ora)

---

## Istruzioni operative per l’Agent
1) Ispeziona il data layer esistente:
   - React Query? Zustand? Redux? fetch custom?
2) Implementa `RefreshableScreen.tsx`.
3) Applica pull‑to‑refresh SOLO a:
   - Home
   - Premi
   - Storia
   - Account
4) Verifica che la screen “Camminata” non venga toccata.
5) Implementa toast/alert breve su offline/errore.
6) Garantire `setRefreshing(false)` in `finally` sempre.

---

## Criteri di accettazione
- In Home, Premi, Storia, Account posso fare pull‑to‑refresh e vedo lo spinner
- I dati riflettono sorgenti reali (nessun mock)
- Offline: spinner si ferma + messaggio breve
- In Camminata NON compare pull‑to‑refresh
- Nessuna regressione di scroll (FlatList non avvolte da ScrollView)

---

## Output richiesto
- `components/RefreshableScreen.tsx`
- Modifiche alle 4 screen per abilitare pull‑to‑refresh
- Funzioni `refreshHome/refreshPremi/refreshStoria/refreshAccount` (o equivalenti) che riusano refetch esistenti
