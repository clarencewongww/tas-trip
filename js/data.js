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
        { start: "10:15", end: "15:00", title: "Layover — Melbourne Airport (MEL)", place: "Melbourne Airport", coords: [-37.6733, 144.8433], kind: "flight", note: "Overnight flight arrives; long transit" },
        { start: "16:50", end: "18:10", title: "Flight Melbourne → Hobart", place: "Hobart Airport (HBA)", coords: [-42.836, 147.51], kind: "flight" },
        { start: "18:10", end: "18:45", title: "Collect car — Hobart Airport (HBA)", place: "Hobart Airport (HBA)", coords: [-42.836, 147.51], kind: "transit" },
        { start: "19:15", end: "23:59", title: "Check in — Riverfront Motel & Restaurant", place: "Riverfront Motel & Restaurant, Hobart", coords: [-42.8321, 147.2907], kind: "lodging" }
      ],
      legs: [
        { from: "Layover — Melbourne Airport (MEL)", to: "Flight Melbourne → Hobart", mode: "flight", fallbackMin: 80 },
        { from: "Collect car — Hobart Airport (HBA)", to: "Check in — Riverfront Motel & Restaurant", mode: "driving", fallbackKm: 19, fallbackMin: 25 }
      ]
    },
    {
      id: "day-1",
      dateISO: "2026-11-15",
      label: "Sun 15 Nov",
      title: "Hobart to Swansea",
      town: "Swansea",
      hotel: "Swansea — TBC",
      hotelNote: "Hotel to be confirmed",
      origin: { title: "Depart — Riverfront Motel", coords: [-42.8321, 147.2907], departTime: "08:15" },
      entries: [
        { start: "08:30", end: "10:30", title: "Farm Gate Market", place: "Bathurst St, Hobart", coords: [-42.8793, 147.3255], kind: "market", note: "Opens 8:30 am" },
        { start: "12:15", end: "12:35", title: "Maingon Bay Lookout", place: "Tasman Peninsula", coords: [-43.093, 147.926], kind: "lookout", note: "Coastal lookout near Port Arthur" },
        { start: "13:00", end: "15:30", title: "Port Arthur Historic Site", place: "Port Arthur", coords: [-43.149, 147.8505], kind: "historic", note: "Allow ~2.5 h; tickets at gate" },
        { start: "15:30", end: "16:15", title: "Port Arthur Lavender", place: "Port Arthur", coords: [-43.1525, 147.8555], kind: "lavender", note: "Right next door — lavender fields & café" },
        { start: "18:15", end: "23:59", title: "Check in — Swansea (hotel TBC)", place: "Swansea", coords: [-42.126, 148.072], kind: "lodging" }
      ],
      legs: [
        { from: "Depart — Riverfront Motel", to: "Farm Gate Market", mode: "driving", fallbackKm: 6, fallbackMin: 10 },
        { from: "Farm Gate Market", to: "Maingon Bay Lookout", mode: "driving", fallbackKm: 103, fallbackMin: 110 },
        { from: "Maingon Bay Lookout", to: "Port Arthur Historic Site", mode: "driving", fallbackKm: 12, fallbackMin: 15 },
        { from: "Port Arthur Historic Site", to: "Port Arthur Lavender", mode: "driving", fallbackKm: 2, fallbackMin: 5 },
        { from: "Port Arthur Lavender", to: "Check in — Swansea (hotel TBC)", mode: "driving", fallbackKm: 152, fallbackMin: 120 }
      ]
    },
    {
      id: "day-2",
      dateISO: "2026-11-16",
      label: "Mon 16 Nov",
      title: "Swansea to St Helens",
      town: "St Helens",
      hotel: "St Helens — TBC",
      origin: { title: "Depart — Swansea", coords: [-42.126, 148.072], departTime: "12:00" },
      entries: [
        { start: "09:00", end: "12:00", title: "Free morning — Swansea", place: "Swansea", coords: [-42.126, 148.072], kind: "free", note: "Lazy morning & breakfast" },
        { start: "13:00", end: "15:30", title: "Wineglass Bay lookout walk", place: "Freycinet NP car park", coords: [-42.1365, 148.303], kind: "hike", note: "~1.5–2 h return to the lookout" },
        { start: "15:30", end: "16:00", title: "Cape Tourville Lighthouse", place: "Freycinet NP", coords: [-42.115, 148.339], kind: "lookout", note: "Easy 600 m boardwalk" },
        { start: "16:10", end: "16:50", title: "Honeymoon Bay", place: "Coles Bay", coords: [-42.1295, 148.2805], kind: "beach", note: "Quiet cove near Coles Bay" },
        { start: "17:00", end: "18:15", title: "Freycinet Marine Farm — seafood dinner", place: "Freycinet Marine Farm", coords: [-42.1355, 148.2665], kind: "food", note: "Fresh oysters & mussels" },
        { start: "20:00", end: "23:59", title: "Check in — St Helens (hotel TBC)", place: "St Helens", coords: [-41.3205, 148.247], kind: "lodging" }
      ],
      legs: [
        { from: "Free morning — Swansea", to: "Wineglass Bay lookout walk", mode: "driving", fallbackKm: 50, fallbackMin: 50 },
        { from: "Wineglass Bay lookout walk", to: "Cape Tourville Lighthouse", mode: "driving", fallbackKm: 9, fallbackMin: 15 },
        { from: "Cape Tourville Lighthouse", to: "Honeymoon Bay", mode: "driving", fallbackKm: 6, fallbackMin: 10 },
        { from: "Honeymoon Bay", to: "Freycinet Marine Farm — seafood dinner", mode: "driving", fallbackKm: 2, fallbackMin: 5 },
        { from: "Freycinet Marine Farm — seafood dinner", to: "Check in — St Helens (hotel TBC)", mode: "driving", fallbackKm: 110, fallbackMin: 100 }
      ]
    },
    {
      id: "day-3",
      dateISO: "2026-11-17",
      label: "Tue 17 Nov",
      title: "St Helens to Launceston",
      town: "Launceston",
      hotel: "Launceston — TBC",
      hotelNote: "2 nights",
      origin: { title: "Depart — St Helens", coords: [-41.3205, 148.247], departTime: "08:45" },
      entries: [
        { start: "09:00", end: "10:00", title: "Binalong Bay", place: "Binalong Bay", coords: [-41.2505, 148.3085], kind: "beach", note: "Orange lichen rocks" },
        { start: "10:30", end: "12:30", title: "Bay of Fires Conservation Area — The Gardens", place: "The Gardens", coords: [-41.165, 148.2925], kind: "park", note: "Beach walk between the boulders" },
        { start: "12:30", end: "13:30", title: "Lunch — St Helens", place: "St Helens", coords: [-41.3205, 148.247], kind: "food" },
        { start: "16:00", end: "23:59", title: "Check in — Launceston (hotel TBC)", place: "Launceston", coords: [-41.4332, 147.1441], kind: "lodging", note: "2-night stay" }
      ],
      legs: [
        { from: "Depart — St Helens", to: "Binalong Bay", mode: "driving", fallbackKm: 11, fallbackMin: 15 },
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
      origin: { title: "Depart — Launceston", coords: [-41.4332, 147.1441], departTime: "10:00" },
      entries: [
        { start: "10:45", end: "12:15", title: "Bridestowe Lavender Estate", place: "Nabowla", coords: [-41.141, 147.336], kind: "lavender", note: "Peak lavender bloom in November" },
        { start: "12:40", end: "13:30", title: "Lavender House Perfumery", place: "Lilydale", coords: [-41.245, 147.223], kind: "lavender" },
        { start: "14:00", end: "15:00", title: "Tamar Island Wetlands Centre", place: "Tamar Island", coords: [-41.387, 147.082], kind: "park", note: "Boardwalk & birdlife" },
        { start: "15:20", end: "17:30", title: "Cataract Gorge Reserve", place: "Launceston", coords: [-41.444, 147.119], kind: "park", note: "Walk the suspension bridge" },
        { start: "17:30", end: "23:59", title: "Evening free — Launceston", place: "Launceston", coords: [-41.4332, 147.1441], kind: "free", note: "Dinner in the city" }
      ],
      legs: [
        { from: "Depart — Launceston", to: "Bridestowe Lavender Estate", mode: "driving", fallbackKm: 47, fallbackMin: 45 },
        { from: "Bridestowe Lavender Estate", to: "Lavender House Perfumery", mode: "driving", fallbackKm: 18, fallbackMin: 25 },
        { from: "Lavender House Perfumery", to: "Tamar Island Wetlands Centre", mode: "driving", fallbackKm: 29, fallbackMin: 30 },
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
      origin: { title: "Depart — Launceston", coords: [-41.4332, 147.1441], departTime: "07:30" },
      entries: [
        { start: "10:00", end: "12:45", title: "Dove Lake Circuit walk", place: "Dove Lake, Cradle Mountain", coords: [-41.653, 145.961], kind: "hike", note: "2–3 h loop beneath Cradle Mountain" },
        { start: "12:45", end: "13:30", title: "Lunch — Cradle Mountain visitor centre", place: "Cradle Mountain visitor centre", coords: [-41.585, 145.928], kind: "food" },
        { start: "17:30", end: "20:45", title: "Check in — Travelodge Hotel Hobart", place: "Travelodge Hotel Hobart", coords: [-42.886, 147.324], kind: "lodging", note: "Long scenic drive back south" },
        { start: "21:00", end: "22:00", title: "Kmart New Town", place: "New Town, Hobart", coords: [-42.8555, 147.308], kind: "shopping", note: "Evening supplies" }
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
      origin: { title: "Depart — Travelodge Hobart", coords: [-42.886, 147.324], departTime: "08:00" },
      entries: [
        { start: "08:45", end: "09:10", title: "Kettering — Bruny Island ferry", place: "Kettering", coords: [-43.128, 147.2455], kind: "ferry", note: "Car ferry; ~20 min crossing" },
        { start: "09:30", end: "09:55", title: "Bruny Island — Roberts Point", place: "Roberts Point, Bruny Island", coords: [-43.1515, 147.2635], kind: "ferry" },
        { start: "10:05", end: "11:15", title: "The Neck Lookout Track", place: "Bruny Island", coords: [-43.2575, 147.3515], kind: "lookout", note: "Boardwalk between north & south Bruny" },
        { start: "11:15", end: "13:00", title: "Lunch — Get Shucked (optional)", place: "Get Shucked, Bruny Island", coords: [-43.242, 147.36], kind: "food", alt: true, note: "Famous Bruny oysters" },
        { start: "14:30", end: "14:50", title: "Ferry back — Roberts Point", place: "Roberts Point, Bruny Island", coords: [-43.1515, 147.2635], kind: "ferry" },
        { start: "16:00", end: "17:30", title: "Mount Wellington / kunanyi", place: "Mount Wellington summit", coords: [-42.8961, 147.2377], kind: "lookout", note: "1271 m — rug up!" },
        { start: "17:45", end: "19:30", title: "Dinner — Salamanca (optional)", place: "Salamanca Place, Hobart", coords: [-42.8863, 147.3315], kind: "food", alt: true },
        { start: "21:10", end: "22:30", title: "Bonorong Wildlife Sanctuary — night tour", place: "Bonorong Wildlife Sanctuary", coords: [-42.7075, 147.2635], kind: "park", note: "Spot devils & quolls at night" },
        { start: "23:00", end: "23:59", title: "Back to Travelodge", place: "Travelodge Hotel Hobart", coords: [-42.886, 147.324], kind: "lodging" }
      ],
      legs: [
        { from: "Depart — Travelodge Hobart", to: "Kettering — Bruny Island ferry", mode: "driving", fallbackKm: 32, fallbackMin: 40 },
        { from: "Kettering — Bruny Island ferry", to: "Bruny Island — Roberts Point", mode: "ferry", fallbackMin: 20 },
        { from: "Bruny Island — Roberts Point", to: "The Neck Lookout Track", mode: "driving", fallbackKm: 33, fallbackMin: 40 },
        { from: "The Neck Lookout Track", to: "Lunch — Get Shucked (optional)", mode: "driving", fallbackKm: 7, fallbackMin: 10 },
        { from: "Lunch — Get Shucked (optional)", to: "Ferry back — Roberts Point", mode: "driving", fallbackKm: 18, fallbackMin: 25 },
        { from: "Ferry back — Roberts Point", to: "Mount Wellington / kunanyi", mode: "driving", fallbackKm: 58, fallbackMin: 80 },
        { from: "Mount Wellington / kunanyi", to: "Dinner — Salamanca (optional)", mode: "driving", fallbackKm: 22, fallbackMin: 40 },
        { from: "Dinner — Salamanca (optional)", to: "Bonorong Wildlife Sanctuary — night tour", mode: "driving", fallbackKm: 24, fallbackMin: 30 },
        { from: "Bonorong Wildlife Sanctuary — night tour", to: "Back to Travelodge", mode: "driving", fallbackKm: 25, fallbackMin: 25 }
      ]
    },
    {
      id: "day-7",
      dateISO: "2026-11-21",
      label: "Sat 21 Nov",
      title: "Departure",
      town: "Hobart",
      hotel: "—",
      origin: { title: "Depart — Travelodge Hobart", coords: [-42.886, 147.324], departTime: "08:15" },
      entries: [
        { start: "08:30", end: "10:00", title: "Salamanca Market", place: "Salamanca Place, Hobart", coords: [-42.8863, 147.3315], kind: "market", note: "Saturday market, opens 8:30 am" },
        { start: "10:20", end: "10:50", title: "Car drop-off — Hobart Airport", place: "Hobart Airport (HBA)", coords: [-42.836, 147.51], kind: "transit" },
        { start: "11:25", end: "13:10", title: "Flight Hobart → Sydney", place: "Sydney Airport (SYD)", coords: [-33.9399, 151.1753], kind: "flight" },
        { start: "16:30", end: "00:35", title: "Flight Sydney → Singapore", place: "Singapore Changi Airport (SIN)", coords: [1.3644, 103.9915], kind: "flight", note: "Arrives 21:35 Singapore time (00:35 Hobart time)" }
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
