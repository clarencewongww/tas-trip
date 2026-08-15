/* TripTimeline — Hobart-time trip state engine (pure logic, no DOM).
 *
 * Consumes window.TRIP (js/data.js, loaded first). All scheduling times in
 * TRIP are "HH:mm" in Australia/Hobart (AEDT = UTC+11 during Nov 2026).
 * No DOM access, no network, no external libraries. Plain globals.
 */
(function (global) {
  "use strict";
  if (typeof global === "undefined" || global === null) return;

  const TZ = "Australia/Hobart";

  // One shared Intl formatter; offsets are cached per calendar date.
  const DTF = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  const offsetCache = new Map(); // "YYYY-MM-DD" -> offset ms from UTC

  const MS_MIN = 60000;
  const MS_HOUR = 3600000;
  const MS_DAY = 86400000;

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function requireTrip() {
    if (!global.TRIP) throw new Error("TRIP data not loaded");
    return global.TRIP;
  }

  function parseDateISO(dateISO) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateISO));
    if (!m) throw new Error("Bad dateISO: " + dateISO);
    return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
  }

  function parseTime(timeStr) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(timeStr).trim());
    if (!m) throw new Error("Bad time: " + timeStr);
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h > 23 || min > 59) throw new Error("Bad time: " + timeStr);
    return { h: h, min: min };
  }

  // Hobart wall-clock components (y/mo/d/h/min/s) for an absolute epoch.
  function wallParts(epochMs) {
    const parts = DTF.formatToParts(new Date(epochMs));
    const v = {};
    for (let i = 0; i < parts.length; i++) v[parts[i].type] = parts[i].value;
    return {
      y: Number(v.year),
      mo: Number(v.month),
      d: Number(v.day),
      h: Number(v.hour) % 24, // % 24 normalizes engines that emit hour "24"
      min: Number(v.minute),
      s: Number(v.second)
    };
  }

  // IANA offset (ms) in Hobart at an absolute epoch:
  //   wall-clock-as-UTC - true-epoch = offset.
  function hobartOffsetMs(epochMs) {
    const w = wallParts(epochMs);
    const asUTC = Date.UTC(w.y, w.mo - 1, w.d, w.h, w.min, w.s);
    return asUTC - epochMs;
  }

  // Cached offset for a calendar date, sampled at local noon (UTC anchor).
  function offsetForLocalDate(y, mo, d) {
    const key = y + "-" + pad2(mo) + "-" + pad2(d);
    if (offsetCache.has(key)) return offsetCache.get(key);
    const off = hobartOffsetMs(Date.UTC(y, mo - 1, d, 12));
    offsetCache.set(key, off);
    return off;
  }

  // Epoch ms for a local wall-clock time on a calendar date, with an
  // optional day roll-over (used for midnight-wrap entry ends).
  function localInstant(y, mo, d, h, min, addDays) {
    let ty = y;
    let tmo = mo;
    let td = d;
    if (addDays) {
      const tmp = new Date(Date.UTC(y, mo - 1, d + addDays, h, min));
      ty = tmp.getUTCFullYear();
      tmo = tmp.getUTCMonth() + 1;
      td = tmp.getUTCDate();
    }
    const off = offsetForLocalDate(ty, tmo, td);
    return Date.UTC(ty, tmo - 1, td, h, min) - off;
  }

  /**
   * Epoch ms for "HH:mm" on the given day's calendar date in Hobart time.
   * `day` may be a day object ({ dateISO }) or a "YYYY-MM-DD" string.
   * @param {Object|string} day
   * @param {string} timeStr "HH:mm"
   * @param {Object} [opts] { addDays?: number } for midnight wrap (+1 day)
   * @returns {number}
   */
  function instantFor(day, timeStr, opts) {
    requireTrip();
    const dateISO = typeof day === "string" ? day : day.dateISO;
    const d = parseDateISO(dateISO);
    const t = parseTime(timeStr);
    const addDays = opts && opts.addDays ? opts.addDays : 0;
    return localInstant(d.y, d.mo, d.d, t.h, t.min, addDays);
  }

  // ISO 8601 string with the Hobart offset, e.g. "2026-11-14T10:15:00+11:00".
  function isoForEpoch(epochMs) {
    const w = wallParts(epochMs);
    const off = hobartOffsetMs(epochMs);
    const sign = off < 0 ? "-" : "+";
    const abs = Math.abs(off);
    return (
      w.y + "-" + pad2(w.mo) + "-" + pad2(w.d) +
      "T" + pad2(w.h) + ":" + pad2(w.min) + ":" + pad2(w.s) +
      sign + pad2(Math.floor(abs / MS_HOUR)) + ":" + pad2(Math.floor((abs % MS_HOUR) / MS_MIN))
    );
  }

  function tripBounds() {
    const trip = requireTrip();
    return { startMs: Date.parse(trip.startISO), endMs: Date.parse(trip.endISO) };
  }

  // Ordered virtual schedule for one day: optional origin first, then entries.
  // Entry end honoring midnight wrap (end <= start rolls to the next day).
  function dayItems(day) {
    const items = [];
    if (day.origin) {
      const startMs = instantFor(day, day.origin.departTime);
      items.push({
        kind: "origin",
        idx: -1,
        title: day.origin.title,
        startMs: startMs,
        endMs: null,
        startIso: isoForEpoch(startMs)
      });
    }
    const entries = day.entries || [];
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const startMs = instantFor(day, e.start);
      const endMs = instantFor(day, e.end, { addDays: e.end <= e.start ? 1 : 0 });
      items.push({
        kind: "entry",
        idx: i,
        title: e.title,
        startMs: startMs,
        endMs: endMs,
        startIso: isoForEpoch(startMs)
      });
    }
    return items;
  }

  // Day window: origin depart (or first entry start) -> last entry end.
  function dayWindow(day) {
    const items = dayItems(day);
    if (!items.length) return null;
    const first = items[0];
    const last = items[items.length - 1];
    return { startMs: first.startMs, endMs: last.endMs !== null ? last.endMs : last.startMs };
  }

  function previousDayLastTitle(dayIdx) {
    const trip = requireTrip();
    if (dayIdx > 0) {
      const prev = trip.days[dayIdx - 1];
      const entries = prev.entries || [];
      if (entries.length) return entries[entries.length - 1].title;
    }
    return "Trip start";
  }

  function matchLeg(day, fromTitle, toTitle) {
    const legs = day.legs || [];
    for (let i = 0; i < legs.length; i++) {
      if (legs[i].from === fromTitle && legs[i].to === toTitle) return legs[i];
    }
    return null;
  }

  // Next scheduled item (origin depart or entry) strictly after now, any day.
  function nextItemAfter(nowMs) {
    const trip = requireTrip();
    const days = trip.days || [];
    for (let i = 0; i < days.length; i++) {
      const items = dayItems(days[i]);
      for (let j = 0; j < items.length; j++) {
        if (items[j].startMs > nowMs) {
          return { title: items[j].title, startIso: items[j].startIso };
        }
      }
    }
    return null;
  }

  // Live-phase current day: the day whose window contains now; otherwise the
  // next day whose window has not yet started (inter-day overnight gap).
  function currentDayIndex(nowMs) {
    const trip = requireTrip();
    const days = trip.days || [];
    for (let i = 0; i < days.length; i++) {
      const win = dayWindow(days[i]);
      if (win && win.startMs <= nowMs && nowMs < win.endMs) return i;
    }
    for (let i = 0; i < days.length; i++) {
      const win = dayWindow(days[i]);
      if (win && win.startMs > nowMs) return i;
    }
    return days.length - 1;
  }

  function clamp01(x) {
    return x < 0 ? 0 : x > 1 ? 1 : x;
  }

  /**
   * Compute the trip state at a given absolute epoch.
   * @param {number} [nowMs] epoch ms; defaults to Date.now()
   * @returns {Object} state
   */
  function computeState(nowMs) {
    requireTrip();
    const now = typeof nowMs === "number" && isFinite(nowMs) ? nowMs : Date.now();
    const bounds = tripBounds();
    const durationMs = bounds.endMs - bounds.startMs;

    if (now < bounds.startMs) {
      const diff = bounds.startMs - now;
      return {
        phase: "pre",
        countdown: {
          d: Math.floor(diff / MS_DAY),
          h: Math.floor((diff % MS_DAY) / MS_HOUR),
          m: Math.floor((diff % MS_HOUR) / MS_MIN)
        },
        dayIndex: undefined,
        entryIndex: undefined,
        inGap: false,
        gap: null,
        entryProgress: null,
        tripProgress: 0,
        dayProgress: null,
        next: nextItemAfter(now),
        preview: false
      };
    }

    if (now > bounds.endMs) {
      return {
        phase: "post",
        countdown: null,
        dayIndex: undefined,
        entryIndex: undefined,
        inGap: false,
        gap: null,
        entryProgress: null,
        tripProgress: 1,
        dayProgress: null,
        next: null,
        preview: false
      };
    }

    // ---- live ----
    const dayIdx = currentDayIndex(now);
    const day = global.TRIP.days[dayIdx];
    const win = dayWindow(day);
    const items = dayItems(day);
    const entries = items.filter(function (it) { return it.kind === "entry"; });

    let entryIndex = -1;
    let inGap = false;
    let gap = null;
    let entryProgress = null;

    if (entries.length) {
      let insideIdx = -1;
      for (let i = 0; i < entries.length; i++) {
        if (entries[i].startMs <= now && now < entries[i].endMs) { insideIdx = i; break; }
      }
      const nextIdx = entries.findIndex(function (it) { return it.startMs > now; });

      if (insideIdx !== -1) {
        entryIndex = insideIdx;
        inGap = false;
        entryProgress = clamp01((now - entries[insideIdx].startMs) / (entries[insideIdx].endMs - entries[insideIdx].startMs));
      } else {
        inGap = true;
        if (nextIdx !== -1) {
          entryIndex = nextIdx; // index of the NEXT entry
          let fromTitle;
          if (nextIdx > 0) {
            fromTitle = entries[nextIdx - 1].title;
          } else if (day.origin) {
            fromTitle = day.origin.title;
          } else {
            fromTitle = previousDayLastTitle(dayIdx);
          }
          gap = { fromTitle: fromTitle, toTitle: entries[nextIdx].title, leg: matchLeg(day, fromTitle, entries[nextIdx].title) };
        }
      }
    }

    const dayProgress = win ? clamp01((now - win.startMs) / (win.endMs - win.startMs)) : null;

    return {
      phase: "live",
      countdown: null,
      dayIndex: dayIdx,
      entryIndex: entryIndex,
      inGap: inGap,
      gap: gap,
      entryProgress: entryProgress,
      tripProgress: clamp01((now - bounds.startMs) / durationMs),
      dayProgress: dayProgress,
      next: nextItemAfter(now),
      preview: false
    };
  }

  /**
   * Current instant as an absolute Date (epoch ms is timezone-independent).
   * @returns {Date}
   */
  function nowInTas() {
    requireTrip();
    return new Date();
  }

  /**
   * Total trip duration in ms (endISO - startISO). Used by the scrubber.
   * @returns {number}
   */
  function tripDurationMs() {
    const b = tripBounds();
    return b.endMs - b.startMs;
  }

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------
  global.TripTimeline = {
    nowInTas: nowInTas,
    instantFor: instantFor,
    state: computeState,
    tripDurationMs: tripDurationMs
  };
})(typeof window !== "undefined" ? window : null);
