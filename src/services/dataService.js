/* ============================================================================
   DATA SERVICE
   ----------------------------------------------------------------------------
   Loads the project's real data from src/data/*.json and exposes a clean,
   read-only API. Screens never touch the JSON files directly — they only
   call DataService.* — so swapping these imports for real API/Firestore
   calls later means editing only this file.

   Relationships in the source data:
   - Each village has a shelterId pointing at its designated shelter, so one
     shelter typically serves several villages (not a 1:1 mapping).
   - villages[].arrivalTimeSeconds and flood_scenario branch path points share
     exact (x, y, time) triples, so each village can be matched back to the
     flood branch (North/South) that reaches it and at what elapsed time.
   - Shelters and response teams only have real capacity/contact fields, not
     live occupancy or a street address, so those are derived below (planned
     population load vs. capacity) rather than invented.
   ============================================================================ */

import villagesRaw from "../data/villages.json";
import usersRaw from "../data/users.json";
import sheltersRaw from "../data/shelters.json";
import responseTeamsRaw from "../data/response_teams.json";
import floodScenarioRaw from "../data/flood_scenario.json";
import { getCurrentUserId } from "./authService";

// --- Normalize raw JSON (snake_case, source-shaped) into the camelCase
// shape the UI works with. -----------------------------------------------

const VILLAGES = villagesRaw.map((v) => ({
  id: v.id,
  name: v.name,
  x: v.x,
  y: v.y,
  population: v.population,
  distanceFromDamKm: v.distance_from_dam_km,
  flowSpeedMps: v.flow_speed_mps,
  flowBranch: v.flow_branch,
  arrivalTimeSeconds: v.arrival_time_seconds,
  shelterId: v.shelter_id,
  areaSqKm: v.area_sq_km,
  populationDensity: v.population_density,
  genderRatio: v.gender_ratio,
  numberOfHouses: v.number_of_houses,
}));

const USERS = usersRaw.map((u) => ({
  id: u.user_id,
  name: u.name,
  villageId: u.village_id,
  phone: u.phone,
  priorityPhone: u.priority_phone || false,
  exactAddress: u.exact_address,
  familyMembers: u.family_members || [],
  householdSize: (u.family_members ? u.family_members.length : 0) + 1,
  // Not present in the source data — sensible defaults for this prototype.
  notifyEmergency: true,
  notifyCritical: true,
  notifyShelter: true,
}));

const SHELTERS_BASE = sheltersRaw.map((s) => ({
  id: s.shelter_id,
  name: s.name,
  x: s.x,
  y: s.y,
  capacity: s.capacity,
  type: s.type,
}));

const RESPONSE_TEAMS = responseTeamsRaw.map((t) => ({
  id: t.team_id,
  name: t.name,
  type: t.type,
  x: t.location.x,
  y: t.location.y,
  contact: t.contact,
}));

const FLOOD_SCENARIO = {
  branches: floodScenarioRaw.branches.map((b) => ({
    name: b.name,
    path: b.path.map((p) => ({ x: p.x, y: p.y, timeSeconds: p.time_seconds })),
  })),
};

// Derive, for each shelter, which villages are routed to it and what total
// population that represents against its stated capacity. Computed from the
// real village -> shelter assignments rather than mocked.
const MOCK_SHELTERS = SHELTERS_BASE.map((s) => {
  const servedVillages = VILLAGES.filter((v) => v.shelterId === s.id);
  const assignedPopulation = servedVillages.reduce((sum, v) => sum + v.population, 0);
  const pct = assignedPopulation / s.capacity;
  const status = pct > 1 ? "Over Capacity" : pct > 0.8 ? "Near Capacity" : "Available";
  return {
    ...s,
    villageIds: servedVillages.map((v) => v.id),
    assignedPopulation,
    status,
  };
});

// Match each village to the flood branch (and elapsed time) that reaches it,
// using the shared (x, y, time) coordinates between villages.json and
// flood_scenario.json.
const VILLAGE_BRANCH_MAP = {};
FLOOD_SCENARIO.branches.forEach((branch) => {
  branch.path.forEach((point) => {
    if (point.timeSeconds === 0) return; // origin point, not a village
    const match = VILLAGES.find(
      (v) =>
        Math.abs(v.x - point.x) < 0.001 &&
        Math.abs(v.y - point.y) < 0.001 &&
        v.arrivalTimeSeconds === point.timeSeconds
    );
    if (match) VILLAGE_BRANCH_MAP[match.id] = branch.name;
  });
});

export const DataService = {
  getCurrentUser: () => USERS.find((u) => u.id === getCurrentUserId()),
  getUserById: (id) => USERS.find((u) => u.id === id),
  getVillageById: (id) => VILLAGES.find((v) => v.id === id),
  getAllVillages: () => VILLAGES,

  getAllShelters: () => MOCK_SHELTERS,
  getShelterById: (id) => MOCK_SHELTERS.find((s) => s.id === id),
  getShelterForVillage: (villageId) => {
    const village = VILLAGES.find((v) => v.id === villageId);
    return village ? MOCK_SHELTERS.find((s) => s.id === village.shelterId) : undefined;
  },
  getVillagesForShelter: (shelterId) => VILLAGES.filter((v) => v.shelterId === shelterId),

  getAllResponseTeams: () => RESPONSE_TEAMS,
  getResponseTeamsByType: (type) => RESPONSE_TEAMS.filter((t) => t.type === type),
  getNearestResponseTeam: (x, y) => {
    let best = null;
    let bestDist = Infinity;
    for (const t of RESPONSE_TEAMS) {
      const d = Math.hypot(t.x - x, t.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = t;
      }
    }
    return best;
  },

  getFloodScenario: () => FLOOD_SCENARIO,
  getVillageFloodBranch: (villageId) => VILLAGE_BRANCH_MAP[villageId] || null,
  getFloodTimeline: (branchName) =>
    VILLAGES.filter((v) => VILLAGE_BRANCH_MAP[v.id] === branchName).sort(
      (a, b) => a.arrivalTimeSeconds - b.arrivalTimeSeconds
    ),
};

export function formatElapsed(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
