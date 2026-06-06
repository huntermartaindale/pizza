/*
 * data.js - reference data for the pizza dough calculator.
 *
 * All numbers are baker's percentages (fraction of flour weight) unless noted.
 * Sources are cited inline. This file is plain data + no logic, so it ports
 * unchanged to a future Node/React build.
 *
 * Attached to window.PIZZA_DATA so classic <script> loading works without a
 * build step (and even from file:// for quick checks).
 */
(function (root) {
  "use strict";

  /*
   * STYLE PRESETS
   * hydration / salt / oil / sugar are baker's-% fractions (0.62 = 62%).
   * ball = default dough-ball weight in grams.
   * ferment = sensible default fermentation plan for the style.
   * bake = { oven: {tempF, note}, home: {tempF, note} } guidance by method.
   * tempF is the primary value (rounded to a settable interval; home ovens capped
   * at 550 F). Celsius is derived for display. Notes omit the temp (the bake line
   * already shows it).
   * Ranges and conventions from the sourced research (see README "Sources").
   */
  var STYLES = {
    neapolitan: {
      label: "Neapolitan",
      hydration: 0.60, salt: 0.028, oil: 0.0, sugar: 0.01, sweetener: false, noSweetener: true,
      ball: 260,
      recommendedFlour: "00",
      ferment: { roomHours: 8, roomTempC: 20, coldHours: 0, coldTempC: 4 },
      bake: {
        oven: { tempF: 850, note: "60-90 s in a wood/gas pizza oven." },
        home: { tempF: 550, note: "Home ovens can't reach Neapolitan heat - use a stone or steel at max with the broiler; the crust will differ." }
      },
      needsHotOven: true,
      desc: "Purist dough: flour, water, salt, yeast only. Soft, blistered, very high heat."
    },
    newyork: {
      label: "New York",
      hydration: 0.62, salt: 0.022, oil: 0.02, sugar: 0.015, sweetener: true,
      ball: 280,
      recommendedFlour: "bread",
      ferment: { roomHours: 2, roomTempC: 21, coldHours: 24, coldTempC: 4 },
      bake: {
        oven: { tempF: 600, note: "5-7 minutes; rotate once." },
        home: { tempF: 550, note: "On a stone or steel near max, 8-12 minutes." }
      },
      needsHotOven: false,
      desc: "Foldable, chewy, light oil + sugar for browning. Cold-ferments well."
    },
    detroit: {
      label: "Detroit (pan)",
      hydration: 0.72, salt: 0.02, oil: 0.02, sugar: 0.01, sweetener: false,
      ball: 540,
      recommendedFlour: "bread",
      ferment: { roomHours: 2, roomTempC: 21, coldHours: 24, coldTempC: 4 },
      bake: {
        oven: { tempF: 500, note: "Parbake, then finish; ~8-10 minutes total." },
        home: { tempF: 475, note: "Oiled steel pan, 12-15 minutes." }
      },
      needsHotOven: false,
      desc: "Thick, airy, crispy cheese edge. High hydration; baked in an oiled pan."
    },
    tavern: {
      label: "Tavern / thin",
      hydration: 0.52, salt: 0.01, oil: 0.08, sugar: 0.01, sweetener: false,
      ball: 300,
      recommendedFlour: "bread",
      ferment: { roomHours: 2, roomTempC: 21, coldHours: 24, coldTempC: 4 },
      bake: {
        oven: { tempF: 550, note: "Rolled thin and docked; 5-8 minutes." },
        home: { tempF: 525, note: "Roll thin, dock, and bake on a stone or steel until crisp." }
      },
      needsHotOven: false,
      desc: "Cracker-thin Chicago tavern cut: very low hydration, high oil."
    },
    sicilian: {
      label: "Sicilian (pan)",
      hydration: 0.72, salt: 0.02, oil: 0.04, sugar: 0.01, sweetener: false,
      ball: 380,
      recommendedFlour: "bread",
      ferment: { roomHours: 2, roomTempC: 21, coldHours: 24, coldTempC: 4 },
      bake: {
        oven: { tempF: 450, note: "Parbake ~12 minutes, then finish." },
        home: { tempF: 425, note: "Oiled pan, 18-22 minutes." }
      },
      needsHotOven: false,
      desc: "Thick square pan pizza; oily, open crumb, parbaked."
    },
    pan: {
      label: "Home-oven pan",
      hydration: 0.75, salt: 0.02, oil: 0.02, sugar: 0.01, sweetener: false,
      ball: 350,
      recommendedFlour: "bread",
      ferment: { roomHours: 2, roomTempC: 21, coldHours: 24, coldTempC: 4 },
      bake: {
        oven: { tempF: 500, note: "Oiled pan; ~10-12 minutes." },
        home: { tempF: 475, note: "Oiled cast iron or pan, 12-15 minutes." }
      },
      needsHotOven: false,
      desc: "Forgiving high-hydration dough for a standard home oven and pan."
    }
  };

  /*
   * FLOUR TYPES
   * cupG = grams per US cup (King Arthur fluff-and-sprinkle values). Used only
   * for the imperial/volume fallback. note = guidance shown in the UI.
   */
  var FLOURS = {
    "00": { label: "00 (Italian)", cupG: 106, note: "Finely milled; best for high-heat Neapolitan." },
    bread: { label: "Bread flour", cupG: 120, note: "High protein; chewy NY / pan / Detroit." },
    ap: { label: "All-purpose", cupG: 120, note: "Versatile; fine for most home styles." },
    ww: { label: "Whole wheat", cupG: 113, note: "Often blended in; absorbs more water." }
  };

  /*
   * YEAST TYPES
   * factorFromIDY = multiply IDY weight by this to get the equivalent weight of
   * this yeast type. IDY = 0.33x fresh, ADY = 0.40x fresh, so:
   *   ADY  = IDY * (0.40/0.33) = 1.21
   *   fresh = IDY * 3
   * (Consensus from King Arthur, PizzaBlab, The Fresh Loaf - see README.)
   */
  var YEAST = {
    idy: { label: "Instant dry (IDY)", factorFromIDY: 1.0, note: "Mix straight into the flour, no proofing." },
    ady: { label: "Active dry (ADY)", factorFromIDY: 1.21, note: "Bloom in warm water (~40 C) with a pinch of sugar before mixing." },
    fresh: { label: "Fresh / cake", factorFromIDY: 3.0, note: "Crumble into the water; perishable, keep refrigerated." }
  };

  /*
   * PREFERMENTS - make-ahead flour+water+yeast cultures mixed into the dough.
   * hydration = water as a fraction of the preferment's own flour
   * (poolish = 100%, biga = ~50%). Salt/oil/sugar never go in the preferment.
   */
  var PREFERMENTS = {
    none: { label: "None (straight dough)" },
    poolish: {
      label: "Poolish (liquid, 100%)", hydration: 1.0,
      note: "Equal parts flour and water; pourable. Adds extensibility and a mild, nutty flavor.",
      timeNote: "Typical: 8-16 h at room temperature, until bubbly and just starting to dome on top."
    },
    biga: {
      label: "Biga (stiff, ~50%)", hydration: 0.5,
      note: "Stiff and shaggy; tear into the final mix. Adds strength and a deeper aroma.",
      timeNote: "Typical: 12-18 h, often a bit cooler (60-64 °F / 16-18 °C) for a stiff biga."
    }
  };

  // Default preferment plan (independent of pizza style; all editable).
  var PREFERMENT_DEFAULTS = { flourPct: 0.30, hours: 12, tempC: 20 };

  /*
   * YEAST PREDICTION GRID  -  IDY baker's % to reach a ripe dough.
   * Rows = total fermentation hours at a steady room temperature.
   * Cols = room temperature in C.
   * Published table from dough.school (corroborated by Pizzapp / TXCraig1 chart):
   *   https://www.dough.school/guides/yeast-calculator
   * Cells marked /*calc*\/ were extrapolated to complete the rectangular grid
   * (continuing the table's ~0.5-0.6x-per-+5C trend); the model is labeled an
   * estimate in the UI. Values are PERCENT (1.50 = 1.50% of flour).
   */
  var YEAST_GRID = {
    temps: [20, 25, 30],
    hours: [4, 6, 8, 12, 24, 48, 72],
    //          20C    25C    30C
    pct: [
      /*  4h */ [1.50, 1.00, 0.70],
      /*  6h */ [0.80, 0.50, 0.35],
      /*  8h */ [0.50, 0.30, 0.20],
      /* 12h */ [0.25, 0.15, 0.10],
      /* 24h */ [0.10, 0.05, 0.03],
      /* 48h */ [0.04, 0.02, 0.010 /*calc*/],
      /* 72h */ [0.02, 0.012 /*calc*/, 0.007 /*calc*/]
    ]
  };

  // Q10 temperature coefficient for yeasted dough (miniwebtool / van't Hoff).
  // Used to collapse a two-stage room+cold ferment into one effective time and
  // to extrapolate beyond the grid's temperature range.
  var Q10 = 2.5;

  /*
   * UNIT CONVERSIONS for the imperial/volume fallback.
   * Liquid/small-ingredient gram weights are well-agreed; flour is not (see
   * FLOURS.cupG and the caveat below). Salt depends heavily on crystal type.
   */
  var CONVERSIONS = {
    waterGPerCup: 227,     // King Arthur (1 cup water ~ 227 g)
    oilGPerTbsp: 14,       // 1 tbsp olive oil ~ 14 g
    sugarGPerTsp: 4.3,     // 1 tsp granulated sugar ~ 4.3 g
    yeastGPerTsp: 3.0,     // 1 tsp IDY/ADY ~ 3 g (imprecise at sub-gram amounts)
    salt: {
      fine: { label: "Table / fine sea", gPerTsp: 6.0 },
      diamond: { label: "Diamond Crystal kosher", gPerTsp: 2.8 },
      morton: { label: "Morton kosher", gPerTsp: 3.6 }
    },
    tspPerTbsp: 3,
    tspPerCup: 48,
    flourCaveat:
      "Volume measures are approximate. Flour packs differently by method " +
      "(roughly 120-140 g per cup), so a kitchen scale set to grams is much " +
      "more accurate - especially for the tiny yeast amounts."
  };

  root.PIZZA_DATA = {
    STYLES: STYLES,
    FLOURS: FLOURS,
    YEAST: YEAST,
    PREFERMENTS: PREFERMENTS,
    PREFERMENT_DEFAULTS: PREFERMENT_DEFAULTS,
    YEAST_GRID: YEAST_GRID,
    Q10: Q10,
    CONVERSIONS: CONVERSIONS
  };
})(typeof window !== "undefined" ? window : this);
