# Pizza Dough Calculator

A small, dependency-free web app that scales any pizza dough style to a precise
batch and tunes the yeast amount to your fermentation time and temperature. It
runs as a Progressive Web App (PWA): host it on GitHub Pages and "Add to Home
Screen" on a phone for an app-like, offline-capable experience.

You tell it: style, flour, cooking method, yeast type, dough-ball size, how many
balls, and your room-temperature and cold (fridge) rise times. It gives back a
gram-by-gram recipe (with an optional cups/spoons fallback for people without a
scale) plus bake guidance.

## Run it locally

It is plain HTML/CSS/JS - no build step. But the service worker needs `http://`,
not `file://`, so use any static server:

```bash
# from this folder
python -m http.server 8000
# then open http://localhost:8000
```

## Deploy to GitHub Pages

No build, no Actions workflow needed:

1. Push this repo to GitHub.
2. Repo **Settings -> Pages**.
3. Source: **Deploy from a branch**, branch **main**, folder **/ (root)**.
4. Wait a minute, then open `https://<you>.github.io/pizza/`.

The `.nojekyll` file stops GitHub from running Jekyll. All asset paths are
relative, so it works under the `/pizza/` subpath. On a phone, use the browser's
"Add to Home Screen" to install it.

## Project layout

```
index.html              single-screen app (inputs + live results)
css/styles.css          mobile-first styling
js/data.js              style presets, flour/yeast data, yeast grid, conversions
js/dough.js             pure dough math (no DOM) - the part that ports to Node/React
js/app.js               DOM wiring: read inputs -> dough.js -> render
js/register-sw.js       service-worker registration
service-worker.js       offline app-shell cache
manifest.webmanifest    PWA metadata
icons/                  app icons + make_icons.py (regenerates them)
```

## How the yeast math works

The yeast amount is the hard part. There is **no single published formula** (the
well-known TXCraig1 model is proprietary), so this app combines two open pieces:

1. **An anchor table** of instant-dry-yeast (IDY) baker's percentages by time and
   room temperature, from dough.school (consistent with the TXCraig1 chart and
   the Pizzapp calculator). See `YEAST_GRID` in `js/data.js`. Values between grid
   points are interpolated in log space.
2. **A Q10 fermentation model** (yeast activity changes ~2.5x per 10 C) to:
   - collapse a two-stage **room + fridge** rise into one "effective"
     room-temperature time:
     `effHours = roomHours + coldHours * 2.5^((coldTempC - roomTempC) / 10)`,
   - and extrapolate beyond the table's temperature range.

The resulting IDY % is converted to your chosen yeast type:
**IDY x1, active dry x1.21, fresh/cake x3** (since IDY = 0.33x fresh,
ADY = 0.40x fresh). Treat the output as a well-grounded estimate, not a
guarantee - real dough also depends on flour, salt, and your kitchen.

### Sanity-check values

- 24 h at 22 C, single stage -> ~0.08% IDY (Pizzapp reports ~0.1% at 24 h/22 C).
- Same total time, more of it cold, needs **more** yeast:
  24 h all-room (~0.08%) < 2 h room + 22 h fridge (~0.62%) < 24 h all-fridge (~1.0%).
- Neapolitan, 260 g x 2, 8 h at 20 C -> flour ~318 g, water ~191 g (60%),
  salt ~8.9 g (2.8%), yeast ~1.6 g IDY (0.5%).

## Styles and ingredients

Each style auto-fills traditional baker's percentages (hydration, salt, oil,
sugar), a default ball weight, a recommended flour, and a fermentation plan. Every
value is editable under **Customize percentages**. Neapolitan is the purist (no
oil or sugar); New York, Detroit, tavern, Sicilian, and home-oven pan add a little
oil (and a little sugar for browning). Sources for the ranges are below.

## Units

Grams are the default and most accurate. Toggle **Show cups / spoons** for a
volume fallback. Flour cup-weight genuinely varies (~120-140 g/cup by method), so
volume measures are approximate - a kitchen scale is strongly recommended,
especially for the tiny yeast amounts. Salt spoon amounts depend on crystal type
(table vs Diamond Crystal vs Morton), so pick your salt when using volumes.

## Regenerating the icons

```bash
python icons/make_icons.py   # needs Pillow: pip install pillow
```

Replace `icons/icon-192.png` / `icon-512.png` with real artwork any time.

## Migrating to Node/React later

The math in `js/dough.js` and the data in `js/data.js` are pure and DOM-free, so
they port to a Node/React build unchanged - only `index.html` + `app.js` (the UI)
would be rebuilt as components. No lock-in.

## Sources

- dough.school yeast calculator (anchor table): https://www.dough.school/guides/yeast-calculator
- TXCraig1 yeast prediction model (PizzaMaking forum): https://www.pizzamaking.com/forum/index.php?topic=26831.0
- Pizzapp dough calculator overview: https://www.outdoorpizzachef.com/how-to-use-pizzapp-best-dough-calculator/
- miniwebtool fermentation calculator (Q10 = 2.5 for dough): https://miniwebtool.com/fermentation-time-calculator/
- King Arthur, active dry vs instant yeast + weight chart: https://www.kingarthurbaking.com/blog/2022/08/15/active-dry-versus-instant-yeast , https://www.kingarthurbaking.com/learn/ingredient-weight-chart
- PizzaBlab yeast guide and dough formulas: https://www.pizzablab.com/learning-and-resources/ingredients/guide-to-yeast/ , https://www.pizzablab.com/recipes/pizza-dough-formulas/
- Neapolitan (AVPN) dough guide: https://fond.kitchen/guides/pizza-dough/neapolitan-pizza-dough/
- Detroit-style recipe: https://www.pizzablab.com/recipes/detroit-style-pizza-recipe/
- Chicago tavern-style (Ooni / John Carruthers): https://ooni.com/blogs/recipes/john-carruthers-chicago-tavern-style-pizza
- NY Sicilian: https://www.sipandfeast.com/new-york-sicilian-pizza/
- Wordloaf volume-to-gram chart: https://newsletter.wordloaf.org/handy-dandy-conversion-chart-664/
