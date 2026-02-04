# Step Ritual — TASK per Replit Agent (incrementale)
## Sezione: Tab “Storia” → Statistiche (High Contrast)

> **Nota importante (contesto di progetto):** l’app **esiste già** e ha navigazione, tab e dati.  
> Questo task NON deve ricreare l’app da zero: deve **modificare solo** la sezione “Storia → Statistiche”, rispettando lo stile Step Ritual e le schermate di riferimento allegate.

---

## 0) Cosa hai a disposizione (allegati)
- **UI kit / design tokens**: `step-ritual-ui-kit.md` (palette, componenti, radius, ecc.)
- **Reference UI**: immagini allegate (layout stile “day/week/month”, KPI grande, card in basso)
- **Reference mappa Strava**: già fornita in chat in precedenza (serve per coerenza app, non per questo task)

---

## 1) Obiettivo (MVP di questa consegna)
Implementare **prima la vista “Settimana”** nella sezione Statistiche del tab **Storia**, con:
- **Dual-Bar Chart** (Io vs Partner) ad alto contrasto **Blu/Violet**
- **Toggle a pillola** (3 opzioni) in alto: **[Settimana] [Mese] [Anno]**
  - In questa consegna deve funzionare **solo Settimana** (Mese/Anno possono essere placeholder).
  - Cambio vista con **transizione fade** (opacità) quando si selezionano le opzioni (anche se per ora 2 sono placeholder).
- **Riepilogo** sopra al grafico:  
  “**Insieme avete percorso X km questa settimana**”
- **Formattazione unità**:
  - Asse Y in **Km**
  - Se valore < 1 km, mostra in **metri** (es. 0.85 → “850m”)

> **Non implementare ancora il calendario** in questa consegna. Preparare però lo “slot” UI sotto al grafico dove verrà inserito il calendario nel task successivo.

---

## 2) Vincoli UI (Step Ritual)
Usare i token del kit:

### Colori
- Io (barra): `#00E5FF` (Electric Cyan)
- Partner (barra): `#B88BFF` (Lavender Pop)
- Bordo “insieme” (per futuro calendario): `#FFE66D` (Lemon Glow)
- Sfondo: `#FFF3D6` (Creamy Sand)
- Testo: `#1A1458` (Midnight Indigo)

### Stile barre
- Angoli superiori arrotondati: **radius 6**
- “Glow” leggero esterno (approssimazione RN ok):
  - iOS: shadowColor + shadowOpacity + shadowRadius
  - Android: elevation + (se possibile) overlay semitrasparente

### Layout / vibe
- Segmented control in alto stile reference (pillola, soft).
- KPI e riepilogo leggibili, numeri in evidenza (semibold/bold).
- Componenti con radius coerenti (card 16, pill 12–14, ecc. dal kit).

---

## 3) Librerie (scelta consigliata)
- Grafico: `react-native-gifted-charts` (o alternativa equivalente se già presente nel progetto).
- Se servono dipendenze richieste dalla chart library (es. `react-native-svg`), installare con i comandi corretti per Expo.

---

## 4) Istruzioni operative per l’Agent (molto importanti)
1. **Analizza il progetto esistente**:
   - Trova il tab “Storia” e la screen collegata (es. `HistoryScreen`, `StoriaScreen`, ecc.).
   - Individua dove viene renderizzata la sezione Statistiche (se non esiste, creala **dentro** quella screen senza cambiare la tab bar).
2. **Non rinominare / non riscrivere la navigazione**.
3. Crea componenti riutilizzabili (se il progetto ha già una struttura componenti, rispettala):
   - `TimeRangeToggle` (pillola 3 opzioni)
   - `WeeklyDualBarChart`
   - `formatDistance(valueKm)` helper (km/metri)
4. **Usa mock data solo se necessario per renderizzare**:
   - Se i dati reali esistono già (DB/store), collegati a quelli.
   - Se non è immediato, usa temporaneamente mock data e lascia un TODO + interfaccia pronta per collegare dati reali.

---

## 5) Dati (fallback mock per la settimana)
- `ioKm`: [0.8, 1.2, 0, 2.4, 1.1, 3.0, 0.6]
- `partnerKm`: [1.0, 0.4, 1.5, 0, 0.9, 2.2, 1.1]
- Giorni: Lun, Mar, Mer, Gio, Ven, Sab, Dom

Somma “insieme” = somma(ioKm) + somma(partnerKm)

---

## 6) Criteri di accettazione
- Nel tab “Storia” vedo una sezione “Statistiche”
- Toggle pill presente con 3 opzioni (Settimana selezionata)
- Grafico con 7 gruppi di barre affiancate (blu/viola), radius sopra 6 + glow leggero
- Valori < 1 km vengono mostrati in metri (es “850m”)
- Riepilogo: “Insieme avete percorso X km questa settimana”
- Nessuna regressione evidente su altre parti dell’app

---

## 7) Output richiesto
- Codice funzionante nel progetto esistente
- Dipendenze aggiunte solo se necessarie
- Commenti/NOTE brevi dove servirà collegare i dati reali (se non completato in questa consegna)
