# IfacGalaxy 🪐

**Simulatore 3D interattivo di esopianeti** — l'erede galattico di [SistemaSolare](https://github.com/manzolo/SistemaSolare).

[English version](README.en.md)

Naviga in 3D tra i sistemi esoplanetari reali del catalogo NASA, dalle orbite del
Sistema Solare fino a Kepler-90 a 2.767 anni luce. Tutte le stelle, le distanze e
le orbite sono ai valori reali: ti sposti in un **mondo continuo** dove 1 unità =
1 Unità Astronomica e lo zoom va dal raggio di un pianeta all'intera bolla locale
della Galassia.

## ✨ Caratteristiche

- **Catalogo reale**: ~100 sistemi curati con schede divulgative (TRAPPIST-1,
  Proxima, 51 Peg, Kepler-90…) + l'intero NASA Exoplanet Archive (4.700 sistemi,
  6.300 pianeti) caricabile con un toggle.
- **Cielo vero in 3D**: ~9.000 stelle visibili a occhio nudo (catalogo HYG) alle
  loro vere distanze — spostandoti tra i sistemi la prospettiva, la luminosità e
  le **costellazioni si deformano in modo fisicamente corretto**.
- **Orbite kepleriane**: equazione di Keplero risolta in tempo reale, elementi
  orbitali dal catalogo, piano orbitale orientato secondo l'inclinazione misurata.
  Il Sistema Solare usa le effemeridi JPL (verificate nei test).
- **Vista da un pianeta** 👁: mettiti sulla superficie di TRAPPIST-1 e e guarda
  gli altri pianeti grandi come lune, oppure cerca il Sole: una stellina di
  mag 5,3 a malapena visibile. Dalla Terra, il cielo coincide con quello reale.
- **Schede informative** per ogni stella e pianeta: dati fisici e orbitali, metodo
  di scoperta, zona abitabile, confronto dimensioni con la Terra, badge per i
  dati stimati.
- **Controlli da osservatorio**: velocità del tempo (da ore a millenni al
  secondo), data configurabile, scala dimensioni, compressione orbite,
  luminosità, ricerca globale, filtri per metodo di scoperta e distanza.
- **Bilingue** 🇮🇹/🇬🇧, mobile-friendly, deep-link condivisibili
  (`?focus=trappist-1`).

## 🚀 Avvio

```bash
npm install
npm run dev        # sviluppo su http://localhost:5173
npm run build      # produce dist/index.html (singolo file) + dist/data/
npm run test       # unit test (solver di Keplero, coordinate, effemeridi)
npm run data:build # rigenera i dataset da NASA/HYG/d3-celestial
```

La build è un **singolo file HTML** (~600 KB) più i dataset JSON, deployabile su
qualunque hosting statico (GitHub Pages incluso).

## 🔭 Architettura

| Aspetto | Scelta |
|---|---|
| Rendering | Three.js, log depth buffer, shader custom per le stelle |
| Scale | Mondo continuo in UA, floating origin sul sistema selezionato |
| Dati | Pipeline offline → JSON statici (`tools/`), nessuna API a runtime |
| Coordinate | Frame equatoriale J2000, conversioni testate vs effemeridi |
| Orbite | Solver di Keplero (Newton-Raphson), stabile fino a e≈0,95 |

Le stelle ricalcolano la magnitudine apparente **dalla posizione della camera**
nello shader: avvicinandoti a un sistema le sue stelle vicine si accendono, e il
Sole sbiadisce alle spalle.

## 👥 Crediti

Da un'idea di **Massimo Bianchini**, con l'aiuto di **Moreno Comelli**.
Realizzazione tecnica: **Andrea Manzi** ([manzolo](https://github.com/manzolo)).

## 📚 Fonti dati

Vedi [NOTICE.md](NOTICE.md). In sintesi: NASA Exoplanet Archive (pscomppars),
HYG Database v4.1 (CC BY 4.0), d3-celestial / Stellarium (BSD-3), elementi
orbitali planetari JPL.

## Licenza

MIT — vedi [LICENSE](LICENSE).
