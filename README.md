# RakshaNet — Disaster Response App

A Vite + React prototype for a disaster alert & response app, backed by real
project data (villages, users, shelters, response teams, and a flood
scenario).

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL (usually http://localhost:5173).

## Project structure

```
src/
  main.jsx                 # React entry point
  App.jsx                  # Renders DisasterResponseApp
  DisasterResponseApp.jsx  # All screens, navigation, and UI components
  firebase.js               # Placeholder — no backend is connected yet
  data/                      # Raw source JSON (unmodified)
    users.json
    villages.json
    shelters.json
    response_teams.json
    flood_scenario.json
  services/
    authService.js          # Mock "current user" — no real login exists
    dataService.js           # Loads data/*.json, normalizes it, and exposes
                              # DataService.* (the only thing screens call)
  components/                # Currently empty — see components/README.md
```

## Notes on the data

- Every village has a `shelterId`; a shelter can serve several villages, so
  `dataService.js` derives, per shelter, the total population routed to it
  and compares that against its stated capacity (labeled "assigned
  population load" in the UI — there's no live occupancy feed).
- `flood_scenario.json`'s two branches (North/South) share exact
  `(x, y, time)` coordinates with entries in `villages.json`, which lets
  `dataService.js` reconstruct which branch reaches each village and when —
  shown as a flood progression timeline on flood-type alert details.
- Shelters and response teams don't include street addresses; the shelter
  detail screen shows grid coordinates and the nearest real response team
  instead of an invented address.

## Swapping in a real backend

`firebase.js` has commented-out scaffolding for Firestore/Auth/Cloud
Messaging. To go live: fill in your Firebase config (ideally via `.env`
variables — see the comments in that file), then point `dataService.js`'s
`DataService` methods at Firestore reads and `authService.js`'s
`getCurrentUserId()` at Firebase Auth's current user. No screen code needs to
change as long as `DataService`'s method signatures stay the same.
