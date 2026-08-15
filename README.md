# Tasmania Trip — Tasmania Road Trip Itinerary

A static, dependency-free web app for the **Tasmania road trip · 13–21 Nov 2026**. Plain JavaScript — no build step, no frameworks, no installation required.

## Features

- **Per-day maps** — one map per itinerary day with all stops plotted
- **Driving distances** — live road distances & times via OSRM demo routing, with built-in offline fallbacks
- **Live "now" sync** — highlights the current stop automatically in Hobart (AEDT) time
- **Light / dark theme**
- **On-device geolocation** — optional. Coordinates are sent to the OSRM routing service only, never stored.

## Run locally

Open `index.html` directly in a browser, or serve the folder:

```sh
python3 -m http.server
```

then visit <http://localhost:8000>.

## Deployment (GitHub Pages)

In the repository settings:

1. **Settings → Pages**
2. Build and deployment → **Deploy from a branch**
3. Branch: **`main`**, folder: **`/root`**
4. Save — the site builds automatically on push.

## Privacy

No personal data is stored or transmitted. Location data is used only for routing (OSRM demo server) and is never stored. `robots.txt` disables indexing (`noindex` enabled), so the site will not appear in search results.

## Data & attribution

- Itinerary data: `js/data.js` — the single source of truth (all times are Hobart / AEDT)
- Basemap data: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors
- Basemap tiles: [CARTO](https://carto.com/) basemaps
- Routing: [OSRM](https://project-osrm.org/) demo server
- Map library: [Leaflet](https://leafletjs.com/)
