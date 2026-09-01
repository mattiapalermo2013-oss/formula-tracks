# Piano: Gioco di corse 3D stile PolyTrack

## Obiettivo
Creare un sito con un mini-gioco di corse arcade in stile PolyTrack: grafica low-poly, una macchina guidabile, pista con salti, curve sopraelevate e cronometro, tutto giocabile nel browser.

## Cosa costruisco

### 1. Gioco 3D (pagina principale `/`)
- Rendering 3D con **Three.js** (via `@react-three/fiber` + `@react-three/drei`), caricato solo lato client.
- **Macchina low-poly** guidabile con tastiera:
  - `W/S` o frecce su/giù = accelerare/frenare-retromarcia
  - `A/D` o frecce sinistra/destra = sterzare
  - `R` = reset all'ultimo checkpoint, `Spazio` = freno a mano (opzionale)
- **Fisica arcade semplificata**: velocità, sterzo progressivo, derapata leggera, gravità per salti e atterraggi, collisione con i bordi pista.
- **Pista low-poly** costruita a blocchi: rettilinei, curve, rampe/salti, una sezione sopraelevata, checkpoint e traguardo.
- **Camera inseguimento** dietro la macchina con leggero effetto velocità (FOV dinamico).

### 2. HUD di gioco
- Cronometro giro/tempo totale, velocità in km/h, indicatore checkpoint.
- Schermata iniziale "Premi per iniziare" con i comandi.
- Schermata fine giro con tempo e pulsante per ricominciare.

### 3. Estetica
- Stile low-poly fedele a PolyTrack: cielo azzurro con sole, erba/terreno verde, pista grigia con bordi rosso-bianchi, alberi e rocce geometriche.
- Palette e font coerenti definite come token in `src/styles.css` (niente colori hardcoded nei componenti UI/HUD).
- UI/HUD minimale: tipografia bold geometrica, nessun elemento superfluo.

### 4. Dettagli tecnici
- Three.js caricato dinamicamente (no SSR) per compatibilità con il runtime.
- Loop di gioco con `requestAnimationFrame`, delta-time per fisica stabile.
- Nessun backend: tutto client-side, nessun database.
- Metadata SEO dedicati sulla route index (titolo, description, og tag).

## Struttura file (indicativa)
```text
src/routes/index.tsx          → pagina che monta il gioco (ClientOnly)
src/game/Track.tsx            → pista a blocchi low-poly
src/game/Car.tsx              → macchina + fisica arcade
src/game/GameScene.tsx        → scena, luci, camera, loop
src/game/Hud.tsx              → cronometro, velocità, overlay
src/styles.css                → token colore/font del tema
```

## Fuori scope (per ora)
Multiplayer, editor di piste, classifiche online, salvataggio record su database — aggiungibili in seguito se vuoi.
