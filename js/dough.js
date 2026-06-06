/*
 * dough.js - pure dough math. No DOM, no globals beyond the export object.
 *
 * Everything here is a plain function of its inputs, so it is unit-testable and
 * ports unchanged to a future Node/React build. Depends only on PIZZA_DATA.
 *
 * Exported as window.DOUGH (and module.exports if run under Node).
 */
(function (root, DATA) {
  "use strict";

  var Q10 = DATA.Q10;
  var GRID = DATA.YEAST_GRID;

  // ---- helpers ---------------------------------------------------------------

  function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }

  // Linear interpolation of y across x given two anchor points.
  function lerp(x, x0, x1, y0, y1) {
    if (x1 === x0) return y0;
    return y0 + (y1 - y0) * ((x - x0) / (x1 - x0));
  }

  // Interpolate in log-y space (multiplicative quantities like yeast %).
  function logInterp(x, x0, x1, y0, y1) {
    return Math.exp(lerp(x, x0, x1, Math.log(y0), Math.log(y1)));
  }

  // ---- yeast prediction ------------------------------------------------------

  // Return the IDY-% column (one value per GRID.hours) for an arbitrary temp.
  // Inside [20,30] we interpolate between columns in log space; outside we clamp
  // to the nearest column and shift it with the Q10 rule (colder => more yeast).
  function columnForTemp(tempC) {
    var temps = GRID.temps;
    var n = temps.length;
    var col = [];
    var i;

    if (tempC <= temps[0]) {
      // Below grid: scale coldest column up by Q10.
      var mult = Math.pow(Q10, (temps[0] - tempC) / 10);
      for (i = 0; i < GRID.hours.length; i++) col.push(GRID.pct[i][0] * mult);
      return col;
    }
    if (tempC >= temps[n - 1]) {
      // Above grid: scale hottest column down by Q10.
      var mult2 = Math.pow(Q10, (temps[n - 1] - tempC) / 10);
      for (i = 0; i < GRID.hours.length; i++) col.push(GRID.pct[i][n - 1] * mult2);
      return col;
    }
    // Inside grid: find bracketing columns and log-interpolate by temperature.
    var c = 0;
    while (c < n - 1 && temps[c + 1] < tempC) c++;
    var t0 = temps[c], t1 = temps[c + 1];
    for (i = 0; i < GRID.hours.length; i++) {
      col.push(logInterp(tempC, t0, t1, GRID.pct[i][c], GRID.pct[i][c + 1]));
    }
    return col;
  }

  // Look up IDY % for a given (effective hours, room temp), interpolating in
  // log(time) and extrapolating along the end slope past the grid edges.
  function lookupIDY(effHours, roomTempC) {
    var hours = GRID.hours;
    var col = columnForTemp(roomTempC);
    var m = hours.length;
    var h = Math.max(0.5, effHours);
    var pct;

    if (h <= hours[0]) {
      // Shorter than grid: extrapolate on the first log-log segment.
      pct = Math.exp(lerp(Math.log(h), Math.log(hours[0]), Math.log(hours[1]),
        Math.log(col[0]), Math.log(col[1])));
    } else if (h >= hours[m - 1]) {
      // Longer than grid: extrapolate on the last log-log segment.
      pct = Math.exp(lerp(Math.log(h), Math.log(hours[m - 2]), Math.log(hours[m - 1]),
        Math.log(col[m - 2]), Math.log(col[m - 1])));
    } else {
      var k = 0;
      while (k < m - 1 && hours[k + 1] < h) k++;
      pct = logInterp(Math.log(h), Math.log(hours[k]), Math.log(hours[k + 1]),
        col[k], col[k + 1]);
    }
    // Sanity floor/ceiling so extreme inputs never produce silly numbers.
    return clamp(pct, 0.005, 5);
  }

  /*
   * predictYeastPercentIDY - main entry point for the yeast model.
   * Collapses a two-stage (room then cold) ferment into one effective room-temp
   * duration via Q10, then looks up the required IDY %.
   *
   * Returns IDY baker's % as a fraction (0.001 = 0.1% of flour).
   */
  function predictYeastPercentIDY(o) {
    var roomHours = Math.max(0, o.roomHours || 0);
    var coldHours = Math.max(0, o.coldHours || 0);
    var roomTempC = (o.roomTempC == null) ? 21 : o.roomTempC;
    var coldTempC = (o.coldTempC == null) ? 4 : o.coldTempC;

    if (roomHours + coldHours <= 0) return null; // no ferment time given

    // Cold time expressed as equivalent room-temp hours.
    var coldEquiv = coldHours * Math.pow(Q10, (coldTempC - roomTempC) / 10);
    var effHours = roomHours + coldEquiv;

    return lookupIDY(effHours, roomTempC) / 100; // percent -> fraction
  }

  // ---- yeast type conversion -------------------------------------------------

  // Convert a weight expressed as IDY into the chosen yeast type's weight.
  function convertYeast(idyGrams, yeastType) {
    var y = DATA.YEAST[yeastType] || DATA.YEAST.idy;
    return idyGrams * y.factorFromIDY;
  }

  // ---- full recipe -----------------------------------------------------------

  /*
   * computeRecipe(inputs) -> recipe object.
   * inputs: {
   *   styleKey, flourType, yeastType, method ('oven'|'home'),
   *   ballWeight, ballCount,
   *   hydration, salt, oil, sugar,          // fractions, already resolved from UI
   *   roomHours, roomTempC, coldHours, coldTempC,
   *   prefermentType ('none'|'poolish'|'biga'),
   *   prefFlourFraction, prefHours, prefTempC   // only used when a preferment is set
   * }
   *
   * Flour is backed out of the total dough weight so the balls come out at the
   * requested size. With a preferment, part of the flour and water (and a little
   * yeast) move into a make-ahead culture; each stage's yeast is sized to its OWN
   * fermentation using the same model. Salt/oil/sugar always go in the final mix.
   */
  function computeRecipe(inp) {
    var ballWeight = Math.max(1, inp.ballWeight || 0);
    var ballCount = Math.max(1, Math.round(inp.ballCount || 1));
    var totalDough = ballWeight * ballCount;

    var hydration = inp.hydration || 0;
    var salt = inp.salt || 0;
    var oil = inp.oil || 0;
    var sugar = inp.sugar || 0;

    var pf = (inp.prefermentType && inp.prefermentType !== "none")
      ? DATA.PREFERMENTS[inp.prefermentType] : null;
    var pfFrac = pf ? clamp(inp.prefFlourFraction || 0, 0, 0.95) : 0;

    // Final-dough yeast: from the main room+cold ferment.
    var finalIDY = predictYeastPercentIDY({
      roomHours: inp.roomHours, roomTempC: inp.roomTempC,
      coldHours: inp.coldHours, coldTempC: inp.coldTempC
    });
    // Preferment yeast: from the preferment's own (single-stage) ferment.
    var prefIDY = pf ? predictYeastPercentIDY({
      roomHours: inp.prefHours, roomTempC: inp.prefTempC, coldHours: 0
    }) : null;

    var hasYeast = (finalIDY != null) || (prefIDY != null);
    var finalIDYf = finalIDY || 0;
    var prefIDYf = prefIDY || 0;

    // Effective overall IDY fraction (flour-weighted) for backing out flour.
    // This is independent of flour because pref/final flour are fractions of it.
    var effIDY = pf ? (pfFrac * prefIDYf + (1 - pfFrac) * finalIDYf) : finalIDYf;

    var denom = 1 + hydration + salt + oil + sugar + effIDY;
    var flour = totalDough / denom;

    // Combined (whole-batch) amounts - these still sum to the total dough.
    var idyGrams = flour * effIDY;
    var ingredients = {
      flour: flour,
      water: flour * hydration,
      salt: flour * salt,
      yeast: convertYeast(idyGrams, inp.yeastType),
      oil: flour * oil,
      sugar: flour * sugar
    };
    var perBall = {};
    Object.keys(ingredients).forEach(function (k) { perBall[k] = ingredients[k] / ballCount; });

    var out = {
      totalDough: totalDough,
      ballWeight: ballWeight,
      ballCount: ballCount,
      percents: { hydration: hydration, salt: salt, oil: oil, sugar: sugar, yeastIDY: effIDY },
      hasYeast: hasYeast,
      idyGrams: idyGrams,
      total: ingredients,
      perBall: perBall,
      usesPreferment: !!pf
    };

    if (pf) {
      var pfFlour = flour * pfFrac;
      var finalFlour = flour - pfFlour;
      var pfWater = pfFlour * pf.hydration;
      var totalWater = flour * hydration;
      var finalWater = totalWater - pfWater;
      var waterShortfall = finalWater < 0;
      if (waterShortfall) finalWater = 0;

      out.preferment = {
        type: inp.prefermentType,
        flourFraction: pfFrac,
        hours: inp.prefHours,
        tempC: inp.prefTempC,
        idyPct: prefIDYf,
        hasYeast: prefIDY != null,
        flour: pfFlour,
        water: pfWater,
        yeast: convertYeast(pfFlour * prefIDYf, inp.yeastType)
      };
      out.finalDough = {
        idyPct: finalIDYf,
        hasYeast: finalIDY != null,
        flour: finalFlour,
        water: finalWater,
        salt: flour * salt,
        yeast: convertYeast(finalFlour * finalIDYf, inp.yeastType),
        oil: flour * oil,
        sugar: flour * sugar
      };
      out.waterShortfall = waterShortfall;
    }

    return out;
  }

  // ---- imperial / volume fallback -------------------------------------------

  function round(x, dp) { var f = Math.pow(10, dp || 0); return Math.round(x * f) / f; }

  // Format a count of teaspoons as a readable fraction string.
  function tspString(tsp) {
    if (tsp < 0.0625) return "a pinch";
    if (tsp < 0.1875) return "scant 1/8 tsp";
    if (tsp < 0.375) return "1/4 tsp";
    if (tsp < 0.625) return "1/2 tsp";
    if (tsp < 0.875) return "3/4 tsp";
    if (tsp < 1.5) return round(tsp, 1) + " tsp";
    if (tsp < DATA.CONVERSIONS.tspPerTbsp) return round(tsp, 1) + " tsp";
    var tbsp = tsp / DATA.CONVERSIONS.tspPerTbsp;
    if (tbsp * DATA.CONVERSIONS.tspPerTbsp < DATA.CONVERSIONS.tspPerCup * 0.75) {
      return round(tbsp, 1) + " tbsp";
    }
    return round(tbsp / 16, 2) + " cup";
  }

  /*
   * gramsToImperial(grams, ingredient, opts) -> human string (e.g. "2 1/2 cups").
   * ingredient: 'flour'|'water'|'salt'|'yeast'|'oil'|'sugar'
   * opts: { flourType, saltType }
   * Yeast at sub-gram amounts is rendered as a pinch/fraction, not false grams.
   */
  function gramsToImperial(grams, ingredient, opts) {
    opts = opts || {};
    var C = DATA.CONVERSIONS;
    if (!grams || grams <= 0) return "-";

    if (ingredient === "flour") {
      var cupG = (DATA.FLOURS[opts.flourType] || DATA.FLOURS.bread).cupG;
      var cups = grams / cupG;
      return formatCups(cups);
    }
    if (ingredient === "water") {
      return formatCups(grams / C.waterGPerCup);
    }
    if (ingredient === "oil") {
      var tbspOil = grams / C.oilGPerTbsp;
      return tspString(tbspOil * C.tspPerTbsp);
    }
    if (ingredient === "sugar") {
      return tspString(grams / C.sugarGPerTsp);
    }
    if (ingredient === "yeast") {
      return tspString(grams / C.yeastGPerTsp);
    }
    if (ingredient === "salt") {
      var sd = C.salt[opts.saltType] || C.salt.fine;
      return tspString(grams / sd.gPerTsp);
    }
    return "-";
  }

  // Render a cup count snapped to the nearest 1/4 cup (e.g. "2 1/2 cups").
  // Below 1/4 cup, fall back to teaspoons so small amounts stay usable.
  function formatCups(cups) {
    if (cups < 0.0625) return "a pinch";
    if (cups < 0.1875) return tspString(cups * DATA.CONVERSIONS.tspPerCup);

    var q = Math.round(cups * 4) / 4;        // snap to nearest quarter cup
    var whole = Math.floor(q);
    var frac = q - whole;
    var fracStr = frac === 0.25 ? "1/4" : frac === 0.5 ? "1/2" : frac === 0.75 ? "3/4" : "";

    var text;
    if (frac === 0) text = String(whole);
    else if (whole === 0) text = fracStr;
    else text = whole + " " + fracStr;

    var unit = q === 1 ? " cup" : " cups";
    return text + unit;
  }

  var api = {
    predictYeastPercentIDY: predictYeastPercentIDY,
    convertYeast: convertYeast,
    computeRecipe: computeRecipe,
    gramsToImperial: gramsToImperial,
    // exposed for testing
    _lookupIDY: lookupIDY,
    _round: round
  };

  root.DOUGH = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(
  typeof window !== "undefined" ? window : this,
  (typeof window !== "undefined" ? window.PIZZA_DATA : require("./data.js").PIZZA_DATA)
);
