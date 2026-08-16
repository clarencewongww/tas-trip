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
        { start: "10:15", end: "15:00", title: "Layover — Melbourne Airport (MEL)", place: "Melbourne Airport", coords: [-37.6708, 144.843], gmapsQuery: "Melbourne Airport", kind: "flight", note: "Overnight flight arrives; long transit" },
        { start: "16:50", end: "18:10", title: "Flight Melbourne → Hobart", place: "Hobart Airport (HBA)", coords: [-42.8375, 147.5116], gmapsQuery: "Hobart Airport", kind: "flight" },
        { start: "18:10", end: "18:45", title: "Collect car — Yes Car", place: "4b/1 Stanton Pl, Cambridge TAS 7170", coords: [-42.8318, 147.4644], gmapsQuery: "YesDrive Car Rentals Cambridge", kind: "transit" },
        { start: "19:15", end: "23:59", title: "Check in — Riverfront Motel & Restaurant", place: "Riverfront Motel & Restaurant, Hobart", coords: [-42.8172, 147.2601], gmapsQuery: "Riverfront Motel & Restaurant Hobart", kind: "lodging" }
      ],
      legs: [
        { from: "Layover — Melbourne Airport (MEL)", to: "Flight Melbourne → Hobart", mode: "flight", fallbackMin: 80 },
        { from: "Flight Melbourne → Hobart", to: "Collect car — Yes Car", mode: "driving", fallbackKm: 5, fallbackMin: 10 },
        { from: "Collect car — Yes Car", to: "Check in — Riverfront Motel & Restaurant", mode: "driving", fallbackKm: 24, fallbackMin: 28 }
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
      origin: { title: "Depart — Riverfront Motel", coords: [-42.8172, 147.2601], departTime: "08:15", gmapsQuery: "Riverfront Motel & Restaurant Hobart" },
      entries: [
        { start: "08:30", end: "10:30", title: "Farm Gate Market", place: "Bathurst St, Hobart", coords: [-42.8814, 147.3251], gmapsQuery: "Farm Gate Market Hobart", kind: "market", note: "Opens 8:30 am" },
        { start: "12:15", end: "12:35", title: "Maingon Bay Lookout", place: "Tasman Peninsula", coords: [-43.188, 147.8451], gmapsQuery: "Maingon Bay Lookout", kind: "lookout", note: "Coastal lookout near Port Arthur" },
        { start: "13:00", end: "15:30", title: "Port Arthur Historic Site", place: "Port Arthur", coords: [-43.1458, 147.8505], gmapsQuery: "Port Arthur Historic Site", kind: "historic", note: "Allow ~2.5 h; book tickets ahead" },
        { start: "15:30", end: "16:15", title: "Port Arthur Lavender", place: "Port Arthur", coords: [-43.1071, 147.8632], gmapsQuery: "Port Arthur Lavender", kind: "lavender", note: "Lavender fields & café on Arthur Hwy · café closes 4 pm" },
        { start: "18:15", end: "23:59", title: "Check in — Airbnb", place: "2/7 Amos Place, Swansea", coords: [-42.1226, 148.0702], gmapsQuery: "7 Amos Place Swansea Tasmania", kind: "lodging" }
      ],
      legs: [
        { from: "Depart — Riverfront Motel", to: "Farm Gate Market", mode: "driving", fallbackKm: 8, fallbackMin: 12 },
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
      origin: { title: "Depart — Swansea", coords: [-42.1226, 148.0702], departTime: "12:00", gmapsQuery: "7 Amos Place Swansea Tasmania" },
      entries: [
        { start: "09:00", end: "12:00", title: "Free morning — Swansea", place: "Swansea", coords: [-42.1226, 148.0702], gmapsQuery: "7 Amos Place Swansea Tasmania", kind: "free", note: "Lazy morning & breakfast" },
        { start: "13:00", end: "15:30", title: "Wineglass Bay lookout walk", place: "Freycinet NP car park", coords: [-42.1365, 148.303], gmapsQuery: "Wineglass Bay Lookout", kind: "hike", note: "~1–1.5 h return to the lookout" },
        { start: "15:15", end: "15:45", title: "Cape Tourville Lighthouse", place: "Freycinet NP", coords: [-42.1227, 148.343], gmapsQuery: "Cape Tourville Lighthouse", kind: "lookout", note: "Easy 600 m boardwalk" },
        { start: "15:55", end: "16:35", title: "Honeymoon Bay", place: "Coles Bay", coords: [-42.1381, 148.2986], gmapsQuery: "Honeymoon Bay Freycinet", kind: "beach", note: "Quiet cove near Coles Bay" },
        { start: "17:00", end: "17:30", title: "Freycinet Marine Farm — oyster stop", place: "Freycinet Marine Farm", coords: [-42.0746, 148.2329], gmapsQuery: "Freycinet Marine Farm Coles Bay", kind: "food", note: "Raw oyster bar till 5 pm — order straight away" },
        { start: "18:00", end: "19:00", title: "Dinner — The Long Boat Tavern", place: "232 Tasman Hwy, Bicheno", coords: [-41.8738, 148.3042], gmapsQuery: "The Long Boat Tavern Bicheno", kind: "food", note: "Open Mondays till 9 pm · family pub" },
        { start: "20:00", end: "23:59", title: "Check in — Jack High (Airbnb)", place: "13 Wigram St, Scamander", coords: [-41.4639, 148.2361], gmapsQuery: "13 Wigram Street Scamander Tasmania", kind: "lodging" }
      ],
      legs: [
        { from: "Free morning — Swansea", to: "Wineglass Bay lookout walk", mode: "driving", fallbackKm: 50, fallbackMin: 50 },
        { from: "Wineglass Bay lookout walk", to: "Cape Tourville Lighthouse", mode: "driving", fallbackKm: 11, fallbackMin: 15 },
        { from: "Cape Tourville Lighthouse", to: "Honeymoon Bay", mode: "driving", fallbackKm: 6, fallbackMin: 10 },
        { from: "Honeymoon Bay", to: "Freycinet Marine Farm — oyster stop", mode: "driving", fallbackKm: 27, fallbackMin: 25 },
        { from: "Freycinet Marine Farm — oyster stop", to: "Dinner — The Long Boat Tavern", mode: "driving", fallbackKm: 30, fallbackMin: 30 },
        { from: "Dinner — The Long Boat Tavern", to: "Check in — Jack High (Airbnb)", mode: "driving", fallbackKm: 40, fallbackMin: 35 }
      ]
    },
    {
      id: "day-3",
      dateISO: "2026-11-17",
      label: "Tue 17 Nov",
      title: "Scamander to Launceston",
      town: "Launceston",
      hotel: "Launceston — TBC",
      hotelNote: "1 night",
      origin: { title: "Depart — Scamander", coords: [-41.4639, 148.2361], departTime: "08:45", gmapsQuery: "13 Wigram Street Scamander Tasmania" },
      entries: [
        { start: "09:00", end: "10:00", title: "Binalong Bay", place: "Binalong Bay", coords: [-41.2515, 148.3111], gmapsQuery: "Binalong Bay", kind: "beach", note: "Orange lichen rocks" },
        { start: "10:30", end: "12:00", title: "Bay of Fires Conservation Area — The Gardens", place: "The Gardens", coords: [-41.1634, 148.2827], gmapsQuery: "The Gardens Bay of Fires", kind: "park", note: "Beach walk between the boulders" },
        { start: "12:30", end: "13:30", title: "Lunch — St Helens", place: "St Helens", coords: [-41.3218, 148.2498], gmapsQuery: "St Helens Tasmania", kind: "food", note: "Wharf Bar & Kitchen open till 2:30 pm — Bayside Bistro as backup" },
        { start: "16:15", end: "23:59", title: "Check in — Launceston (hotel TBC)", place: "Launceston", coords: [-41.4332, 147.1441], gmapsQuery: "Launceston Tasmania", kind: "lodging", note: "1-night stay" }
      ],
      legs: [
        { from: "Depart — Scamander", to: "Binalong Bay", mode: "driving", fallbackKm: 28, fallbackMin: 25 },
        { from: "Binalong Bay", to: "Bay of Fires Conservation Area — The Gardens", mode: "driving", fallbackKm: 15, fallbackMin: 15 },
        { from: "Bay of Fires Conservation Area — The Gardens", to: "Lunch — St Helens", mode: "driving", fallbackKm: 24, fallbackMin: 22 },
        { from: "Lunch — St Helens", to: "Check in — Launceston (hotel TBC)", mode: "driving", fallbackKm: 183, fallbackMin: 165 }
      ]
    },
    {
      id: "day-4",
      dateISO: "2026-11-18",
      label: "Wed 18 Nov",
      title: "Launceston to Cradle Mountain",
      town: "Cradle Mountain",
      hotel: "Discovery Resorts — Cradle Mountain",
      hotelNote: "Deluxe 2-bed cabin · sleeps 6",
      origin: { title: "Depart — Launceston", coords: [-41.4332, 147.1441], departTime: "10:00", gmapsQuery: "Launceston Tasmania" },
      entries: [
        { start: "10:45", end: "12:15", title: "Bridestowe Lavender Estate", place: "Nabowla", coords: [-41.1283, 147.3414], gmapsQuery: "Bridestowe Lavender Estate", kind: "lavender", note: "Peak bloom Dec–Jan — fields are green in November" },
        { start: "13:05", end: "13:55", title: "Lavender House Perfumery", place: "Rowella", coords: [-41.1796, 146.912], gmapsQuery: "Lavender House Perfumery", kind: "lavender" },
        { start: "14:25", end: "15:25", title: "Tamar Island Wetlands Centre", place: "Tamar Island", coords: [-41.3912, 147.0737], gmapsQuery: "Tamar Island Wetlands Centre", kind: "park", note: "Main boardwalk closed until 17 Dec — bird-hide walk only" },
        { start: "15:40", end: "17:30", title: "Cataract Gorge Reserve", place: "Launceston", coords: [-41.4466, 147.1201], gmapsQuery: "Cataract Gorge Reserve Launceston", kind: "park", note: "Chairlift last ride 4:45 pm — ride it first, then walk the bridge" },
        { start: "17:30", end: "18:15", title: "Early dinner — Launceston", place: "Launceston", coords: [-41.4332, 147.1441], gmapsQuery: "Launceston Tasmania", kind: "free", note: "Early dinner before the drive west" },
        { start: "20:00", end: "23:59", title: "Check in — Discovery Resorts Cradle Mountain", place: "3816 Cradle Mountain Rd", coords: [-41.5802, 145.9378], kind: "lodging", gmapsQuery: "Discovery Resorts - Cradle Mountain", note: "Reception closes 5 pm — call (03) 6492 1395 ahead for the after-hours key" }
      ],
      legs: [
        { from: "Depart — Launceston", to: "Bridestowe Lavender Estate", mode: "driving", fallbackKm: 50, fallbackMin: 50 },
        { from: "Bridestowe Lavender Estate", to: "Lavender House Perfumery", mode: "driving", fallbackKm: 50, fallbackMin: 45 },
        { from: "Lavender House Perfumery", to: "Tamar Island Wetlands Centre", mode: "driving", fallbackKm: 28, fallbackMin: 28 },
        { from: "Tamar Island Wetlands Centre", to: "Cataract Gorge Reserve", mode: "driving", fallbackKm: 12, fallbackMin: 20 },
        { from: "Cataract Gorge Reserve", to: "Early dinner — Launceston", mode: "driving", fallbackKm: 4, fallbackMin: 10 },
        { from: "Early dinner — Launceston", to: "Check in — Discovery Resorts Cradle Mountain", mode: "driving", fallbackKm: 140, fallbackMin: 110 }
      ]
    },
    {
      id: "day-5",
      dateISO: "2026-11-19",
      label: "Thu 19 Nov",
      title: "Cradle Mountain to Hobart",
      town: "Hobart",
      hotel: "Travelodge Hotel Hobart",
      hotelNote: "2 nights",
      notes: ["Travelodge Family Room sleeps 4 — confirm 2 rooms for 5 people when booking."],
      origin: { title: "Depart — Discovery Resorts Cradle Mountain", coords: [-41.5802, 145.9378], departTime: "07:30", gmapsQuery: "Discovery Resorts - Cradle Mountain" },
      entries: [
        { start: "08:45", end: "11:30", title: "Dove Lake Circuit walk", place: "Dove Lake, Cradle Mountain", coords: [-41.6552, 145.9609], gmapsQuery: "Dove Lake Cradle Mountain", kind: "hike", note: "2–3 h loop beneath Cradle Mountain" },
        { start: "11:45", end: "12:30", title: "Lunch — Cradle Mountain visitor centre", place: "Cradle Mountain visitor centre", coords: [-41.5835, 145.9368], gmapsQuery: "Cradle Mountain Visitor Centre", kind: "food" },
        { start: "12:45", end: "13:10", title: "Enchanted Walk", place: "Cradle Mountain", coords: [-41.5958, 145.9291], gmapsQuery: "Enchanted Walk Cradle Mountain", kind: "hike", note: "20-min loop — wombats are out in the afternoon" },
        { start: "13:20", end: "13:40", title: "Pencil Pine Falls & Rainforest Walk", place: "Cradle Mountain Interpretation Centre", coords: [-41.5958, 145.9309], gmapsQuery: "Pencil Pine Falls Cradle Mountain", kind: "hike", note: "10-min all-weather boardwalk" },
        { start: "14:00", end: "14:40", title: "Cradle Mountain Wilderness Gallery", place: "Cradle Mountain Hotel", coords: [-41.5736, 145.9346], gmapsQuery: "Cradle Mountain Wilderness Gallery", kind: "park", note: "Free entry — 9 exhibition rooms" },
        { start: "15:00", end: "15:45", title: "Devils@Cradle — keeper tour", place: "3950 Cradle Mountain Rd", coords: [-41.5899, 145.9325], gmapsQuery: "Devils at Cradle Tasmania", kind: "park", note: "3 pm keeper tour · family (2 adults + 3 kids) $90" },
        { start: "17:30", end: "18:30", title: "Dinner — Deloraine Hotel", place: "Deloraine", coords: [-41.5243, 146.6571], gmapsQuery: "Deloraine Hotel Tasmania", kind: "food", note: "Wood-fired pizzas & schnitzels · kitchen till 8 pm" },
        { start: "21:30", end: "23:59", title: "Check in — Travelodge Hotel Hobart", place: "Travelodge Hotel Hobart", coords: [-42.8855, 147.3262], gmapsQuery: "Travelodge Hotel Hobart", kind: "lodging", note: "Late check-in — reception is open 24 hours" },
        { start: "22:00", end: "22:45", title: "Kmart New Town", place: "New Town, Hobart", coords: [-42.856, 147.3059], gmapsQuery: "Kmart New Town Hobart", kind: "shopping", alt: true, note: "Open 24 hours — or grab supplies Friday morning" }
      ],
      legs: [
        { from: "Depart — Discovery Resorts Cradle Mountain", to: "Dove Lake Circuit walk", mode: "driving", fallbackKm: 12, fallbackMin: 30 },
        { from: "Dove Lake Circuit walk", to: "Lunch — Cradle Mountain visitor centre", mode: "driving", fallbackKm: 15, fallbackMin: 25 },
        { from: "Lunch — Cradle Mountain visitor centre", to: "Enchanted Walk", mode: "driving", fallbackKm: 2, fallbackMin: 5 },
        { from: "Enchanted Walk", to: "Pencil Pine Falls & Rainforest Walk", mode: "driving", fallbackKm: 1, fallbackMin: 3 },
        { from: "Pencil Pine Falls & Rainforest Walk", to: "Cradle Mountain Wilderness Gallery", mode: "driving", fallbackKm: 3, fallbackMin: 5 },
        { from: "Cradle Mountain Wilderness Gallery", to: "Devils@Cradle — keeper tour", mode: "driving", fallbackKm: 3, fallbackMin: 6 },
        { from: "Devils@Cradle — keeper tour", to: "Dinner — Deloraine Hotel", mode: "driving", fallbackKm: 95, fallbackMin: 85 },
        { from: "Dinner — Deloraine Hotel", to: "Check in — Travelodge Hotel Hobart", mode: "driving", fallbackKm: 205, fallbackMin: 175 },
        { from: "Check in — Travelodge Hotel Hobart", to: "Kmart New Town", mode: "driving", fallbackKm: 4, fallbackMin: 7 }
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
      origin: { title: "Depart — Travelodge Hobart", coords: [-42.8855, 147.3262], departTime: "08:00", gmapsQuery: "Travelodge Hotel Hobart" },
      entries: [
        { start: "08:45", end: "09:10", title: "Kettering — Bruny Island ferry", place: "Kettering", coords: [-43.1274, 147.2555], gmapsQuery: "Bruny Island Ferry Kettering", kind: "ferry", note: "Car ferry; ~20 min crossing" },
        { start: "09:30", end: "09:55", title: "Bruny Island — Roberts Point", place: "Roberts Point, Bruny Island", coords: [-43.1431, 147.2868], gmapsQuery: "Bruny Island Ferry Terminal", kind: "ferry" },
        { start: "10:05", end: "11:15", title: "The Neck Lookout Track", place: "Bruny Island", coords: [-43.2694, 147.3489], gmapsQuery: "Truganini Lookout Bruny Island", kind: "lookout", note: "Boardwalk between north & south Bruny" },
        { start: "11:15", end: "13:00", title: "Lunch — Get Shucked (optional)", place: "Get Shucked, Bruny Island", coords: [-43.1975, 147.3871], gmapsQuery: "Get Shucked Bruny Island", kind: "food", alt: true, note: "Famous Bruny oysters" },
        { start: "14:30", end: "14:50", title: "Ferry back — Roberts Point", place: "Roberts Point, Bruny Island", coords: [-43.1431, 147.2868], gmapsQuery: "Bruny Island Ferry Terminal", kind: "ferry" },
        { start: "16:00", end: "17:30", title: "Mount Wellington / kunanyi", place: "Mount Wellington summit", coords: [-42.8961, 147.2377], gmapsQuery: "kunanyi / Mount Wellington", kind: "lookout", note: "1271 m — rug up!" },
        { start: "17:45", end: "19:30", title: "Dinner — Salamanca (optional)", place: "Salamanca Place, Hobart", coords: [-42.8863, 147.3315], gmapsQuery: "Salamanca Place Hobart", kind: "food", alt: true },
        { start: "19:45", end: "21:30", title: "Constitution Dock twilight walk & ice-cream punt (optional)", place: "Van Diemens Land Creamery, Constitution Dock", coords: [-42.8826, 147.3331], gmapsQuery: "Van Diemens Land Creamery Constitution Dock", kind: "food", alt: true, note: "Floating ice-cream punt open till 9pm Fridays · sunset over the Derwent ~20:20" },
        { start: "23:00", end: "23:59", title: "Back to Travelodge", place: "Travelodge Hotel Hobart", coords: [-42.8855, 147.3262], gmapsQuery: "Travelodge Hotel Hobart", kind: "lodging" }
      ],
      legs: [
        { from: "Depart — Travelodge Hobart", to: "Kettering — Bruny Island ferry", mode: "driving", fallbackKm: 32, fallbackMin: 40 },
        { from: "Kettering — Bruny Island ferry", to: "Bruny Island — Roberts Point", mode: "ferry", fallbackMin: 20 },
        { from: "Bruny Island — Roberts Point", to: "The Neck Lookout Track", mode: "driving", fallbackKm: 33, fallbackMin: 40 },
        { from: "The Neck Lookout Track", to: "Lunch — Get Shucked (optional)", mode: "driving", fallbackKm: 11, fallbackMin: 12 },
        { from: "Lunch — Get Shucked (optional)", to: "Ferry back — Roberts Point", mode: "driving", fallbackKm: 10, fallbackMin: 15 },
        { from: "Ferry back — Roberts Point", to: "Mount Wellington / kunanyi", mode: "driving", fallbackKm: 66, fallbackMin: 75 },
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
      origin: { title: "Depart — Travelodge Hobart", coords: [-42.8855, 147.3262], departTime: "08:15", gmapsQuery: "Travelodge Hotel Hobart" },
      entries: [
        { start: "08:30", end: "10:00", title: "Salamanca Market", place: "Salamanca Place, Hobart", coords: [-42.8863, 147.3315], gmapsQuery: "Salamanca Market Hobart", kind: "market", note: "Saturday market, opens 8:30 am" },
        { start: "10:20", end: "10:50", title: "Car drop-off — Hobart Airport", place: "Hobart Airport (HBA)", coords: [-42.8375, 147.5116], gmapsQuery: "Hobart Airport", kind: "transit" },
        { start: "11:25", end: "13:10", title: "Flight Hobart → Sydney", place: "Sydney Airport (SYD)", coords: [-33.95, 151.1817], gmapsQuery: "Sydney Airport", kind: "flight" },
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
