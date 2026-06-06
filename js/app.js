/*
 * app.js - DOM wiring. Reads inputs, calls DOUGH.computeRecipe, renders.
 * All math lives in dough.js; this file only touches the page.
 */
(function () {
  "use strict";
  var D = window.PIZZA_DATA;
  var DG = window.DOUGH;
  var $ = function (id) { return document.getElementById(id); };

  var tempUnit = "C"; // current display unit for the two temperature inputs

  // ---- small helpers ---------------------------------------------------------

  function cToF(c) { return c * 9 / 5 + 32; }
  function fToC(f) { return (f - 32) * 5 / 9; }

  function num(id, def) {
    var v = parseFloat($(id).value);
    return isNaN(v) ? def : v;
  }

  function readTempC(el, defC) {
    var v = parseFloat(el.value);
    if (isNaN(v)) return defC;
    return tempUnit === "F" ? fToC(v) : v;
  }

  function setTempInput(el, c) {
    el.value = Math.round(tempUnit === "F" ? cToF(c) : c);
  }

  function fmtGrams(g) {
    if (g >= 100) return String(Math.round(g));
    if (g >= 1) return String(Math.round(g * 10) / 10);
    return String(Math.round(g * 100) / 100); // sub-gram: 2 dp
  }

  function fillSelect(el, obj) {
    el.innerHTML = "";
    Object.keys(obj).forEach(function (k) {
      var o = document.createElement("option");
      o.value = k;
      o.textContent = obj[k].label;
      el.appendChild(o);
    });
  }

  // ---- style presets ---------------------------------------------------------

  // Apply a style's defaults. `full` also resets flour + fermentation fields
  // (used on style change / first load); percentage-only reset omits them.
  function applyStyle(key, full) {
    var s = D.STYLES[key];
    $("style-desc").textContent = s.desc;
    $("hydration").value = round1(s.hydration * 100);
    $("salt").value = round1(s.salt * 100);
    $("oil").value = round1(s.oil * 100);
    $("sugar").value = round1(s.sugar * 100);
    $("ballWeight").value = s.ball;
    if (full) {
      $("flour").value = s.recommendedFlour;
      $("roomHours").value = s.ferment.roomHours;
      $("coldHours").value = s.ferment.coldHours;
      setTempInput($("roomTempC"), s.ferment.roomTempC);
      setTempInput($("coldTempC"), s.ferment.coldTempC);
    }
  }

  function round1(x) { return Math.round(x * 10) / 10; }

  // ---- main compute + render -------------------------------------------------

  function recompute() {
    var styleKey = $("style").value;
    var s = D.STYLES[styleKey];
    var method = $("method").value;
    var flourType = $("flour").value;

    $("flour-hint").textContent = D.FLOURS[flourType].note;

    var inp = {
      styleKey: styleKey,
      flourType: flourType,
      yeastType: $("yeast").value,
      method: method,
      ballWeight: num("ballWeight", 250),
      ballCount: num("ballCount", 1),
      hydration: num("hydration", 60) / 100,
      salt: num("salt", 2.5) / 100,
      oil: num("oil", 0) / 100,
      sugar: num("sugar", 0) / 100,
      roomHours: num("roomHours", 0),
      roomTempC: readTempC($("roomTempC"), 21),
      coldHours: num("coldHours", 0),
      coldTempC: readTempC($("coldTempC"), 4)
    };

    var r = DG.computeRecipe(inp);
    renderTable(r, flourType);
    renderBake(s, method);
    renderNotes(s, method, r);
    $("yeast-note").textContent = "Yeast: " + D.YEAST[inp.yeastType].note;
  }

  var ROWS = [
    { key: "flour", name: "Flour", pct: function () { return "100%"; } },
    { key: "water", name: "Water", pct: function (r) { return pc(r.percents.hydration); } },
    { key: "salt", name: "Salt", pct: function (r) { return pc(r.percents.salt); } },
    { key: "yeast", name: "Yeast", pct: function (r) { return r.hasYeast ? pc(r.percents.yeastIDY) + " IDY" : ""; } },
    { key: "oil", name: "Oil", pct: function (r) { return pc(r.percents.oil); } },
    { key: "sugar", name: "Sugar", pct: function (r) { return pc(r.percents.sugar); } }
  ];

  function pc(frac) { return round1(frac * 100) + "%"; }

  function renderTable(r, flourType) {
    var showImp = $("showImperial").checked;
    var saltType = $("saltType").value || "fine";
    var body = $("recipe-body");
    body.innerHTML = "";

    ROWS.forEach(function (row) {
      var total = r.total[row.key];
      var perBall = r.perBall[row.key];
      // Hide oil/sugar (and yeast) rows that are genuinely zero/absent.
      if ((row.key === "oil" || row.key === "sugar") && (!total || total < 0.05)) return;

      var tr = document.createElement("tr");

      var tdName = document.createElement("td");
      tdName.innerHTML = '<span class="ingredient-name">' + row.name + '</span> ' +
        '<span class="ingredient-pct">' + row.pct(r) + "</span>";
      tr.appendChild(tdName);

      var tdPer = document.createElement("td");
      tdPer.className = "num";
      tdPer.textContent = cell(row.key, perBall, r);
      tr.appendChild(tdPer);

      var tdTot = document.createElement("td");
      tdTot.className = "num";
      tdTot.textContent = cell(row.key, total, r);
      tr.appendChild(tdTot);

      var tdImp = document.createElement("td");
      tdImp.className = "num imp" + (showImp ? "" : " hidden");
      tdImp.textContent = (row.key === "yeast" && !r.hasYeast)
        ? "-"
        : DG.gramsToImperial(total, row.key, { flourType: flourType, saltType: saltType });
      tr.appendChild(tdImp);

      body.appendChild(tr);
    });

    $("foot-perball").textContent = fmtGrams(r.ballWeight) + " g";
    $("foot-total").textContent = fmtGrams(r.totalDough) + " g";
  }

  // grams cell, with the "-" fallback when yeast is unknown
  function cell(key, grams, r) {
    if (key === "yeast" && !r.hasYeast) return "-";
    return fmtGrams(grams) + " g";
  }

  function renderBake(s, method) {
    var b = s.bake[method];
    var f = Math.round(cToF(b.tempC));
    $("bake").innerHTML = "<strong>Bake:</strong> ~" + b.tempC + " °C / " + f + " °F. " + b.note;
  }

  function renderNotes(s, method, r) {
    var msgs = [];
    if (!r.hasYeast) {
      msgs.push("Enter a room or cold fermentation time to get a yeast amount.");
    }
    if (s.needsHotOven && method === "home") {
      msgs.push("Neapolitan needs pizza-oven heat (430-480 °C). In a home oven the crust won't be the same - consider the New York or home-oven pan style, or use a steel under the broiler.");
    }
    var el = $("notes");
    if (msgs.length) {
      el.innerHTML = msgs.join("<br>");
      el.classList.remove("hidden");
    } else {
      el.classList.add("hidden");
    }
  }

  // ---- events ----------------------------------------------------------------

  function bindEvents() {
    // any field edit recomputes
    $("dough-form").addEventListener("input", recompute);

    // style change resets presets first
    $("style").addEventListener("change", function () {
      applyStyle($("style").value, true);
      recompute();
    });

    // temperature unit toggle: convert existing values in place
    document.querySelectorAll('input[name="tempUnit"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        var next = this.value;
        if (next === tempUnit) return;
        ["roomTempC", "coldTempC"].forEach(function (id) {
          var el = $(id);
          var v = parseFloat(el.value);
          if (!isNaN(v)) el.value = Math.round(next === "F" ? cToF(v) : fToC(v));
        });
        tempUnit = next;
        document.querySelectorAll(".unit-label").forEach(function (sp) { sp.textContent = "°" + next; });
        recompute();
      });
    });

    // imperial toggle: show columns + salt picker + caveat
    $("showImperial").addEventListener("change", function () {
      var on = this.checked;
      document.querySelectorAll(".imp").forEach(function (c) { c.classList.toggle("hidden", !on); });
      $("saltpick-wrap").classList.toggle("hidden", !on);
      $("caveat").classList.toggle("hidden", !on);
      $("caveat").textContent = D.CONVERSIONS.flourCaveat;
      recompute();
    });

    // customize panel toggle
    $("customize-toggle").addEventListener("click", function () {
      var panel = $("customize");
      var open = panel.classList.toggle("hidden") === false;
      this.setAttribute("aria-expanded", String(open));
      this.textContent = "Customize percentages " + (open ? "▾" : "▸");
    });

    // reset percentages to the current style's defaults
    $("reset-style").addEventListener("click", function () {
      applyStyle($("style").value, false);
      recompute();
    });
  }

  // ---- init ------------------------------------------------------------------

  function init() {
    fillSelect($("style"), D.STYLES);
    fillSelect($("flour"), D.FLOURS);
    fillSelect($("yeast"), D.YEAST);

    var st = $("saltType");
    Object.keys(D.CONVERSIONS.salt).forEach(function (k) {
      var o = document.createElement("option");
      o.value = k; o.textContent = D.CONVERSIONS.salt[k].label;
      st.appendChild(o);
    });

    $("yeast").value = "idy";
    $("ballCount").value = 2;
    $("caveat").textContent = D.CONVERSIONS.flourCaveat;

    applyStyle($("style").value, true);
    bindEvents();
    recompute();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
