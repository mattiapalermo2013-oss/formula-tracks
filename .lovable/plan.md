# Piano: montagne verdi ai bordi della mappa

## Obiettivo
Aggiungere montagne low-poly verdi lungo il perimetro esterno della mappa, senza coprire o attraversare nessuna pista, anche quando il tracciato viene modificato.

## Modifiche
- Calcolare i limiti reali della pista corrente e creare una fascia di sicurezza attorno al tracciato.
- Distribuire montagne geometriche irregolari soltanto oltre tale fascia, vicino ai bordi del terreno.
- Usare più tonalità di verde e forme low-poly coerenti con lo stile attuale.
- Generare la disposizione in modo deterministico, così non cambia casualmente a ogni caricamento.
- Verificare nel gioco che pista, box e montagne non si sovrappongano e che la scena resti fluida.

## Dettagli tecnici
Le montagne saranno raggruppate in poche mesh istanziate per mantenere basso il numero di elementi renderizzati. La distanza minima verrà controllata contro l'intero percorso tramite i campioni già usati dalla pista.
