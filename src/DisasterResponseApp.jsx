import React, { useState, useMemo, useEffect } from "react";
import { auth, db } from "./firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { PushNotifications } from "@capacitor/push-notifications";
import {
  AlertTriangle, Bell, Home, BookOpen, MapPin, User, Phone, ChevronRight,
  ChevronLeft, X, CheckCircle2, Shield, ShieldAlert, Flame, Droplets, Wind,
  Mountain, Thermometer, Zap, CloudLightning, Activity, Clock, Users,
  Navigation, Building2, Settings, ArrowLeft, LifeBuoy, Info, PhoneCall,
  Waves, Siren, ClipboardList, Wrench,
} from "lucide-react";

/* ============================================================================
   DATA LAYER
   ----------------------------------------------------------------------------
   This entire block is PLACEHOLDER / SYNTHETIC DATA standing in for
   users.json, village.json and shelters.json, which were not attached to
   this prototype. Shapes were inferred directly from the project brief
   (USER -> VILLAGE -> SHELTERS relationships; alert -> affected village).

   TO CONNECT REAL DATA: replace the three arrays below (MOCK_USERS,
   MOCK_VILLAGES, MOCK_SHELTERS) with the parsed contents of the real JSON
   files, or point DataService's three getters at fetch()/API calls instead.
   Nothing outside this block or DataService needs to change.
   ============================================================================ */

const MOCK_VILLAGES = [
  { id: "V1", name: "Riverside Village", region: "Lower Basin District", population: 2400, primaryRisk: "Flood / Dam Break" },
  { id: "V2", name: "Shivgaon", region: "Lower Basin District", population: 860, primaryRisk: "Flood / Dam Break", distanceFromDamKm: 4.948, arrivalTimeSeconds: 600, nearestShelter: "Emergency Relief Centre B" },
  { id: "V3", name: "Lakeview Village", region: "Lower Basin District", population: 3100, primaryRisk: "Flood" },
];

const MOCK_USERS = [
  { id: "U1", name: "Asha Patil", phone: "+91 98xxx xx001", villageId: "V1", householdSize: 4, notifyEmergency: true, notifyCritical: true, notifyShelter: true },
  { id: "U2", name: "Ramesh Kulkarni", phone: "+91 98xxx xx002", villageId: "V1", householdSize: 3, notifyEmergency: true, notifyCritical: true, notifyShelter: false },
  { id: "U3", name: "Meera Joshi", phone: "+91 98xxx xx003", villageId: "V2", householdSize: 2, notifyEmergency: true, notifyCritical: true, notifyShelter: true },
  { id: "U4", name: "Sanjay Deshmukh", phone: "+91 98xxx xx004", villageId: "V2", householdSize: 5, notifyEmergency: true, notifyCritical: false, notifyShelter: true },
  { id: "U5", name: "Priya Nair", phone: "+91 98xxx xx005", villageId: "V3", householdSize: 4, notifyEmergency: true, notifyCritical: true, notifyShelter: true },
  { id: "U6", name: "Arjun Singh", phone: "+91 98xxx xx006", villageId: "V3", householdSize: 1, notifyEmergency: true, notifyCritical: true, notifyShelter: true },
  { id: "U51", name: "Debajeet Mandal", phone: "9436319931", villageId: "V2", householdSize: 2, familyMembers: [{ name: "Abronile Sarkar", relation: "Friend" }], notifyEmergency: true, notifyCritical: true, notifyShelter: true },
  { id: "U52", name: "Abronile Sarkar", phone: "7758959913", villageId: "V2", householdSize: 2, familyMembers: [{ name: "Abhinav Ingole", relation: "Friend" }], notifyEmergency: true, notifyCritical: true, notifyShelter: true },
  { id: "U53", name: "Abhinav Ingole", phone: "9673352574", villageId: "V2", householdSize: 2, familyMembers: [{ name: "Janhvi Maojkar", relation: "Friend" }], notifyEmergency: true, notifyCritical: true, notifyShelter: true },
  { id: "U54", name: "Janhvi Maojkar", phone: "7219825405", villageId: "V2", householdSize: 2, familyMembers: [{ name: "Rupali", relation: "Friend" }], notifyEmergency: true, notifyCritical: true, notifyShelter: true },
  { id: "U55", name: "Rupali", phone: "7768884213", villageId: "V2", householdSize: 2, familyMembers: [{ name: "Piyush Patil", relation: "Friend" }], notifyEmergency: true, notifyCritical: true, notifyShelter: true },
  { id: "U56", name: "Piyush Patil", phone: "7020192835", villageId: "V2", householdSize: 2, familyMembers: [{ name: "Debajeet Mandal", relation: "Friend" }], notifyEmergency: true, notifyCritical: true, notifyShelter: true },
];

const MOCK_SHELTERS = [
  { id: "S1", name: "Riverside Community Hall", villageId: "V1", capacity: 500, occupancy: 0, status: "Available", address: "Main Road, Riverside Village", contactPhone: "+91 20xxxx0101", lat: 18.63, lng: 73.86 },
  { id: "S2", name: "Emergency Relief Centre B", villageId: "V2", capacity: 3000, occupancy: 0, status: "Available", address: "Relief Road, Shivgaon", contactPhone: "+91 20xxxx0102", lat: 18.58, lng: 74.35 },
  { id: "S3", name: "Hillside Government School", villageId: "V2", capacity: 300, occupancy: 40, status: "Available", address: "Ridge Road, Hillside Village", contactPhone: "+91 20xxxx0103", lat: 18.70, lng: 73.80 },
  { id: "S4", name: "Lakeview Town Hall", villageId: "V3", capacity: 600, occupancy: 210, status: "Available", address: "Lake Road, Lakeview Village", contactPhone: "+91 20xxxx0104", lat: 18.58, lng: 73.90 },
  { id: "S5", name: "Lakeview Sports Complex", villageId: "V3", capacity: 1000, occupancy: 950, status: "Near Capacity", address: "Stadium Street, Lakeview Village", contactPhone: "+91 20xxxx0105", lat: 18.585, lng: 73.905 },
];

// The synthetic "logged in" user for this prototype (no real auth system).
const CURRENT_USER_ID = "U51";

/* ---------------------------- DataService ---------------------------------
   Clean read layer. Screens call these functions and never touch the arrays
   above directly, so swapping mock arrays for real API calls later only
   means editing this block. */
const DataService = {
  getCurrentUser: () => MOCK_USERS.find((u) => u.id === CURRENT_USER_ID),
  getUserById: (id) => MOCK_USERS.find((u) => u.id === id),
  getVillageById: (id) => MOCK_VILLAGES.find((v) => v.id === id),
  getSheltersByVillage: (villageId) => MOCK_SHELTERS.filter((s) => s.villageId === villageId),
  getAllShelters: () => MOCK_SHELTERS,
  getShelterById: (id) => MOCK_SHELTERS.find((s) => s.id === id),
  getAllVillages: () => MOCK_VILLAGES,
};

/* ============================================================================
   ALERT SERVICE (mock, backend-shaped)
   ----------------------------------------------------------------------------
   This is the abstraction the brief asks for: the rest of the app only calls
   AlertService methods and renders whatever shape they return. Today that
   shape is produced by a small in-memory demo generator. Later, swap the
   body of getActiveAlerts()/getAlertHistory() for a REST/WebSocket/Firebase
   call that returns objects with this same shape and nothing else in the
   app needs to change:

   {
     id, type, severity ("INFO"|"WARNING"|"HIGH"|"CRITICAL"),
     villageId, message, timestamp, status ("ACTIVE"|"RESOLVED"),
     evacuationSteps: string[]
   }
   ============================================================================ */

const ALERT_PRESETS = {
  NONE: null,
  FLOOD_WARNING: {
    id: "A-DEMO-1",
    type: "FLOOD",
    severity: "WARNING",
    villageId: "V3",
    message: "Water levels are rising near Lakeview Village. Residents should monitor updates and prepare to move to higher ground.",
    status: "ACTIVE",
    evacuationSteps: [
      "Monitor official updates closely.",
      "Prepare an emergency kit and important documents.",
      "Identify your nearest designated shelter.",
      "Avoid low-lying roads and drainage areas.",
      "Be ready to evacuate on short notice.",
    ],
  },
  DAM_BREAK_CRITICAL: {
    id: "A-DEMO-2",
    type: "DAM_BREAK",
    severity: "CRITICAL",
    villageId: "V1",
    message: "Dam breach detected upstream of Riverside Village. Immediate evacuation is advised.",
    status: "ACTIVE",
    evacuationSteps: [
      "Move toward designated safe / high ground immediately.",
      "Follow official evacuation instructions.",
      "Take essential medications and important documents.",
      "Do not attempt to cross floodwater.",
      "Proceed to the nearest designated shelter.",
      "Follow further official instructions.",
    ],
  },
  EVACUATION_ALERT: {
    id: "A-DEMO-3",
    type: "EVACUATION",
    severity: "HIGH",
    villageId: "V1",
    message: "Evacuation order in effect for Riverside Village. Shelters are open and accepting residents.",
    status: "ACTIVE",
    evacuationSteps: [
      "Leave your home in an orderly manner.",
      "Bring essential medications and documents.",
      "Proceed directly to your nearest shelter.",
      "Check in with shelter staff on arrival.",
      "Do not return home until authorities confirm it is safe.",
    ],
  },
};

const ALERT_HISTORY = [
  { id: "H-1", type: "CYCLONE", severity: "WARNING", villageId: "V3", message: "Cyclone warning issued for coastal approach; since downgraded.", status: "RESOLVED", timestamp: "2026-08-12T06:30:00Z", evacuationSteps: [] },
  { id: "H-2", type: "FLOOD", severity: "HIGH", villageId: "V1", message: "Heavy rainfall caused localized flooding near Riverside Village.", status: "RESOLVED", timestamp: "2026-07-29T14:05:00Z", evacuationSteps: [] },
  { id: "H-3", type: "LANDSLIDE", severity: "WARNING", villageId: "V2", message: "Minor slope movement observed near Hillside Village after heavy rain.", status: "RESOLVED", timestamp: "2026-07-02T09:15:00Z", evacuationSteps: [] },
];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function useAlertService(villageId, userId) {
  // In-memory demo state stands in for a live push/WebSocket feed.
  const [activePreset, setActivePreset] = useState("NONE");
  const [liveAlert, setLiveAlert] = useState(null);

  useEffect(() => {
    const backendVillageId = villageId === "V2" ? "V002" : villageId;
    if (!backendVillageId) return undefined;
    const poll = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/alerts/village/${backendVillageId}`);
        if (!response.ok) return;
        const data = await response.json();
        setLiveAlert(data.active ? { ...data.alert, villageId, elapsedSeconds: data.elapsed_seconds, nearestRefugeCenter: "Emergency Relief Centre B" } : null);
      } catch {
        // Demo alerts remain available when the API is offline.
      }
    };
    poll();
    const timer = setInterval(poll, 2000);
    return () => clearInterval(timer);
  }, [villageId]);

  useEffect(() => {
    let removeRegistration;
    let removeReceived;
    const registerForPush = async () => {
      try {
        const permission = await PushNotifications.requestPermissions();
        if (permission.receive !== "granted") return;
        await PushNotifications.createChannel({ id: "rakshanet-alerts", name: "Emergency Alerts", importance: 5, sound: "default" });
        removeRegistration = await PushNotifications.addListener("registration", async ({ value }) => {
          await fetch(`${API_BASE_URL}/api/alerts/register-device`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId, village_id: villageId === "V2" ? "V002" : villageId, fcm_token: value }),
          });
        });
        removeReceived = await PushNotifications.addListener("pushNotificationReceived", (notification) => {
          setLiveAlert((current) => current || { severity: "CRITICAL", type: "DAM_BREAK", villageId, message: notification.body, status: "ACTIVE", evacuationSteps: [] });
        });
        await PushNotifications.register();
      } catch {
        // Push plugin is unavailable in browser builds; polling still works.
      }
    };
    registerForPush();
    return () => {
      removeRegistration?.remove();
      removeReceived?.remove();
    };
  }, [villageId, userId]);

  const activeAlert = useMemo(() => {
    const preset = ALERT_PRESETS[activePreset];
    if (!preset) return null;
    return { ...preset, timestamp: new Date().toISOString() };
  }, [activePreset]);

  return {
    getActiveAlert: () => liveAlert || activeAlert, // backend alert takes precedence
    getAlertHistory: () => ALERT_HISTORY,
    // Demo-only control. A real integration replaces this with a
    // subscription to the backend's push channel.
    triggerDemo: (presetKey) => setActivePreset(presetKey),
    currentDemoPreset: activePreset,
  };
}

/* ============================================================================
   GUIDE CONTENT (educational, concise)
   ============================================================================ */

const GUIDES = [
  {
    id: "flood", title: "Flood Safety", icon: Droplets, color: "blue",
    overview: "Floods can develop quickly after heavy rain, dam release, or river overflow. Acting early is the biggest factor in staying safe.",
    warningSigns: ["Rapid rise in river or stream level", "Continuous heavy rainfall", "Official flood warnings issued", "Water pooling in low-lying areas"],
    before: ["Prepare an emergency kit.", "Keep important documents protected.", "Know your nearest shelter.", "Keep phones charged.", "Follow local warnings."],
    during: ["Move to higher ground.", "Follow evacuation instructions.", "Avoid walking or driving through floodwater.", "Stay away from electrical equipment in flooded areas."],
    after: ["Do not return until authorities say it is safe.", "Avoid contaminated water.", "Watch for damaged roads and infrastructure."],
    avoid: ["Do not walk or drive through moving water.", "Do not ignore evacuation orders.", "Do not use electrical appliances that got wet."],
    checklist: ["Emergency kit packed", "Documents in waterproof bag", "Shelter location known", "Phone charged", "Family evacuation plan agreed"],
  },
  {
    id: "dam_break", title: "Dam Break Response", icon: Waves, color: "red",
    overview: "A dam break can send a fast-moving wall of water downstream with very little warning. Evacuation speed matters more than belongings.",
    warningSigns: ["Official dam break / breach alert", "Sudden loud roaring sound from the dam direction", "Sudden unusual water release or flow", "Ground vibration near the dam"],
    before: ["Know if you live in a dam-risk zone.", "Identify a high-ground evacuation route in advance.", "Keep emergency contacts and shelter info handy."],
    during: ["Move to high ground immediately, do not wait for confirmation.", "Do not attempt to outrun water along low ground.", "Take only essential medication and documents.", "Help neighbors who may not have received the alert."],
    after: ["Stay away from the affected riverbank and structures.", "Wait for official confirmation before returning.", "Report structural damage to authorities."],
    avoid: ["Do not drive across low bridges or causeways.", "Do not delay to collect belongings.", "Do not re-enter evacuated areas early."],
    checklist: ["High-ground route known", "Emergency kit ready", "Household evacuation plan agreed", "Neighbors aware of the plan"],
  },
  {
    id: "earthquake", title: "Earthquake Safety", icon: Activity, color: "orange",
    overview: "Earthquakes strike without warning. The main protective actions happen in the first seconds of shaking.",
    warningSigns: ["Earthquakes generally strike without prior warning", "Minor foreshocks may sometimes precede a larger quake"],
    before: ["Secure heavy furniture and shelving.", "Identify safe spots in each room (under sturdy furniture).", "Keep an emergency kit accessible."],
    during: ["Drop, cover, and hold on.", "Stay away from windows and heavy objects.", "If outdoors, move to open ground away from buildings.", "If driving, pull over and stop away from bridges or overpasses."],
    after: ["Check for injuries and hazards before moving.", "Expect aftershocks.", "Avoid damaged buildings until inspected."],
    avoid: ["Do not run outside during shaking.", "Do not use elevators.", "Do not light open flames in case of gas leaks."],
    checklist: ["Furniture secured", "Safe spots identified at home", "Emergency kit accessible", "Gas shutoff location known"],
  },
  {
    id: "cyclone", title: "Cyclone Preparedness", icon: Wind, color: "sky",
    overview: "Cyclones are usually forecast days in advance, giving time to prepare and, if needed, evacuate ahead of landfall.",
    warningSigns: ["Official cyclone watch or warning", "Rapidly falling barometric pressure", "Strengthening winds and darkening sky"],
    before: ["Track official forecasts and warnings.", "Secure loose outdoor items.", "Stock food, water, and medication.", "Know your evacuation route and shelter."],
    during: ["Stay indoors, away from windows.", "Move to the strongest part of the building.", "Do not go outside during a lull; the storm may return."],
    after: ["Watch for fallen power lines and debris.", "Avoid floodwater left behind.", "Check on neighbors, especially the elderly."],
    avoid: ["Do not go outside to sightsee during the storm.", "Do not use candles near gas leaks.", "Do not drive through debris-covered roads."],
    checklist: ["Outdoor items secured", "Food/water/medication stocked", "Evacuation route known", "Battery radio or charged phone ready"],
  },
  {
    id: "fire", title: "Fire Safety", icon: Flame, color: "red",
    overview: "Whether household or wildfire, speed of response and a clear exit plan are what keep people safe.",
    warningSigns: ["Smoke smell or haze", "Visible flames or glow at night", "Official wildfire alerts in your area"],
    before: ["Install and test smoke alarms.", "Plan two exit routes from your home.", "Keep a fire extinguisher accessible.", "Clear dry vegetation near your home."],
    during: ["Get low and move to the nearest safe exit.", "Do not use elevators.", "Call emergency services once safe.", "For wildfire, evacuate early rather than waiting."],
    after: ["Do not re-enter until authorities confirm it's safe.", "Check for hidden embers or hot spots.", "Ventilate before extended re-entry."],
    avoid: ["Do not go back inside for belongings.", "Do not use water on an electrical or oil fire.", "Do not block your own exit route."],
    checklist: ["Smoke alarms tested", "Two exit routes planned", "Fire extinguisher accessible", "Meeting point agreed with family"],
  },
  {
    id: "landslide", title: "Landslide Safety", icon: Mountain, color: "amber",
    overview: "Landslides often follow prolonged heavy rain on unstable slopes and can happen with very little notice.",
    warningSigns: ["Cracks appearing in ground or walls", "Doors or windows sticking for the first time", "Tilting trees, poles, or fences", "Unusual sounds like cracking or rumbling"],
    before: ["Know if your home is on or below a slope at risk.", "Watch for signs of ground movement after heavy rain.", "Plan an evacuation route away from the slope path."],
    during: ["Move away from the path of the slide quickly.", "Head to higher ground away from the slope, not straight uphill into it.", "Avoid river valleys and low areas downstream of the slope."],
    after: ["Stay away from the slide area; further movement is possible.", "Report broken utility lines to authorities.", "Avoid re-entering damaged structures."],
    avoid: ["Do not return to check on property during active movement.", "Do not build or park directly below steep, saturated slopes."],
    checklist: ["Risk of slope near home understood", "Evacuation route away from slope known", "Emergency kit ready", "Neighbors informed of warning signs"],
  },
  {
    id: "heatwave", title: "Heatwave Response", icon: Thermometer, color: "orange",
    overview: "Extreme heat is a quiet hazard that mainly affects the very young, elderly, and those without cooling access.",
    warningSigns: ["Official heatwave advisory", "Consecutive days of unusually high temperature", "Reduced night-time cooling"],
    before: ["Identify cool spaces you can access.", "Stock extra drinking water.", "Check in on elderly or vulnerable neighbors."],
    during: ["Stay hydrated and avoid strenuous activity outdoors.", "Stay in shade or cooled spaces during peak heat hours.", "Watch for signs of heat exhaustion (dizziness, heavy sweating, nausea)."],
    after: ["Continue checking on vulnerable people as heat lingers.", "Rehydrate gradually."],
    avoid: ["Do not leave anyone, including pets, in a parked vehicle.", "Do not exercise outdoors during peak heat.", "Do not rely on alcohol or caffeine to rehydrate."],
    checklist: ["Cool space identified", "Extra water stocked", "Vulnerable neighbors checked on", "Heat exhaustion signs known"],
  },
  {
    id: "lightning", title: "Lightning Safety", icon: Zap, color: "yellow",
    overview: "Lightning can strike well before or after visible rain. Getting indoors early is the only reliable protection.",
    warningSigns: ["Darkening skies and distant thunder", "Increasing wind ahead of a storm", "Official thunderstorm alerts"],
    before: ["Check the forecast before outdoor activity.", "Know the nearest sturdy shelter wherever you are."],
    during: ["Get indoors or into a hard-topped vehicle.", "Avoid open fields, hilltops, and isolated trees.", "Stay away from water and metal objects.", "Wait 30 minutes after the last thunder before going back outside."],
    after: ["Check for anyone struck; lightning injury victims can be safely helped.", "Report downed power lines."],
    avoid: ["Do not shelter under a tall or isolated tree.", "Do not use corded electronics or plumbing during a storm.", "Do not resume outdoor activity too soon after thunder stops."],
    checklist: ["Nearest sturdy shelter known", "Outdoor plans checked against forecast", "Waited 30 minutes after last thunder"],
  },
  {
    id: "severe_storm", title: "Severe Storm Safety", icon: CloudLightning, color: "slate",
    overview: "Severe storms combine wind, rain, and lightning risk together, and can escalate quickly.",
    warningSigns: ["Official severe storm warning", "Rapidly darkening sky and strong wind gusts", "Sudden temperature drop"],
    before: ["Secure loose outdoor items.", "Charge phones and keep a torch accessible.", "Know your safest room away from windows."],
    during: ["Stay indoors, away from windows and doors.", "Unplug sensitive electronics.", "Avoid travel until the storm passes."],
    after: ["Watch for fallen trees, debris, and power lines.", "Report hazards to authorities before clearing them yourself."],
    avoid: ["Do not travel unless necessary.", "Do not touch fallen power lines.", "Do not shelter near large windows."],
    checklist: ["Outdoor items secured", "Safest room identified", "Phone charged", "Torch accessible"],
  },
];

/* ============================================================================
   THEME HELPERS
   ============================================================================ */

const SEVERITY_STYLES = {
  INFO: { badge: "bg-green-100 text-green-700", dot: "bg-green-500", ring: "ring-green-200", label: "Informational" },
  WARNING: { badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500", ring: "ring-amber-200", label: "Warning" },
  HIGH: { badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500", ring: "ring-orange-200", label: "High Risk" },
  CRITICAL: { badge: "bg-red-100 text-red-700", dot: "bg-red-600", ring: "ring-red-300", label: "Critical" },
};

const ALERT_TYPE_LABEL = {
  FLOOD: "Flood", DAM_BREAK: "Dam Break", EVACUATION: "Evacuation Order",
  CYCLONE: "Cyclone", LANDSLIDE: "Landslide", EARTHQUAKE: "Earthquake",
  FIRE: "Fire", HEATWAVE: "Heatwave", LIGHTNING: "Lightning",
};

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function formatTimestamp(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/* ============================================================================
   SMALL REUSABLE COMPONENTS
   ============================================================================ */

function Card({ children, className = "" }) {
  return <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 min-w-0 max-w-full ${className}`}>{children}</div>;
}

function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-bold tracking-wide text-gray-500 uppercase">{children}</h2>
      {action}
    </div>
  );
}

function PrimaryButton({ children, onClick, className = "", icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={`w-full min-w-0 max-w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold py-3.5 rounded-xl transition-colors ${className}`}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick, className = "", icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={`w-full min-w-0 max-w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-800 font-semibold py-3.5 rounded-xl transition-colors ${className}`}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
}

function SeverityBadge({ severity }) {
  const s = SEVERITY_STYLES[severity] || SEVERITY_STYLES.INFO;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function TopHeader({ title, onBack, right }) {
  return (
    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100 px-3 min-[360px]:px-4 py-3.5 flex items-center justify-between gap-2 min-w-0 w-full max-w-full">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {onBack && (
          <button onClick={onBack} className="p-1 -ml-1 text-gray-600 hover:text-gray-900 shrink-0">
            <ArrowLeft size={20} />
          </button>
        )}
        <h1 className="font-bold text-gray-900 text-base min-[360px]:text-lg truncate">{title}</h1>
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function ProgressBar({ value, max }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color = pct >= 90 ? "bg-red-600" : pct >= 70 ? "bg-orange-500" : "bg-green-500";
  return (
    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function HazardStripe() {
  // Signature visual motif: a thin diagonal hazard-stripe bar used only on
  // critical/emergency surfaces, echoing caution tape without being literal.
  return (
    <div
      className="h-2 w-full"
      style={{
        backgroundImage: "repeating-linear-gradient(135deg, #fff 0 10px, #ef4444 10px 20px)",
      }}
    />
  );
}

/* ============================================================================
   BOTTOM NAVIGATION
   ============================================================================ */

function BottomNav({ active, onNavigate }) {
  const items = [
    { key: "home", label: "Home", icon: Home },
    { key: "alerts", label: "Alerts", icon: Bell },
    { key: "guides", label: "Guides", icon: BookOpen },
    { key: "shelters", label: "Shelters", icon: MapPin },
  ];
  return (
    <div className="app-bottom-nav absolute bottom-0 left-0 right-0 w-full max-w-full bg-white border-t border-gray-100 flex items-stretch px-0.5 min-[360px]:px-1 pt-1 z-30">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 min-[360px]:gap-1 py-2 rounded-xl"
          >
            <Icon size={20} className={isActive ? "text-red-600" : "text-gray-400"} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`text-[10px] min-[360px]:text-[11px] font-medium truncate w-full text-center px-0.5 ${isActive ? "text-red-600" : "text-gray-400"}`}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================================
   SCREEN: HOME
   ============================================================================ */

function HomeScreen({ user, village, activeAlert, onNavigate, onOpenAlert, onOpenSOS }) {
  const hasAlert = !!activeAlert;
  const sev = hasAlert ? SEVERITY_STYLES[activeAlert.severity] : SEVERITY_STYLES.INFO;

  return (
    <div className="pb-6 w-full max-w-full min-w-0">
      {/* Header */}
      <div className="app-home-pad px-3 min-[360px]:px-4 pt-4 pb-2 flex items-center justify-between gap-2 min-w-0 w-full">
        <div className="flex items-center gap-2 min-[360px]:gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 min-[360px]:w-9 min-[360px]:h-9 rounded-xl bg-red-600 flex items-center justify-center shrink-0">
            <ShieldAlert size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-gray-900 leading-none truncate">RakshaNet</p>
            <p className="text-[11px] text-gray-400 leading-none mt-0.5 truncate">Disaster Alert &amp; Response</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 min-[360px]:gap-1 shrink-0">
          <button onClick={() => onNavigate("alerts")} className="p-1.5 min-[360px]:p-2 rounded-full hover:bg-gray-50 relative">
            <Bell size={20} className="text-gray-600" />
            {hasAlert && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full" />}
          </button>
          <button onClick={() => onNavigate("profile")} className="p-1.5 min-[360px]:p-2 rounded-full hover:bg-gray-50">
            <User size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      <div className="app-home-pad px-3 min-[360px]:px-4 mt-2 space-y-4 min-w-0">
        {/* Current Safety Status */}
        <Card className={`overflow-hidden ${hasAlert ? "ring-2 " + sev.ring : ""}`}>
          {hasAlert && <HazardStripe />}
          <div className="p-4">
            <p className="text-xs font-bold tracking-wide text-gray-400 uppercase mb-2">Current Status</p>
            {!hasAlert ? (
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={26} className="text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-gray-900 text-lg leading-tight">All Clear</p>
                  <p className="text-sm text-gray-500 mt-0.5 break-words">
                    Your area ({village?.name}) currently has no active emergency alerts.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${activeAlert.severity === "CRITICAL" ? "bg-red-100" : "bg-orange-100"}`}>
                  <Siren size={26} className={activeAlert.severity === "CRITICAL" ? "text-red-600" : "text-orange-600"} />
                </div>
                <div className="min-w-0">
                  <p className={`font-extrabold text-lg leading-tight ${activeAlert.severity === "CRITICAL" ? "text-red-700" : "text-orange-700"}`}>
                    {activeAlert.severity === "CRITICAL" ? "Emergency Active" : "Alert Active"}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5 break-words">
                    An active alert affects {DataService.getVillageById(activeAlert.villageId)?.name}.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Emergency Alert Card */}
        {hasAlert && (
          <button onClick={() => onOpenAlert(activeAlert)} className="w-full text-left">
            <Card className={`overflow-hidden ${activeAlert.severity === "CRITICAL" ? "ring-2 ring-red-400" : "ring-1 ring-orange-200"}`}>
              <div className={`px-4 py-3 flex items-center gap-2 min-w-0 ${activeAlert.severity === "CRITICAL" ? "bg-red-600" : "bg-orange-500"}`}>
                <AlertTriangle size={18} className="text-white shrink-0" />
                <p className="text-white font-extrabold text-sm tracking-wide min-w-0 break-words">
                  {activeAlert.severity === "CRITICAL" ? "🚨 " : ""}
                  {ALERT_TYPE_LABEL[activeAlert.type]?.toUpperCase()} ALERT
                </p>
              </div>
              <div className="p-4 min-w-0">
                <p className="font-semibold text-gray-900 text-sm break-words">{activeAlert.message}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1 min-w-0"><MapPin size={12} className="shrink-0" />{DataService.getVillageById(activeAlert.villageId)?.name}</span>
                  <span className="flex items-center gap-1"><Clock size={12} className="shrink-0" />{timeAgo(activeAlert.timestamp)}</span>
                </div>
                {activeAlert.elapsedSeconds !== undefined && (
                  <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-800 space-y-1">
                    <p><strong>Elapsed event time:</strong> {formatElapsed(activeAlert.elapsedSeconds)}</p>
                    <p><strong>Nearest refuge:</strong> {activeAlert.nearestRefugeCenter || "Emergency Relief Centre B"}</p>
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between text-red-600 font-bold text-sm">
                  View Alert <ChevronRight size={16} />
                </div>
              </div>
            </Card>
          </button>
        )}

        {hasAlert && (
          <div className="grid grid-cols-2 gap-2">
            <a href="tel:112" className="rounded-xl bg-red-600 px-3 py-3 text-center text-sm font-bold text-white">Call 112</a>
            <a href="tel:108" className="rounded-xl border border-red-200 bg-white px-3 py-3 text-center text-sm font-bold text-red-700">Call Ambulance</a>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <SectionTitle>Quick Actions</SectionTitle>
          <div className="grid grid-cols-2 gap-2 min-[360px]:gap-3">
            <QuickAction icon={Siren} label="Emergency SOS" tone="red" onClick={onOpenSOS} />
            <QuickAction icon={MapPin} label="Find Shelter" tone="gray" onClick={() => onNavigate("shelters")} />
            <QuickAction icon={BookOpen} label="Safety Guides" tone="gray" onClick={() => onNavigate("guides")} />
            <QuickAction icon={PhoneCall} label="Emergency Contacts" tone="gray" onClick={() => onNavigate("contacts")} />
          </div>
        </div>

        {/* Latest Information */}
        <div>
          <SectionTitle>Latest Information</SectionTitle>
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2 min-[360px]:gap-3">
            {GUIDES.slice(0, 6).map((g) => {
              const Icon = g.icon;
              return (
                <button
                  key={g.id}
                  onClick={() => onNavigate("guideDetail", g.id)}
                  className="min-w-0 w-full text-left"
                >
                  <Card className="p-3 h-full">
                    <div className={`w-9 h-9 rounded-lg bg-${g.color}-100 flex items-center justify-center mb-2`}>
                      <Icon size={18} className={`text-${g.color}-600`} />
                    </div>
                    <p className="font-semibold text-gray-900 text-sm leading-snug break-words">{g.title}</p>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2 break-words">{g.overview}</p>
                  </Card>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, tone, onClick }) {
  const isRed = tone === "red";
  return (
    <button
      onClick={onClick}
      className={`w-full min-w-0 flex flex-col items-center justify-center gap-2 rounded-2xl py-4 min-[360px]:py-5 px-1 border ${
        isRed ? "bg-red-600 border-red-600" : "bg-white border-gray-100 shadow-sm"
      }`}
    >
      <Icon size={24} className={isRed ? "text-white" : "text-red-600"} />
      <span className={`text-[11px] min-[360px]:text-xs font-semibold text-center px-1 leading-tight break-words ${isRed ? "text-white" : "text-gray-700"}`}>{label}</span>
    </button>
  );
}

/* ============================================================================
   SCREEN: ALERTS
   ============================================================================ */

function AlertsScreen({ activeAlert, history, onOpenAlert }) {
  return (
    <div>
      <TopHeader title="Alerts" />
      <div className="px-3 min-[360px]:px-4 py-4 space-y-5 min-w-0 w-full max-w-full">
        <div>
          <SectionTitle>Active Alerts</SectionTitle>
          {activeAlert ? (
            <AlertRow alert={activeAlert} onClick={() => onOpenAlert(activeAlert)} />
          ) : (
            <Card className="p-5 flex items-center gap-3 min-w-0">
              <CheckCircle2 size={22} className="text-green-600 shrink-0" />
              <p className="text-sm text-gray-500 min-w-0 break-words">No active alerts right now. We'll notify you immediately if that changes.</p>
            </Card>
          )}
        </div>

        <div>
          <SectionTitle>Alert History</SectionTitle>
          <div className="space-y-2.5">
            {history.map((a) => (
              <AlertRow key={a.id} alert={a} onClick={() => onOpenAlert(a)} muted />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertRow({ alert, onClick, muted }) {
  const village = DataService.getVillageById(alert.villageId);
  return (
    <button onClick={onClick} className="w-full text-left">
      <Card className={`p-4 ${muted ? "opacity-80" : ""}`}>
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <p className="font-bold text-gray-900 text-sm break-words">{ALERT_TYPE_LABEL[alert.type] || alert.type}</p>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2 break-words">{alert.message}</p>
          </div>
          <SeverityBadge severity={alert.severity} />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1 min-w-0"><MapPin size={12} className="shrink-0" />{village?.name}</span>
          <span className="flex items-center gap-1">
            <Clock size={12} className="shrink-0" />
            {alert.status === "ACTIVE" ? timeAgo(alert.timestamp) : formatTimestamp(alert.timestamp)}
          </span>
          <span className={`font-semibold ${alert.status === "ACTIVE" ? "text-red-600" : "text-gray-400"}`}>
            {alert.status === "ACTIVE" ? "Active" : "Resolved"}
          </span>
        </div>
      </Card>
    </button>
  );
}

/* ============================================================================
   SCREEN: ALERT DETAILS
   ============================================================================ */

function AlertDetailScreen({ alert, onBack, onNavigate, onOpenSOS }) {
  const village = DataService.getVillageById(alert.villageId);
  const sev = SEVERITY_STYLES[alert.severity];
  const isCritical = alert.severity === "CRITICAL" || alert.severity === "HIGH";
  const steps = alert.evacuationSteps?.length
    ? alert.evacuationSteps
    : ["Follow official guidance for this alert type.", "Stay informed through this app.", "Contact emergency services if you are in immediate danger."];

  return (
    <div>
      <TopHeader title="Alert Details" onBack={onBack} />
      <div className={isCritical ? "bg-red-600" : "bg-amber-500"}>
        {isCritical && <HazardStripe />}
        <div className="px-4 min-[360px]:px-5 pt-4 pb-6 text-white min-w-0">
          <div className="flex items-center gap-2 mb-2 min-w-0">
            <AlertTriangle size={18} className="shrink-0" />
            <span className="text-xs font-bold tracking-widest uppercase break-words min-w-0">{sev.label} Alert</span>
          </div>
          <h1 className="text-xl min-[360px]:text-2xl font-extrabold leading-tight break-words">{ALERT_TYPE_LABEL[alert.type] || alert.type}</h1>
          <div className="mt-4 space-y-1.5 text-sm text-white/90">
            <p className="flex items-start gap-2 min-w-0"><MapPin size={14} className="shrink-0 mt-0.5" /> <span className="break-words">Affected Area: <span className="font-semibold">{village?.name}</span></span></p>
            <p className="flex items-start gap-2 min-w-0"><Clock size={14} className="shrink-0 mt-0.5" /> <span className="break-words">Time: <span className="font-semibold">{formatTimestamp(alert.timestamp)}</span></span></p>
          </div>
          {alert.elapsedSeconds !== undefined && (
            <div className="mt-4 rounded-xl bg-black/15 p-3 text-sm text-white">
              <p>Elapsed event time: <span className="font-bold">{formatElapsed(alert.elapsedSeconds)}</span></p>
              <p className="mt-1">Nearest refuge centre: <span className="font-bold">{alert.nearestRefugeCenter || "Emergency Relief Centre B"}</span></p>
            </div>
          )}
        </div>
      </div>

      <div className="px-3 min-[360px]:px-4 -mt-3 min-w-0">
        <Card className="p-4">
          <p className="text-sm text-gray-700 italic">&ldquo;{alert.message}&rdquo;</p>
        </Card>
      </div>

      <div className="px-3 min-[360px]:px-4 mt-5 min-w-0">
        <SectionTitle>What You Should Do Now</SectionTitle>
        <Card className="p-4">
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-700 leading-snug">{s}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="px-3 min-[360px]:px-4 mt-5 mb-6 space-y-2.5 min-w-0">
        <PrimaryButton icon={MapPin} onClick={() => onNavigate("shelters")}>Find Nearest Shelter</PrimaryButton>
        <SecondaryButton icon={Info} onClick={() => onNavigate("guideDetail", guideIdForAlertType(alert.type))}>
          View Evacuation Information
        </SecondaryButton>
        <SecondaryButton icon={Siren} onClick={onOpenSOS} className="border-red-200 text-red-700">
          Emergency SOS
        </SecondaryButton>
      </div>
    </div>
  );
}

function guideIdForAlertType(type) {
  const map = { FLOOD: "flood", DAM_BREAK: "dam_break", EVACUATION: "dam_break", CYCLONE: "cyclone", LANDSLIDE: "landslide", EARTHQUAKE: "earthquake", FIRE: "fire", HEATWAVE: "heatwave", LIGHTNING: "lightning" };
  return map[type] || "flood";
}

/* ============================================================================
   SCREEN: GUIDES + GUIDE DETAIL
   ============================================================================ */

function GuidesScreen({ onOpen }) {
  return (
    <div>
      <TopHeader title="Safety Guides" />
      <div className="px-3 min-[360px]:px-4 py-4 min-w-0 w-full max-w-full">
        <p className="text-sm text-gray-500 mb-4 break-words">Learn how to prepare for, respond to, and recover from common disasters.</p>
        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2 min-[360px]:gap-3">
          {GUIDES.map((g) => {
            const Icon = g.icon;
            return (
              <button key={g.id} onClick={() => onOpen(g.id)} className="text-left min-w-0 w-full">
                <Card className="p-3.5 h-full">
                  <div className={`w-10 h-10 rounded-xl bg-${g.color}-100 flex items-center justify-center mb-2.5`}>
                    <Icon size={20} className={`text-${g.color}-600`} />
                  </div>
                  <p className="font-bold text-gray-900 text-sm leading-snug break-words">{g.title}</p>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2 break-words">{g.overview}</p>
                </Card>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function GuideDetailScreen({ guide, onBack }) {
  const Icon = guide.icon;
  const sections = [
    { label: "Before", items: guide.before, tone: "gray" },
    { label: "During", items: guide.during, tone: "red" },
    { label: "After", items: guide.after, tone: "gray" },
    { label: "Things to Avoid", items: guide.avoid, tone: "amber" },
  ];
  return (
    <div>
      <TopHeader title={guide.title} onBack={onBack} />
      <div className="px-3 min-[360px]:px-4 py-4 min-w-0 w-full max-w-full">
        <div className="flex items-center gap-3 mb-4 min-w-0">
          <div className={`w-12 h-12 rounded-2xl bg-${guide.color}-100 flex items-center justify-center shrink-0`}>
            <Icon size={24} className={`text-${guide.color}-600`} />
          </div>
          <h1 className="text-lg min-[360px]:text-xl font-extrabold text-gray-900 min-w-0 break-words">{guide.title}</h1>
        </div>

        <Card className="p-4 mb-4">
          <p className="text-sm text-gray-600 leading-relaxed">{guide.overview}</p>
        </Card>

        <Card className="p-4 mb-4">
          <p className="text-xs font-bold tracking-wide text-gray-400 uppercase mb-2">Warning Signs</p>
          <ul className="space-y-1.5">
            {guide.warningSigns.map((w, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />{w}
              </li>
            ))}
          </ul>
        </Card>

        {sections.map((sec) => (
          <div key={sec.label} className="mb-4">
            <p className={`text-xs font-bold tracking-wide uppercase mb-2 ${sec.tone === "red" ? "text-red-600" : sec.tone === "amber" ? "text-amber-600" : "text-gray-400"}`}>
              {sec.label}
            </p>
            <Card className="p-4">
              <ul className="space-y-2">
                {sec.items.map((it, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-gray-300 mt-0.5 shrink-0" />{it}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        ))}

        <div className="mb-4">
          <p className="text-xs font-bold tracking-wide text-gray-400 uppercase mb-2">Quick Checklist</p>
          <Card className="p-4">
            <ul className="space-y-2.5">
              {guide.checklist.map((c, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded border-2 border-gray-300 shrink-0" />{c}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   SCREEN: SHELTERS + SHELTER DETAIL
   ============================================================================ */

function SheltersScreen({ villages, shelters, onOpen }) {
  const [filterVillage, setFilterVillage] = useState("ALL");
  const filtered = filterVillage === "ALL" ? shelters : shelters.filter((s) => s.villageId === filterVillage);

  return (
    <div>
      <TopHeader title="Shelters" />
      <div className="px-3 min-[360px]:px-4 pt-3 pb-2 flex flex-wrap gap-2">
        <FilterChip label="All Villages" active={filterVillage === "ALL"} onClick={() => setFilterVillage("ALL")} />
        {villages.map((v) => (
          <FilterChip key={v.id} label={v.name} active={filterVillage === v.id} onClick={() => setFilterVillage(v.id)} />
        ))}
      </div>

      {/* Map placeholder — structured so a real map/directions view can drop in later */}
      <div className="mx-3 min-[360px]:mx-4 mt-2 mb-3 rounded-2xl bg-gray-100 border border-gray-200 h-28 flex items-center justify-center relative overflow-hidden px-3">
        <div className="text-center min-w-0">
          <Navigation size={20} className="text-gray-400 mx-auto mb-1" />
          <p className="text-xs text-gray-400 font-medium break-words">Map view placeholder — live map/directions can be connected here</p>
        </div>
      </div>

      <div className="px-3 min-[360px]:px-4 pb-4 space-y-3 min-w-0">
        {filtered.map((s) => {
          const village = DataService.getVillageById(s.villageId);
          const pct = Math.round((s.occupancy / s.capacity) * 100);
          return (
            <button key={s.id} onClick={() => onOpen(s.id)} className="w-full text-left">
              <Card className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                      <Building2 size={18} className="text-red-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{s.name}</p>
                      <p className="text-xs text-gray-400">{village?.name}</p>
                    </div>
                  </div>
                  <StatusPill status={s.status} />
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>Capacity {s.occupancy}/{s.capacity}</span>
                    <span>{pct}% full</span>
                  </div>
                  <ProgressBar value={s.occupancy} max={s.capacity} />
                </div>
                <div className="mt-3 flex items-center justify-between text-red-600 font-bold text-sm">
                  View Details <ChevronRight size={16} />
                </div>
              </Card>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No shelters found for this village.</p>
        )}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 max-w-full px-3.5 py-1.5 rounded-full text-xs font-semibold border ${
        active ? "bg-red-600 border-red-600 text-white" : "bg-white border-gray-200 text-gray-600"
      }`}
    >
      {label}
    </button>
  );
}

function StatusPill({ status }) {
  const isAvailable = status === "Available";
  return (
    <span className={`text-[11px] font-bold px-2 py-1 rounded-full shrink-0 ${isAvailable ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
      {status}
    </span>
  );
}

function ShelterDetailScreen({ shelter, onBack, onNavigate }) {
  const village = DataService.getVillageById(shelter.villageId);
  const pct = Math.round((shelter.occupancy / shelter.capacity) * 100);
  return (
    <div>
      <TopHeader title="Shelter Details" onBack={onBack} />
      <div className="px-3 min-[360px]:px-4 py-4 min-w-0 w-full max-w-full">
        <div className="rounded-2xl bg-gray-100 border border-gray-200 h-32 flex items-center justify-center mb-4">
          <Navigation size={22} className="text-gray-400" />
        </div>

        <h1 className="text-lg min-[360px]:text-xl font-extrabold text-gray-900 break-words">{shelter.name}</h1>
        <p className="text-sm text-gray-500 flex items-start gap-1 mt-1 min-w-0"><MapPin size={14} className="shrink-0 mt-0.5" /><span className="break-words min-w-0">{village?.name} &bull; {shelter.address}</span></p>

        <Card className="p-4 mt-4">
          <div className="flex items-center justify-between gap-2 mb-1 min-w-0">
            <p className="text-xs font-bold tracking-wide text-gray-400 uppercase">Occupancy</p>
            <StatusPill status={shelter.status} />
          </div>
          <p className="text-2xl font-extrabold text-gray-900 mb-2 break-words">{shelter.occupancy} <span className="text-sm font-medium text-gray-400">/ {shelter.capacity} people</span></p>
          <ProgressBar value={shelter.occupancy} max={shelter.capacity} />
          <p className="text-xs text-gray-400 mt-1.5">{pct}% of capacity in use</p>
        </Card>

        <Card className="p-4 mt-3">
          <div className="flex items-center gap-2 mb-1"><Users size={14} className="text-gray-400" /><p className="text-xs font-bold tracking-wide text-gray-400 uppercase">Serves Village</p></div>
          <p className="text-sm text-gray-700 font-medium">{village?.name} &bull; Population {village?.population?.toLocaleString()}</p>
        </Card>

        <div className="mt-5 space-y-2.5">
          <PrimaryButton icon={Navigation}>Get Directions</PrimaryButton>
          <SecondaryButton icon={PhoneCall}>Call {shelter.contactPhone}</SecondaryButton>
          <SecondaryButton icon={ArrowLeft} onClick={onBack}>Back to Shelters</SecondaryButton>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   SCREEN: EMERGENCY CONTACTS (reached from Home quick action)
   ============================================================================ */

function ContactsScreen({ village }) {
  const contacts = [
    { label: "National Emergency Number", value: "112", icon: Siren },
    { label: "Local Disaster Control Room", value: "+912012349000", icon: PhoneCall },
    { label: `${village?.name} Village Office`, value: "+912012349010", icon: Building2 },
    { label: "Ambulance", value: "108", icon: Phone },
  ];
  return (
    <div>
      <TopHeader title="Emergency Contacts" />
      <div className="px-3 min-[360px]:px-4 py-4 space-y-2.5 min-w-0 w-full max-w-full">
        {contacts.map((c) => {
          const Icon = c.icon;
          return (
            <a key={c.label} href={`tel:${c.value.replace(/\s/g, "")}`} className="block">
              <Card className="p-4 flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <Icon size={18} className="text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 break-words">{c.label}</p>
                <p className="text-sm text-gray-500 break-words">{c.value}</p>
              </div>
              </Card>
            </a>
          );
        })}
        <p className="text-xs text-gray-400 text-center pt-2">Tap an authority to call directly.</p>
      </div>
    </div>
  );
}

/* ============================================================================
   SCREEN: PROFILE
   ============================================================================ */

function ProfileScreen({ user, village, onBack, onLogout }) {
  const [settings, setSettings] = useState({
    emergency: user.notifyEmergency,
    critical: user.notifyCritical,
    shelter: user.notifyShelter,
  });

  const toggle = (key) => setSettings((s) => ({ ...s, [key]: !s[key] }));

  return (
    <div>
      <TopHeader title="Profile" onBack={onBack} />
      <div className="px-3 min-[360px]:px-4 py-4 min-w-0 w-full max-w-full">
        <Card className="p-4 flex items-center gap-3 min-w-0">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <User size={26} className="text-red-600" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 break-words">{user.name}</p>
            <p className="text-xs text-gray-400 break-all">User ID: {user.id}</p>
          </div>
        </Card>

        <Card className="p-4 mt-3 space-y-3">
          <InfoRow icon={MapPin} label="Village" value={village?.name} />
          <InfoRow icon={Phone} label="Contact" value={user.phone} />
          <InfoRow icon={Users} label="Household Size" value={String(user.householdSize)} />
          <InfoRow icon={Bell} label="Emergency Notifications" value="Enabled" />
        </Card>

        <p className="text-xs font-bold tracking-wide text-gray-400 uppercase mt-5 mb-2">Notification Settings</p>
        <Card className="divide-y divide-gray-100">
          <ToggleRow label="Emergency Alerts" desc="Alerts affecting your village" checked={settings.emergency} onChange={() => toggle("emergency")} />
          <ToggleRow label="Critical Alerts" desc="Life-threatening events only" checked={settings.critical} onChange={() => toggle("critical")} />
          <ToggleRow label="Shelter Updates" desc="Capacity and status changes" checked={settings.shelter} onChange={() => toggle("shelter")} />
        </Card>

        <div className="mt-5">
          <SecondaryButton icon={ArrowLeft} onClick={onLogout} className="text-red-700 border-red-200">Sign Out</SecondaryButton>
        </div>
        <p className="text-xs text-gray-400 text-center mt-4">Account authentication is handled by Firebase. Profile data is stored in Firestore.</p>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 min-w-0">
      <Icon size={16} className="text-gray-400 shrink-0 mt-0.5" />
      <p className="text-sm text-gray-500 flex-1 min-w-0">{label}</p>
      <p className="text-sm font-semibold text-gray-900 min-w-0 text-right break-words">{value}</p>
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }) {
  return (
    <div className="p-4 flex items-center justify-between gap-3 min-w-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 break-words">{label}</p>
        <p className="text-xs text-gray-400 break-words">{desc}</p>
      </div>
      <button
        onClick={onChange}
        className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${checked ? "bg-red-600" : "bg-gray-200"}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

/* ============================================================================
   SOS MODAL
   ============================================================================ */

function SOSModal({ stage, onCancel, onSend, onClose }) {
  return (
    <div className="absolute inset-0 z-50 bg-black/50 flex items-end">
      <div className="w-full max-w-full bg-white rounded-t-3xl p-4 min-[360px]:p-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] min-w-0">
        {stage === "confirm" && (
          <>
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" />
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <Siren size={28} className="text-red-600" />
            </div>
            <h2 className="text-lg font-extrabold text-gray-900 text-center">Send Emergency SOS?</h2>
            <p className="text-sm text-gray-500 text-center mt-2 leading-relaxed">
              Your emergency location and user information will be sent to the response system.
            </p>
            <div className="mt-5 space-y-2.5">
              <PrimaryButton icon={Siren} onClick={onSend}>Send SOS</PrimaryButton>
              <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
            </div>
          </>
        )}
        {stage === "sent" && (
          <>
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" />
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={28} className="text-green-600" />
            </div>
            <h2 className="text-lg font-extrabold text-gray-900 text-center">Emergency SOS Sent</h2>
            <p className="text-sm text-gray-500 text-center mt-2 leading-relaxed">
              This prototype has simulated sending your SOS. In production this calls the live response backend.
            </p>
            <div className="mt-5">
              <PrimaryButton onClick={onClose}>Done</PrimaryButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   DEMO MODE PANEL
   ============================================================================ */

function DemoModePanel({ open, onToggle, currentPreset, onTrigger }) {
  const options = [
    { key: "NONE", label: "No Alert" },
    { key: "FLOOD_WARNING", label: "Flood Warning" },
    { key: "DAM_BREAK_CRITICAL", label: "Dam Break — Critical" },
    { key: "EVACUATION_ALERT", label: "Evacuation Alert" },
  ];
  return (
    <>
      <button
        onClick={onToggle}
        className="demo-fab bg-gray-900 text-white text-xs font-bold px-3 py-2 rounded-full shadow-lg flex items-center gap-1.5"
      >
        <Wrench size={13} /> Demo
      </button>
      {open && (
        <div className="absolute inset-0 z-50 bg-black/40 flex items-end" onClick={onToggle}>
          <div className="w-full bg-white rounded-t-3xl p-4 min-[360px]:p-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] min-w-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <p className="font-extrabold text-gray-900 flex items-center gap-2"><Wrench size={16} />Demo Mode</p>
              <button onClick={onToggle}><X size={20} className="text-gray-400" /></button>
            </div>
            <p className="text-xs text-gray-400 mb-4">For demonstration only — simulates backend alert events. Not part of the real emergency system.</p>
            <div className="space-y-2">
              {options.map((o) => (
                <button
                  key={o.key}
                  onClick={() => onTrigger(o.key)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold ${
                    currentPreset === o.key ? "bg-red-50 border-red-300 text-red-700" : "bg-white border-gray-200 text-gray-700"
                  }`}
                >
                  {o.label}
                  {currentPreset === o.key && <CheckCircle2 size={16} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ============================================================================
   REAL AUTHENTICATION
   ----------------------------------------------------------------------------
   Firebase Authentication manages the account/session. Firestore stores the
   small app profile (name, villageId and notification preferences).
   ============================================================================ */

function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [villageId, setVillageId] = useState("V1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        if (!name.trim()) throw new Error("Please enter your name.");
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await setDoc(doc(db, "users", credential.user.uid), {
          name: name.trim(),
          email: email.trim(),
          villageId,
          notifyEmergency: true,
          notifyCritical: true,
          notifyShelter: true,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      const messages = {
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/email-already-in-use": "An account with this email already exists.",
        "auth/weak-password": "Password should be at least 6 characters.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/network-request-failed": "Network error. Please check your connection.",
      };
      setError(messages[err.code] || err.message || "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-stage font-sans">
      <div className="app-frame">
        <div className="h-2 bg-red-600 shrink-0" />
        <div className="flex-1 flex flex-col justify-center px-4 min-[360px]:px-6 py-8 min-[390px]:py-10 min-w-0 w-full max-w-full overflow-y-auto">
          <div className="w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center mx-auto mb-4 shadow-lg shrink-0">
            <ShieldAlert size={32} className="text-white" />
          </div>
          <h1 className="text-xl min-[360px]:text-2xl font-extrabold text-gray-900 text-center">RakshaNet</h1>
          <p className="text-sm text-gray-500 text-center mt-1">Disaster Alert &amp; Response</p>

          <div className="mt-8">
            <h2 className="text-xl font-extrabold text-gray-900">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
            <p className="text-sm text-gray-500 mt-1">{mode === "login" ? "Sign in to receive alerts for your area." : "Create a real account for this prototype."}</p>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-3">
            {mode === "register" && (
              <>
                <label className="block">
                  <span className="text-xs font-bold text-gray-500">FULL NAME</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-3.5 py-3 outline-none focus:ring-2 focus:ring-red-200" placeholder="Your name" required />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-gray-500">VILLAGE</span>
                  <select value={villageId} onChange={(e) => setVillageId(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-3.5 py-3 bg-white outline-none focus:ring-2 focus:ring-red-200">
                    {MOCK_VILLAGES.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </label>
              </>
            )}
            <label className="block">
              <span className="text-xs font-bold text-gray-500">EMAIL</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-3.5 py-3 outline-none focus:ring-2 focus:ring-red-200" placeholder="you@example.com" required />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-gray-500">PASSWORD</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-3.5 py-3 outline-none focus:ring-2 focus:ring-red-200" placeholder="At least 6 characters" minLength={6} required />
            </label>

            {error && <div className="rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm p-3">{error}</div>}

            <button disabled={busy} className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-colors">
              {busy ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} className="mt-5 text-sm text-red-600 font-semibold">
            {mode === "login" ? "New user? Create an account" : "Already have an account? Sign in"}
          </button>

          <p className="text-[11px] text-gray-400 text-center mt-6">Your account is secured by Firebase Authentication.</p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   ROOT APP — screen-stack navigation (no external router dependency)
   ============================================================================ */

export default function DisasterResponseApp() {
  const [authUser, setAuthUser] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [nav, setNav] = useState({ screen: "home", param: null });
  const [sosStage, setSosStage] = useState(null); // null | 'confirm' | 'sent'
  const [demoOpen, setDemoOpen] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setAuthLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (snap.exists()) {
          setProfile({ id: firebaseUser.uid, ...snap.data() });
        } else {
          // Handles accounts created outside this app.
          const fallback = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || "User",
            email: firebaseUser.email || "",
            phone: firebaseUser.phoneNumber || "",
            villageId: "V1",
            householdSize: 1,
            notifyEmergency: true,
            notifyCritical: true,
            notifyShelter: true,
          };
          await setDoc(doc(db, "users", firebaseUser.uid), fallback, { merge: true });
          setProfile(fallback);
        }
      } catch (err) {
        console.error("Could not load user profile", err);
        setProfile({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || "User",
          email: firebaseUser.email || "",
          villageId: "V1",
          householdSize: 1,
          notifyEmergency: true,
          notifyCritical: true,
          notifyShelter: true,
        });
      } finally {
        setAuthLoading(false);
      }
    });
  }, []);

  if (authLoading) {
    return (
      <div className="app-stage font-sans">
        <div className="app-frame flex items-center justify-center">
          <div className="text-center px-4"><div className="w-12 h-12 rounded-full border-4 border-red-100 border-t-red-600 animate-spin mx-auto" /><p className="mt-4 text-sm text-gray-500">Checking your account...</p></div>
        </div>
      </div>
    );
  }

  if (!authUser) return <AuthScreen />;

  const user = profile || { id: authUser.uid, name: authUser.displayName || "User", email: authUser.email || "", villageId: "V1", householdSize: 1, notifyEmergency: true, notifyCritical: true, notifyShelter: true };
  const village = DataService.getVillageById(user.villageId) || MOCK_VILLAGES[0];
  const alertService = useAlertService(user.villageId, user.id);
  const activeAlert = alertService.getActiveAlert();
  const history = alertService.getAlertHistory();

  const navigate = (screen, param = null) => setNav({ screen, param });
  const goHome = () => setNav({ screen: "home", param: null });

  const openAlert = (alert) => navigate("alertDetail", alert);
  const openGuideDetail = (guideId) => navigate("guideDetail", guideId);
  const openShelterDetail = (shelterId) => navigate("shelterDetail", shelterId);

  let content;
  switch (nav.screen) {
    case "home":
      content = (
        <HomeScreen
          user={user} village={village} activeAlert={activeAlert}
          onNavigate={navigate} onOpenAlert={openAlert}
          onOpenSOS={() => setSosStage("confirm")}
        />
      );
      break;
    case "alerts":
      content = <AlertsScreen activeAlert={activeAlert} history={history} onOpenAlert={openAlert} />;
      break;
    case "alertDetail":
      content = (
        <AlertDetailScreen
          alert={nav.param} onBack={() => navigate(activeAlert && nav.param?.id === activeAlert.id ? "home" : "alerts")}
          onNavigate={navigate} onOpenSOS={() => setSosStage("confirm")}
        />
      );
      break;
    case "guides":
      content = <GuidesScreen onOpen={openGuideDetail} />;
      break;
    case "guideDetail":
      content = <GuideDetailScreen guide={GUIDES.find((g) => g.id === nav.param) || GUIDES[0]} onBack={() => navigate("guides")} />;
      break;
    case "shelters":
      content = <SheltersScreen villages={DataService.getAllVillages()} shelters={DataService.getAllShelters()} onOpen={openShelterDetail} />;
      break;
    case "shelterDetail":
      content = <ShelterDetailScreen shelter={DataService.getShelterById(nav.param)} onBack={() => navigate("shelters")} onNavigate={navigate} />;
      break;
    case "contacts":
      content = <ContactsScreen village={village} />;
      break;
    case "profile":
      content = <ProfileScreen user={user} village={village} onBack={goHome} onLogout={() => signOut(auth)} />;
      break;
    default:
      content = null;
  }

  const activeNavKey = ["home"].includes(nav.screen)
    ? "home"
    : ["alerts", "alertDetail"].includes(nav.screen)
    ? "alerts"
    : ["guides", "guideDetail"].includes(nav.screen)
    ? "guides"
    : ["shelters", "shelterDetail"].includes(nav.screen)
    ? "shelters"
    : null;

  const showBottomNav = nav.screen !== "profile";

  return (
    <div className="app-stage font-sans">
      <div className="app-frame">
        <div className="app-scroll" style={{ paddingBottom: showBottomNav ? "calc(84px + env(safe-area-inset-bottom, 0px))" : 16 }}>
          {content}
        </div>

        {showBottomNav && (
          <BottomNav
            active={activeNavKey}
            onNavigate={(key) => navigate(key)}
          />
        )}

        {sosStage && (
          <SOSModal
            stage={sosStage}
            onCancel={() => setSosStage(null)}
            onSend={() => setSosStage("sent")}
            onClose={() => setSosStage(null)}
          />
        )}

        <DemoModePanel
          open={demoOpen}
          onToggle={() => setDemoOpen((o) => !o)}
          currentPreset={alertService.currentDemoPreset}
          onTrigger={(key) => {
            alertService.triggerDemo(key);
            setDemoOpen(false);
            if (key !== "NONE") navigate("home");
          }}
        />
      </div>
    </div>
  );
}
