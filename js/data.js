/* Single source of truth for the itinerary. Times are Hobart (AEDT) time. */
"use strict";

window.TRIP = {
  name: "Tasmania Trip",
  subtitle: "Tasmania road trip · 13–21 Nov 2026",
  tz: "Australia/Hobart",
  startISO: "2026-11-13T23:40:00+11:00",
  endISO: "2026-11-22T00:35:00+11:00",
  days: [
    {
      id: "day-0",
      dateISO: "2026-11-14",
      label: "Sat 14 Nov",
      title: "Arrival — Melbourne to Hobart",
      town: "Hobart",
      hotel: "Riverfront Motel & Restaurant",
      hotelNote: "2-bedroom villa, 2 bathrooms",
      notes: ["Flights are fixed; all other times flexible."],
      origin: null,
      entries: [
        { start: "10:15", end: "15:00", title: "Layover — Melbourne Airport (MEL)", place: "Melbourne Airport", coords: [-37.6733, 144.8433], gmapsQuery: "Melbourne Airport", kind: "flight", note: "Overnight flight arrives; long transit" },
        { start: "16:50", end: "18:10", title: "Flight Melbourne → Hobart", place: "Hobart Airport (HBA)", coords: [-42.836, 147.51], gmapsQuery: "Hobart Airport", kind: "flight" },
        { start: "18:10", end: "18:45", title: "Collect car — Yes Car", place: "4b/1 Stanton Pl, Cambridge TAS 7170", coords: [-42.8331, 147.4635], gmapsQuery: "YesDrive Car Rentals Cambridge", kind: "transit" },
        { start: "19:15", end: "23:59", title: "Check in — Riverfront Motel & Restaurant", place: "Riverfront Motel & Restaurant, Hobart", coords: [-42.8321, 147.2907], gmapsQuery: "Riverfront Motel & Restaurant Hobart", kind: "lodging" }
      ],
      legs: [
        { from: "Layover — Melbourne Airport (MEL)", to: "Flight Melbourne → Hobart", mode: "flight", fallbackMin: 80 },
        { from: "Flight Melbourne → Hobart", to: "Collect car — Yes Car", mode: "driving", fallbackKm: 5, fallbackMin: 10 },
        { from: "Collect car — Yes Car", to: "Check in — Riverfront Motel & Restaurant", mode: "driving", fallbackKm: 19, fallbackMin: 25 }
      ]
    },
    {
      id: "day-1",
      dateISO: "2026-11-15",
      label: "Sun 15 Nov",
      title: "Hobart to Swansea",
      town: "Swansea",
      hotel: "2/7 Amos Place",
      hotelNote: "Airbnb · Swansea",
      origin: { title: "Depart — Riverfront Motel", coords: [-42.8321, 147.2907], departTime: "08:15", gmapsQuery: "Riverfront Motel & Restaurant Hobart" },
      entries: [
        { start: "08:30", end: "10:30", title: "Farm Gate Market", place: "Bathurst St, Hobart", coords: [-42.8793, 147.3255], gmapsQuery: "Farm Gate Market Hobart", kind: "market", note: "Opens 8:30 am" },
        { start: "12:15", end: "12:35", title: "Maingon Bay Lookout", place: "Tasman Peninsula", coords: [-43.188, 147.8451], gmapsQuery: "Maingon Bay Lookout", kind: "lookout", note: "Coastal lookout near Port Arthur" },
        { start: "13:00", end: "15:30", title: "Port Arthur Historic Site", place: "Port Arthur", coords: [-43.1477, 147.8513], gmapsQuery: "Port Arthur Historic Site", kind: "historic", note: "Allow ~2.5 h; tickets at gate" },
        { start: "15:30", end: "16:15", title: "Port Arthur Lavender", place: "Port Arthur", coords: [-43.1071, 147.8632], gmapsQuery: "Port Arthur Lavender", kind: "lavender", note: "Lavender fields & café on Arthur Hwy" },
        { start: "18:15", end: "23:59", title: "Check in — Airbnb", place: "2/7 Amos Place, Swansea", coords: [-42.1226, 148.0702], gmapsQuery: "2/7 Amos Place Swansea Tasmania", kind: "lodging" }
      ],
      legs: [
        { from: "Depart — Riverfront Motel", to: "Farm Gate Market", mode: "driving", fallbackKm: 6, fallbackMin: 10 },
        { from: "Farm Gate Market", to: "Maingon Bay Lookout", mode: "driving", fallbackKm: 115, fallbackMin: 100 },
        { from: "Maingon Bay Lookout", to: "Port Arthur Historic Site", mode: "driving", fallbackKm: 6, fallbackMin: 8 },
        { from: "Port Arthur Historic Site", to: "Port Arthur Lavender", mode: "driving", fallbackKm: 6, fallbackMin: 8 },
        { from: "Port Arthur Lavender", to: "Check in — Airbnb", mode: "driving", fallbackKm: 152, fallbackMin: 120 }
      ]
    },
    {
      id: "day-2",
      dateISO: "2026-11-16",
      label: "Mon 16 Nov",
      title: "Swansea to Scamander",
      town: "Scamander",
      hotel: "Jack High",
      hotelNote: "Airbnb · 13 Wigram St, Scamander",
      origin: { title: "Depart — Swansea", coords: [-42.1226, 148.0702], departTime: "12:00", gmapsQuery: "2/7 Amos Place Swansea Tasmania" },
      entries: [
        { start: "09:00", end: "12:00", title: "Free morning — Swansea", place: "Swansea", coords: [-42.1226, 148.0702], gmapsQuery: "2/7 Amos Place Swansea Tasmania", kind: "free", note: "Lazy morning & breakfast" },
        { start: "13:00", end: "15:30", title: "Wineglass Bay lookout walk", place: "Freycinet NP car park", coords: [-42.1365, 148.303], gmapsQuery: "Wineglass Bay Lookout", kind: "hike", note: "~1.5–2 h return to the lookout" },
        { start: "15:30", end: "16:00", title: "Cape Tourville Lighthouse", place: "Freycinet NP", coords: [-42.115, 148.339], gmapsQuery: "Cape Tourville Lighthouse", kind: "lookout", note: "Easy 600 m boardwalk" },
        { start: "16:10", end: "16:50", title: "Honeymoon Bay", place: "Coles Bay", coords: [-42.1381, 148.2986], gmapsQuery: "Honeymoon Bay", kind: "beach", note: "Quiet cove near Coles Bay" },
        { start: "17:00", end: "18:15", title: "Freycinet Marine Farm — seafood dinner", place: "Freycinet Marine Farm", coords: [-42.0746, 148.2329], gmapsQuery: "Freycinet Marine Farm Coles Bay", kind: "food", note: "Fresh oysters & mussels" },
        { start: "20:00", end: "23:59", title: "Check in — Jack High (Airbnb)", place: "13 Wigram St, Scamander", coords: [-41.4639, 148.2361], gmapsQuery: "13 Wigram Street Scamander Tasmania", kind: "lodging" }
      ],
      legs: [
        { from: "Free morning — Swansea", to: "Wineglass Bay lookout walk", mode: "driving", fallbackKm: 50, fallbackMin: 50 },
        { from: "Wineglass Bay lookout walk", to: "Cape Tourville Lighthouse", mode: "driving", fallbackKm: 9, fallbackMin: 15 },
        { from: "Cape Tourville Lighthouse", to: "Honeymoon Bay", mode: "driving", fallbackKm: 6, fallbackMin: 10 },
        { from: "Honeymoon Bay", to: "Freycinet Marine Farm — seafood dinner", mode: "driving", fallbackKm: 27, fallbackMin: 25 },
        { from: "Freycinet Marine Farm — seafood dinner", to: "Check in — Jack High (Airbnb)", mode: "driving", fallbackKm: 95, fallbackMin: 75 }
      ]
    },
    {
      id: "day-3",
      dateISO: "2026-11-17",
      label: "Tue 17 Nov",
      title: "Scamander to Launceston",
      town: "Launceston",
      hotel: "Launceston — TBC",
      hotelNote: "2 nights",
      origin: { title: "Depart — Scamander", coords: [-41.4639, 148.2361], departTime: "08:45", gmapsQuery: "13 Wigram Street Scamander Tasmania" },
      entries: [
        { start: "09:00", end: "10:00", title: "Binalong Bay", place: "Binalong Bay", coords: [-41.2505, 148.3085], gmapsQuery: "Binalong Bay", kind: "beach", note: "Orange lichen rocks" },
        { start: "10:30", end: "12:30", title: "Bay of Fires Conservation Area — The Gardens", place: "The Gardens", coords: [-41.1825, 148.2713], gmapsQuery: "The Gardens Bay of Fires", kind: "park", note: "Beach walk between the boulders" },
        { start: "12:30", end: "13:30", title: "Lunch — St Helens", place: "St Helens", coords: [-41.3205, 148.247], gmapsQuery: "St Helens Tasmania", kind: "food" },
        { start: "16:00", end: "23:59", title: "Check in — Launceston (hotel TBC)", place: "Launceston", coords: [-41.4332, 147.1441], gmapsQuery: "Launceston Tasmania", kind: "lodging", note: "2-night stay" }
      ],
      legs: [
        { from: "Depart — Scamander", to: "Binalong Bay", mode: "driving", fallbackKm: 26, fallbackMin: 25 },
        { from: "Binalong Bay", to: "Bay of Fires Conservation Area — The Gardens", mode: "driving", fallbackKm: 13, fallbackMin: 15 },
        { from: "Bay of Fires Conservation Area — The Gardens", to: "Lunch — St Helens", mode: "driving", fallbackKm: 24, fallbackMin: 30 },
        { from: "Lunch — St Helens", to: "Check in — Launceston (hotel TBC)", mode: "driving", fallbackKm: 183, fallbackMin: 165 }
      ]
    },
    {
      id: "day-4",
      dateISO: "2026-11-18",
      label: "Wed 18 Nov",
      title: "Launceston day trip",
      town: "Launceston",
      hotel: "Launceston — TBC",
      hotelNote: "2 nights",
      origin: { title: "Depart — Launceston", coords: [-41.4332, 147.1441], departTime: "10:00", gmapsQuery: "Launceston Tasmania" },
      entries: [
        { start: "10:45", end: "12:15", title: "Bridestowe Lavender Estate", place: "Nabowla", coords: [-41.141, 147.336], gmapsQuery: "Bridestowe Lavender Estate", kind: "lavender", note: "Peak lavender bloom in November" },
        { start: "13:05", end: "13:55", title: "Lavender House Perfumery", place: "Rowella", coords: [-41.1809, 146.9145], gmapsQuery: "Lavender House Perfumery", kind: "lavender" },
        { start: "14:25", end: "15:25", title: "Tamar Island Wetlands Centre", place: "Tamar Island", coords: [-41.387, 147.082], gmapsQuery: "Tamar Island Wetlands Centre", kind: "park", note: "Boardwalk & birdlife" },
        { start: "15:40", end: "17:30", title: "Cataract Gorge Reserve", place: "Launceston", coords: [-41.444, 147.119], gmapsQuery: "Cataract Gorge Reserve Launceston", kind: "park", note: "Walk the suspension bridge" },
        { start: "17:30", end: "23:59", title: "Evening free — Launceston", place: "Launceston", coords: [-41.4332, 147.1441], gmapsQuery: "Launceston Tasmania", kind: "free", note: "Dinner in the city" }
      ],
      legs: [
        { from: "Depart — Launceston", to: "Bridestowe Lavender Estate", mode: "driving", fallbackKm: 47, fallbackMin: 45 },
        { from: "Bridestowe Lavender Estate", to: "Lavender House Perfumery", mode: "driving", fallbackKm: 45, fallbackMin: 45 },
        { from: "Lavender House Perfumery", to: "Tamar Island Wetlands Centre", mode: "driving", fallbackKm: 28, fallbackMin: 28 },
        { from: "Tamar Island Wetlands Centre", to: "Cataract Gorge Reserve", mode: "driving", fallbackKm: 12, fallbackMin: 20 },
        { from: "Cataract Gorge Reserve", to: "Evening free — Launceston", mode: "driving", fallbackKm: 4, fallbackMin: 10 }
      ]
    },
    {
      id: "day-5",
      dateISO: "2026-11-19",
      label: "Thu 19 Nov",
      title: "Launceston to Cradle Mountain to Hobart",
      town: "Hobart",
      hotel: "Travelodge Hotel Hobart",
      hotelNote: "2 nights",
      origin: { title: "Depart — Launceston", coords: [-41.4332, 147.1441], departTime: "07:30", gmapsQuery: "Launceston Tasmania" },
      entries: [
        { start: "10:00", end: "12:45", title: "Dove Lake Circuit walk", place: "Dove Lake, Cradle Mountain", coords: [-41.653, 145.961], gmapsQuery: "Dove Lake Cradle Mountain", kind: "hike", note: "2–3 h loop beneath Cradle Mountain" },
        { start: "12:45", end: "13:30", title: "Lunch — Cradle Mountain visitor centre", place: "Cradle Mountain visitor centre", coords: [-41.585, 145.928], gmapsQuery: "Cradle Mountain Visitor Centre", kind: "food" },
        { start: "17:30", end: "20:45", title: "Check in — Travelodge Hotel Hobart", place: "Travelodge Hotel Hobart", coords: [-42.886, 147.324], gmapsQuery: "Travelodge Hotel Hobart", kind: "lodging", note: "Long scenic drive back south" },
        { start: "21:00", end: "22:00", title: "Kmart New Town", place: "New Town, Hobart", coords: [-42.8555, 147.308], gmapsQuery: "Kmart New Town Hobart", kind: "shopping", note: "Evening supplies" }
      ],
      legs: [
        { from: "Depart — Launceston", to: "Dove Lake Circuit walk", mode: "driving", fallbackKm: 141, fallbackMin: 120 },
        { from: "Dove Lake Circuit walk", to: "Lunch — Cradle Mountain visitor centre", mode: "driving", fallbackKm: 14, fallbackMin: 20 },
        { from: "Lunch — Cradle Mountain visitor centre", to: "Check in — Travelodge Hotel Hobart", mode: "driving", fallbackKm: 305, fallbackMin: 240 },
        { from: "Check in — Travelodge Hotel Hobart", to: "Kmart New Town", mode: "driving", fallbackKm: 6, fallbackMin: 12 }
      ]
    },
    {
      id: "day-6",
      dateISO: "2026-11-20",
      label: "Fri 20 Nov",
      title: "Bruny Island & Hobart",
      town: "Hobart",
      hotel: "Travelodge Hotel Hobart",
      notes: ["Alternative: swap Mount Wellington for MONA (closes 5 pm — better as a morning swap with Bruny)."],
      origin: { title: "Depart — Travelodge Hobart", coords: [-42.886, 147.324], departTime: "08:00", gmapsQuery: "Travelodge Hotel Hobart" },
      entries: [
        { start: "08:45", end: "09:10", title: "Kettering — Bruny Island ferry", place: "Kettering", coords: [-43.1274, 147.2555], gmapsQuery: "Bruny Island Ferry Kettering", kind: "ferry", note: "Car ferry; ~20 min crossing" },
        { start: "09:30", end: "09:55", title: "Bruny Island — Roberts Point", place: "Roberts Point, Bruny Island", coords: [-43.1463, 147.2810], gmapsQuery: "Bruny Island Ferry Terminal", kind: "ferry" },
        { start: "10:05", end: "11:15", title: "The Neck Lookout Track", place: "Bruny Island", coords: [-43.2694, 147.3489], gmapsQuery: "Truganini Lookout Bruny Island", kind: "lookout", note: "Boardwalk between north & south Bruny" },
        { start: "11:15", end: "13:00", title: "Lunch — Get Shucked (optional)", place: "Get Shucked, Bruny Island", coords: [-43.242, 147.36], gmapsQuery: "Get Shucked Bruny Island", kind: "food", alt: true, note: "Famous Bruny oysters" },
        { start: "14:30", end: "14:50", title: "Ferry back — Roberts Point", place: "Roberts Point, Bruny Island", coords: [-43.1463, 147.2810], gmapsQuery: "Bruny Island Ferry Terminal", kind: "ferry" },
        { start: "16:00", end: "17:30", title: "Mount Wellington / kunanyi", place: "Mount Wellington summit", coords: [-42.8961, 147.2377], gmapsQuery: "kunanyi / Mount Wellington", kind: "lookout", note: "1271 m — rug up!" },
        { start: "17:45", end: "19:30", title: "Dinner — Salamanca (optional)", place: "Salamanca Place, Hobart", coords: [-42.8863, 147.3315], gmapsQuery: "Salamanca Place Hobart", kind: "food", alt: true },
        { start: "19:45", end: "21:30", title: "Constitution Dock twilight walk & ice-cream punt (optional)", place: "Van Diemens Land Creamery, Constitution Dock", coords: [-42.8826, 147.3331], gmapsQuery: "Van Diemens Land Creamery", kind: "food", alt: true, note: "Floating ice-cream punt open till 9pm Fridays · sunset over the Derwent ~20:10" },
        { start: "23:00", end: "23:59", title: "Back to Travelodge", place: "Travelodge Hotel Hobart", coords: [-42.886, 147.324], gmapsQuery: "Travelodge Hotel Hobart", kind: "lodging" }
      ],
      legs: [
        { from: "Depart — Travelodge Hobart", to: "Kettering — Bruny Island ferry", mode: "driving", fallbackKm: 32, fallbackMin: 40 },
        { from: "Kettering — Bruny Island ferry", to: "Bruny Island — Roberts Point", mode: "ferry", fallbackMin: 20 },
        { from: "Bruny Island — Roberts Point", to: "The Neck Lookout Track", mode: "driving", fallbackKm: 33, fallbackMin: 40 },
        { from: "The Neck Lookout Track", to: "Lunch — Get Shucked (optional)", mode: "driving", fallbackKm: 7, fallbackMin: 10 },
        { from: "Lunch — Get Shucked (optional)", to: "Ferry back — Roberts Point", mode: "driving", fallbackKm: 18, fallbackMin: 25 },
        { from: "Ferry back — Roberts Point", to: "Mount Wellington / kunanyi", mode: "driving", fallbackKm: 58, fallbackMin: 80 },
        { from: "Mount Wellington / kunanyi", to: "Dinner — Salamanca (optional)", mode: "driving", fallbackKm: 22, fallbackMin: 40 },
        { from: "Dinner — Salamanca (optional)", to: "Constitution Dock twilight walk & ice-cream punt (optional)", mode: "driving", fallbackKm: 1, fallbackMin: 4 },
        { from: "Constitution Dock twilight walk & ice-cream punt (optional)", to: "Back to Travelodge", mode: "driving", fallbackKm: 2, fallbackMin: 6 }
      ]
    },
    {
      id: "day-7",
      dateISO: "2026-11-21",
      label: "Sat 21 Nov",
      title: "Departure",
      town: "Hobart",
      hotel: "—",
      origin: { title: "Depart — Travelodge Hobart", coords: [-42.886, 147.324], departTime: "08:15", gmapsQuery: "Travelodge Hotel Hobart" },
      entries: [
        { start: "08:30", end: "10:00", title: "Salamanca Market", place: "Salamanca Place, Hobart", coords: [-42.8863, 147.3315], gmapsQuery: "Salamanca Market Hobart", kind: "market", note: "Saturday market, opens 8:30 am" },
        { start: "10:20", end: "10:50", title: "Car drop-off — Hobart Airport", place: "Hobart Airport (HBA)", coords: [-42.836, 147.51], gmapsQuery: "Hobart Airport", kind: "transit" },
        { start: "11:25", end: "13:10", title: "Flight Hobart → Sydney", place: "Sydney Airport (SYD)", coords: [-33.9399, 151.1753], gmapsQuery: "Sydney Airport", kind: "flight" },
        { start: "16:30", end: "00:35", title: "Flight Sydney → Singapore", place: "Singapore Changi Airport (SIN)", coords: [1.3644, 103.9915], gmapsQuery: "Singapore Changi Airport", kind: "flight", note: "Arrives 21:35 Singapore time (00:35 Hobart time)" }
      ],
      legs: [
        { from: "Depart — Travelodge Hobart", to: "Salamanca Market", mode: "driving", fallbackKm: 2, fallbackMin: 8 },
        { from: "Salamanca Market", to: "Car drop-off — Hobart Airport", mode: "driving", fallbackKm: 18, fallbackMin: 20 },
        { from: "Car drop-off — Hobart Airport", to: "Flight Hobart → Sydney", mode: "flight", fallbackMin: 105 },
        { from: "Flight Hobart → Sydney", to: "Flight Sydney → Singapore", mode: "flight", fallbackMin: 485 }
      ]
    }
  ]
};

/* TripData — shared waypoint/leg helpers used by BOTH render.js (timeline rows)
 * and maps.js (markers / legs).
 *
 * Single source of truth for WAYPOINT ORDER: each day's waypoint sequence is
 * sorted chronologically by time (entries by `start`, origin by `departTime`),
 * so timeline badges, map marker numbers, drive-row `data-leg` indices and
 * maps.js `legResults` indices all stay in lockstep. Reads TRIP only — never
 * mutates it.
 */
(function (global) {
  "use strict";
  if (typeof global === "undefined" || global === null) return;

  // Times MUST be zero-padded 24-hour "HH:MM" (e.g. "08:05", not "8:05") for
  // the string sort below to be chronological. Non-matching or missing times
  // sort last via the sentinel key "99:99".
  function timeKey(t) {
    const s = String(t == null ? "" : t).trim();
    return /^\d{1,2}:\d{2}$/.test(s) ? s : "99:99";
  }

  function compareTime(a, b) {
    const ka = timeKey(a);
    const kb = timeKey(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  }

  function coordsOf(p) {
    const c = p && p.coords;
    return Array.isArray(c) && c.length >= 2 ? [c[0], c[1]] : null;
  }

  // Fresh copy of a coords pair, so returned waypoints never share the array
  // with TRIP (guards the "never mutates TRIP" contract). Non-array / missing
  // values pass through unchanged, keeping defensive paths intact.
  function copyCoords(c) {
    return Array.isArray(c) && c.length >= 2 ? [c[0], c[1]] : c;
  }

  // "Same point" within ~1e-4 deg (~11 m) — matches maps.js / render.js.
  function closeCoords(a, b) {
    if (!a || !b) return false;
    return Math.abs(a[0] - b[0]) < 1e-4 && Math.abs(a[1] - b[1]) < 1e-4;
  }

  /**
   * Chronologically sorted waypoint sequence for one day: the optional origin
   * plus every entry carrying a valid coords array (length >= 2). Returns fresh
   * objects — never mutates TRIP data. Array.prototype.sort is stable, so
   * equal-time waypoints keep their authored relative order.
   */
  function getWaypoints(day) {
    if (!day) return [];
    const wps = [];
    if (
      day.origin &&
      Array.isArray(day.origin.coords) &&
      day.origin.coords.length >= 2
    ) {
      wps.push({
        title: day.origin.title || "Departure",
        time: day.origin.departTime || "",
        coords: copyCoords(day.origin.coords),
        kind: "origin",
        entryIdx: -1,
        alt: false,
        place: "",
        note: "",
        start: null,
        end: null,
        departTime: day.origin.departTime || null,
        gmapsQuery: day.origin.gmapsQuery || "",
        kindName: "transit"
      });
    }
    (Array.isArray(day.entries) ? day.entries : []).forEach(function (e, j) {
      if (e && Array.isArray(e.coords) && e.coords.length >= 2) {
        wps.push({
          title: e.title || "",
          time: e.start || "",
          coords: copyCoords(e.coords),
          kind: "entry",
          entryIdx: j,
          alt: !!e.alt,
          place: e.place || "",
          note: e.note || "",
          start: e.start || null,
          end: e.end || null,
          departTime: null,
          gmapsQuery: e.gmapsQuery || "",
          kindName: e.kind || ""
        });
      }
    });
    wps.sort(function (a, b) {
      return compareTime(a.time, b.time);
    });
    return wps;
  }

  /**
   * Leg object for the waypoint pair a -> b, or null.
   * 1) Exact title match first (leg.from === a.title && leg.to === b.title).
   * 2) Coordinate fallback: the stop titled leg.from has coords ≈ a.coords and
   *    the stop titled leg.to has coords ≈ b.coords (titles looked up among
   *    origin + entries; epsilon ~1e-4 deg).
   * This resolves day-2's pair "Depart — Swansea" -> "Wineglass Bay lookout
   * walk" to the authored leg "Free morning — Swansea" -> "Wineglass Bay
   * lookout walk", which shares the origin's coordinates.
   */
  function findLeg(day, a, b) {
    if (!day || !Array.isArray(day.legs) || !a || !b) return null;
    const at = a.title;
    const bt = b.title;

    for (let k = 0; k < day.legs.length; k++) {
      const leg = day.legs[k];
      if (leg && leg.from === at && leg.to === bt) return leg;
    }

    const ac = coordsOf(a);
    const bc = coordsOf(b);
    if (!ac || !bc) return null;

    const titleCoords = new Map();
    if (day.origin && day.origin.title) {
      titleCoords.set(day.origin.title, coordsOf(day.origin));
    }
    (Array.isArray(day.entries) ? day.entries : []).forEach(function (e) {
      if (e && e.title) titleCoords.set(e.title, coordsOf(e));
    });

    for (let k = 0; k < day.legs.length; k++) {
      const leg = day.legs[k];
      if (!leg) continue;
      const fc = titleCoords.get(leg.from);
      const tc = titleCoords.get(leg.to);
      if (fc && tc && closeCoords(fc, ac) && closeCoords(tc, bc)) return leg;
    }
    return null;
  }

  global.TripData = {
    getWaypoints: getWaypoints,
    findLeg: findLeg,
    timeKey: timeKey
  };
})(typeof window !== "undefined" ? window : null);
