/* ─────────────────────────────────────────────────────────────────────────────
   Hogan Healthcare OS: the shared demonstration dataset.

   EVERYTHING in this file is fictional demonstration data built for a sales
   demo. Accounts, products, identifiers, quantities and financial figures are
   invented. They are not Hogan Healthcare's real customers or performance.
   Product codes (HH-xx-nnn), GTINs, lots and serials are demo identifiers, not
   valid manufacturer codes.

   Screens must read from here (or from store.ts, which seeds itself from
   here) rather than hard-coding numbers, so every view tells the same story.
   ───────────────────────────────────────────────────────────────────────────── */

import { TODAY, addDays } from "./fmt";

export const DEMO = {
  today: TODAY,
  todayLabel: "Thursday 19 November 2026",
  weekStart: "2026-11-16",
  nextWeekStart: "2026-11-23",
  month: "November 2026",
  mtdLabel: "1 to 19 Nov 2026",
  disclaimer: "Fictional demonstration data. Not actual Hogan Healthcare performance.",
  short: "Demo data",
};

export const COMPANY = {
  name: "Hogan Healthcare Ltd",
  app: "Hogan Healthcare OS",
  poweredBy: "Powered by Pulse",
  founded: 2002,
  address: "The Highline, Bakers Point, Pottery Road, Dún Laoghaire, Dublin, A96 KW29",
  website: "hoganhealthcare.com",
  rentalsSite: "nice1.ie",
  md: "Graham Hogan",
};

/* ── People ─────────────────────────────────────────────────────────────── */

export type StaffId = "GH" | "JC" | "AC" | "MD" | "SO" | "RW" | "CB" | "ET";
export type Staff = {
  id: StaffId; name: string; first: string; role: string; dept: string;
  base: "Field" | "Office"; color: string; territory?: string; fictional?: boolean; seller?: boolean;
};

export const STAFF: Staff[] = [
  { id: "GH", name: "Graham Hogan", first: "Graham", role: "Managing Director", dept: "Management", base: "Field", color: "#4A9DA5" },
  { id: "JC", name: "John Culkin", first: "John", role: "Operations Director", dept: "Operations", base: "Field", color: "#9FC3D9" },
  { id: "AC", name: "Aileen Cahalane", first: "Aileen", role: "Sales Director", dept: "Sales", base: "Field", color: "#8FC7A4", seller: true, territory: "Key accounts · Dublin & Leinster" },
  { id: "MD", name: "Margaret Duff", first: "Margaret", role: "Office Manager", dept: "Finance & admin", base: "Office", color: "#D9C27A" },
  { id: "SO", name: "Sharon O'Mongain", first: "Sharon", role: "Sales Administration", dept: "Orders", base: "Office", color: "#E0A98C" },
  { id: "RW", name: "Rory Whelan", first: "Rory", role: "Field Sales Representative", dept: "Sales", base: "Field", color: "#B9A9D9", seller: true, fictional: true, territory: "Orthopaedics & trauma · South Dublin & Leinster" },
  { id: "CB", name: "Clodagh Byrne", first: "Clodagh", role: "Field Sales Representative", dept: "Sales", base: "Field", color: "#E6B7C8", seller: true, fictional: true, territory: "Sports medicine & Arthrosamid · North Dublin & North East" },
  { id: "ET", name: "Eoin Tierney", first: "Eoin", role: "Field Sales Representative", dept: "Sales", base: "Field", color: "#A9CFE8", seller: true, fictional: true, territory: "Power tools & arthroscopy · West & Munster" },
];
export const SELLERS = STAFF.filter(s => s.seller).map(s => s.id);
export const staffById = (id: string) => STAFF.find(s => s.id === id);
export const initials = (id: string) => id;

/* ── Locations and accounts ─────────────────────────────────────────────── */

export type LocId = "DLM" | "HAR" | "SDS" | "LIF" | "EAS" | "ATL" | "BLK" | "RIV" | "WES";
export type Location = {
  id: LocId; name: string; short: string; kind: "central" | "consignment"; accountId?: string;
  area: string; agreement?: string; lastReplenished?: string; target: number;
};

export const LOCATIONS: Location[] = [
  { id: "DLM", name: "Dún Laoghaire main stockroom", short: "Main stockroom", kind: "central", area: "The Highline, Dún Laoghaire", target: 820 },
  { id: "HAR", name: "Harbour Orthopaedic Clinic", short: "Harbour", kind: "consignment", accountId: "A-HAR", area: "Dublin Docklands", agreement: "CA-2023-04", lastReplenished: "2026-10-02", target: 82 },
  { id: "SDS", name: "South Dublin Surgical Centre", short: "South Dublin", kind: "consignment", accountId: "A-SDS", area: "Dublin 18", agreement: "CA-2022-11", lastReplenished: "2026-11-06", target: 76 },
  { id: "LIF", name: "Liffey Surgical Clinic", short: "Liffey", kind: "consignment", accountId: "A-LIF", area: "Dublin 8", agreement: "CA-2024-02", lastReplenished: "2026-10-28", target: 64 },
  { id: "EAS", name: "Eastgate Orthopaedics", short: "Eastgate", kind: "consignment", accountId: "A-EAS", area: "Co. Wicklow", agreement: "CA-2021-07", lastReplenished: "2026-11-11", target: 56 },
  { id: "ATL", name: "Atlantic Sports Surgery", short: "Atlantic", kind: "consignment", accountId: "A-ATL", area: "Galway", agreement: "CA-2024-09", lastReplenished: "2026-10-21", target: 48 },
  { id: "BLK", name: "Blackrock Orthopaedic Practice", short: "Blackrock", kind: "consignment", accountId: "A-BLK", area: "Co. Dublin", agreement: "CA-2022-05", lastReplenished: "2026-10-14", target: 42 },
  { id: "RIV", name: "Riverpark Day Surgery", short: "Riverpark", kind: "consignment", accountId: "A-RIV", area: "Kilkenny", agreement: "CA-2025-01", lastReplenished: "2026-11-04", target: 28 },
  { id: "WES", name: "Westside Specialist Centre", short: "Westside", kind: "consignment", accountId: "A-WES", area: "Limerick", agreement: "CA-2025-06", lastReplenished: "2026-09-30", target: 24 },
];
export const SITES = LOCATIONS.filter(l => l.kind === "consignment");
export const locById = (id: string) => LOCATIONS.find(l => l.id === id);

export type Account = {
  id: string; name: string; type: string; region: string; owner: StaffId; consignment: boolean; locId?: LocId;
  lastVisit: string; lastOrder: string; mtdRevenue: number; mtdGP: number; ytdRevenue: number;
  since: number; terms: string; contacts: { name: string; role: string }[]; leadSource: string;
};

const acc = (id: string, name: string, type: string, region: string, owner: StaffId, locId: LocId | undefined,
  lastVisit: string, lastOrder: string, mtdRevenue: number, gpPct: number, ytd: number, since: number,
  contacts: [string, string][], leadSource: string): Account => ({
  id, name, type, region, owner, consignment: !!locId, locId, lastVisit, lastOrder, mtdRevenue,
  mtdGP: Math.round(mtdRevenue * gpPct / 100), ytdRevenue: ytd, since, terms: "30 days",
  contacts: contacts.map(c => ({ name: c[0], role: c[1] })), leadSource,
});

/* Fictional demonstration accounts. None is a verified Hogan customer. */
export const ACCOUNTS: Account[] = [
  acc("A-HAR", "Harbour Orthopaedic Clinic", "Private clinic", "Dublin", "AC", "HAR", "2026-11-18", "2026-11-17", 22400, 39.2, 268400, 2016, [["Orla Keane", "Theatre manager"], ["Mr D. Furlong", "Consultant orthopaedic surgeon"]], "Existing account"),
  acc("A-SDS", "South Dublin Surgical Centre", "Day surgery centre", "Dublin", "RW", "SDS", "2026-11-17", "2026-11-18", 20600, 38.1, 241900, 2014, [["Ciara Doyle", "Materials manager"], ["Ms A. Brady", "Consultant surgeon"]], "Existing account"),
  acc("A-LIF", "Liffey Surgical Clinic", "Private clinic", "Dublin", "CB", "LIF", "2026-11-13", "2026-11-14", 16900, 41.0, 198300, 2019, [["Niall Kearney", "Clinical nurse manager"]], "Surgeon referral"),
  acc("A-EAS", "Eastgate Orthopaedics", "Orthopaedic practice", "Wicklow", "RW", "EAS", "2026-11-19", "2026-11-12", 14200, 37.5, 171200, 2015, [["Sinéad Moran", "Practice manager"]], "Existing account"),
  acc("A-ATL", "Atlantic Sports Surgery", "Sports surgery clinic", "Galway", "CB", "ATL", "2026-11-18", "2026-11-13", 12600, 40.6, 139800, 2020, [["Pádraig Lynch", "Theatre stores"]], "Conference / trade event"),
  acc("A-BLK", "Blackrock Orthopaedic Practice", "Orthopaedic practice", "Dublin", "RW", "BLK", "2026-11-17", "2026-11-05", 10300, 36.9, 122700, 2017, [["Gemma Rafferty", "Practice manager"]], "Existing account"),
  acc("A-RIV", "Riverpark Day Surgery", "Day surgery centre", "Kilkenny", "ET", "RIV", "2026-11-17", "2026-11-09", 7900, 38.4, 88400, 2025, [["Tomás Kinsella", "Procurement"]], "Supplier referral"),
  acc("A-WES", "Westside Specialist Centre", "Specialist centre", "Limerick", "RW", "WES", "2026-10-21", "2026-11-03", 6100, 37.0, 71900, 2025, [["Aoife Halpin", "Clinical lead"]], "Conference / trade event"),
  acc("A-PIN", "Pinewood Orthopaedics", "Orthopaedic practice", "Kildare", "AC", undefined, "2026-10-31", "2026-09-22", 2900, 38.0, 31600, 2023, [["Mr K. Ruane", "Consultant orthopaedic surgeon"]], "Surgeon referral"),
  acc("A-CED", "Cedarview Private Hospital", "Private hospital", "Cork", "ET", undefined, "2026-11-17", "2026-11-15", 10400, 37.8, 119200, 2018, [["Deirdre Coyle", "Head of procurement"]], "Existing account"),
  acc("A-LAK", "Lakeside Orthopaedic Group", "Orthopaedic group", "Westmeath", "RW", undefined, "2026-11-16", "2026-11-10", 8400, 38.6, 96300, 2019, [["Brian Tully", "Operations manager"]], "Website enquiry"),
  acc("A-KIN", "Kingsbridge Surgical Hospital", "Private hospital", "Dublin", "CB", undefined, "2026-11-18", "2026-11-11", 7300, 39.4, 82100, 2021, [["Róisín Walsh", "Theatre manager"]], "Conference / trade event"),
  acc("A-ARD", "Ardmore Sports Injury Clinic", "Sports injury clinic", "Waterford", "CB", undefined, "2026-11-02", "2026-10-30", 5200, 42.1, 48900, 2022, [["Eamon Dwyer", "Clinic director"]], "Clinical evaluation programme"),
  acc("A-MEA", "Meadowbank Private Hospital", "Private hospital", "Dublin", "AC", undefined, "2026-11-18", "2026-11-16", 6600, 38.9, 77400, 2018, [["Hazel O'Neill", "Procurement lead"]], "Existing account"),
  acc("A-KIL", "Kilmore Day Surgery", "Day surgery centre", "Meath", "ET", undefined, "2026-11-18", "2026-11-12", 3400, 39.0, 36800, 2024, [["Fergal Nolan", "Stores"]], "Supplier referral"),
  acc("A-GLE", "Glenmore Medical Centre", "Medical centre", "Wexford", "CB", undefined, "2026-11-11", "2026-10-27", 1100, 41.0, 9800, 2026, [["Dr M. Cullen", "GP partner"]], "Website enquiry"),
  acc("A-RAT", "Rathview Pain Clinic", "Pain clinic", "Dublin", "CB", undefined, "2026-11-16", "2026-11-04", 1600, 43.0, 14200, 2025, [["Dr L. Grogan", "Clinical director"]], "Surgeon referral"),
  acc("A-SEA", "Seafield Physiotherapy", "Physiotherapy clinic", "Dublin", "AC", undefined, "2026-11-12", "2026-11-02", 1300, 44.0, 10900, 2025, [["Kate Mulligan", "Owner physiotherapist"]], "NICE1 website enquiry"),
  acc("A-DOD", "Dodder Valley Clinic", "Clinic", "Dublin", "AC", undefined, "2026-11-17", "2026-10-29", 1700, 40.0, 15600, 2024, [["Alan Byrne", "Clinic manager"]], "Website enquiry"),
  acc("A-NOR", "Northbay Orthopaedic Clinic", "Orthopaedic clinic", "Louth", "AC", undefined, "2026-11-13", "2026-11-07", 1900, 38.0, 18400, 2024, [["Ms E. Carroll", "Consultant surgeon"]], "Surgeon referral"),
];
export const accountById = (id: string) => ACCOUNTS.find(a => a.id === id);
export const accountForLoc = (loc: string) => ACCOUNTS.find(a => a.locId === loc);

/* ── Suppliers and products ─────────────────────────────────────────────── */

export type SupplierId = "CON" | "HAL" | "VER" | "ART" | "NOR" | "AQU" | "POL" | "CEL" | "BRI" | "NIC";
export type Supplier = {
  id: SupplierId; name: string; tier: "Key global partner" | "Agency"; country: string; categories: string;
  leadDays: number; onTime: number; ytdSpend: number; terms: string; agreement: string; fictional: boolean; note?: string;
};

export const SUPPLIERS: Supplier[] = [
  { id: "CON", name: "CONMED", tier: "Key global partner", country: "United States", categories: "Sports medicine, arthroscopy, power tools", leadDays: 9, onTime: 94, ytdSpend: 412600, terms: "60 days", agreement: "Distribution agreement (demo ref.)", fictional: false, note: "Real supplier name. Order, price and stock figures shown are fictional." },
  { id: "HAL", name: "Halcyon Orthopaedics", tier: "Key global partner", country: "Germany", categories: "Implants & fixation", leadDays: 12, onTime: 91, ytdSpend: 298400, terms: "45 days", agreement: "DA-HAL-2021", fictional: true },
  { id: "VER", name: "Veritas Surgical", tier: "Key global partner", country: "Switzerland", categories: "Joint reconstruction, nailing, instruments", leadDays: 14, onTime: 89, ytdSpend: 186200, terms: "45 days", agreement: "DA-VER-2022", fictional: true },
  { id: "ART", name: "Arthrosamid supply partner", tier: "Agency", country: "Denmark", categories: "Arthrosamid injectable hydrogel", leadDays: 7, onTime: 97, ytdSpend: 104900, terms: "30 days", agreement: "Agency agreement (demo ref.)", fictional: false, note: "Arthrosamid is a real product line. Commercial figures shown are fictional." },
  { id: "NOR", name: "Nordfix Medical", tier: "Agency", country: "Sweden", categories: "Small fragment, foot & ankle", leadDays: 10, onTime: 93, ytdSpend: 88700, terms: "30 days", agreement: "AA-NOR-2023", fictional: true },
  { id: "AQU", name: "Aquila Sports Medicine", tier: "Agency", country: "Netherlands", categories: "Knotless anchors, meniscal repair", leadDays: 8, onTime: 90, ytdSpend: 76300, terms: "30 days", agreement: "AA-AQU-2024", fictional: true },
  { id: "POL", name: "Polaris Surgical Power", tier: "Agency", country: "United Kingdom", categories: "Blades, burrs, saw handpieces", leadDays: 6, onTime: 88, ytdSpend: 61800, terms: "30 days", agreement: "AA-POL-2022", fictional: true },
  { id: "CEL", name: "Celtic Sterile Supplies", tier: "Agency", country: "Ireland", categories: "Drapes, tubing, theatre consumables", leadDays: 3, onTime: 98, ytdSpend: 39600, terms: "30 days", agreement: "AA-CEL-2020", fictional: true },
  { id: "BRI", name: "Brightline Instruments", tier: "Agency", country: "United Kingdom", categories: "Reusable surgical instruments", leadDays: 15, onTime: 86, ytdSpend: 33100, terms: "30 days", agreement: "AA-BRI-2021", fictional: true },
  { id: "NIC", name: "NICE1 system supplier", tier: "Agency", country: "United States", categories: "NICE1 cold-compression rental units", leadDays: 21, onTime: 92, ytdSpend: 18400, terms: "30 days", agreement: "Rental supply (demo ref.)", fictional: false, note: "NICE1 rental business. Figures shown are fictional." },
];
export const supplierById = (id: string) => SUPPLIERS.find(s => s.id === id);

export type CatId = "OR" | "SM" | "AC" | "PT" | "AR" | "IN";
export const CATEGORIES: { id: CatId; name: string; short: string; color: string; finance: string }[] = [
  { id: "OR", name: "Orthopaedic implants & fixation", short: "Implants & fixation", color: "#4A9DA5", finance: "Orthopaedic implants & fixation" },
  { id: "SM", name: "Sports medicine & joint reconstruction", short: "Sports medicine", color: "#7FB8C9", finance: "Sports medicine & joint reconstruction" },
  { id: "AC", name: "Arthroscopy consumables", short: "Arthroscopy", color: "#9FB5D9", finance: "Arthroscopy consumables" },
  { id: "PT", name: "Surgical power tools", short: "Power tools", color: "#D9C27A", finance: "Power tools & instruments" },
  { id: "AR", name: "Arthrosamid", short: "Arthrosamid", color: "#E0A98C", finance: "Arthrosamid" },
  { id: "IN", name: "Surgical instruments", short: "Instruments", color: "#B9A9D9", finance: "Power tools & instruments" },
];
export const catById = (id: string) => CATEGORIES.find(c => c.id === id);

export type Product = {
  sku: string; num: number; cat: CatId; name: string; subtitle?: string; supplier: SupplierId;
  tracking: "lot" | "serial"; sterile: boolean; unitCost: number; unitPrice: number;
  gtin: string; mdrClass: "I" | "Is" | "Ir" | "IIa" | "IIb" | "III"; minCentral: number; docRef: string;
};

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = rng(20261119);
const rint = (lo: number, hi: number) => lo + Math.floor(R() * (hi - lo + 1));
const pick = <T,>(arr: T[]) => arr[Math.floor(R() * arr.length)];
const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

/* GTIN-14 check digit (GS1 mod 10). The company prefix 999 is not a real
   manufacturer: these are structurally valid demo identifiers only. */
function gtin(cat: CatId, num: number): string {
  const catDigit = { OR: "2", SM: "1", AC: "3", PT: "4", AR: "0", IN: "5" }[cat];
  const base = "0999" + "40" + catDigit + String(num).padStart(3, "0") + "000";
  let sum = 0;
  for (let i = 0; i < base.length; i++) sum += Number(base[base.length - 1 - i]) * (i % 2 === 0 ? 3 : 1);
  return base + ((10 - (sum % 10)) % 10);
}

type ProdSeed = [number, string, SupplierId, number?];
const OR_SEED: ProdSeed[] = [
  [201, "Cortical screw 3.5 mm × 20 mm", "HAL"], [202, "Cortical screw 3.5 mm × 30 mm", "HAL"], [203, "Cancellous screw 4.0 mm × 40 mm", "HAL"],
  [204, "Cannulated fixation screw 7.3 mm", "HAL", 145], [205, "Locking plate 3.5 mm, 6-hole", "HAL"], [206, "Locking plate 3.5 mm, 8-hole", "HAL"],
  [207, "Distal radius volar plate, left", "NOR"], [208, "Distal radius volar plate, right", "NOR"], [209, "Proximal humerus plate", "HAL"],
  [210, "Clavicle plate, superior", "NOR"], [211, "One-third tubular plate, 7-hole", "NOR"], [212, "Reconstruction plate 3.5 mm, 10-hole", "HAL"],
  [213, "Headless compression screw 3.0 mm", "NOR"], [214, "Headless compression screw 4.0 mm", "NOR"], [215, "Cannulated screw 4.5 mm × 50 mm", "HAL"],
  [216, "Cannulated screw 6.5 mm × 70 mm", "HAL"], [217, "Intramedullary tibial nail 9 mm", "VER"], [218, "Intramedullary femoral nail 11 mm", "VER"],
  [219, "Proximal femoral nail, short", "VER"], [220, "Locking bolt 5.0 mm × 40 mm", "VER"], [221, "End cap, nail system", "VER"],
  [222, "K-wire 1.6 mm, pack of 10", "NOR"], [223, "K-wire 2.0 mm, pack of 10", "NOR"], [224, "Compression staple 15 mm", "NOR"],
  [225, "Compression staple 20 mm", "NOR"], [226, "Locking screw 3.5 mm × 24 mm", "HAL", 22], [227, "Locking screw 3.5 mm × 32 mm", "HAL"],
  [228, "Calcaneal plate", "NOR"], [229, "Fibula plate, lateral", "NOR"], [230, "Tibial plateau plate", "HAL"],
  [231, "Olecranon plate", "HAL"], [232, "Washer 4.5 mm, pack of 5", "HAL"], [233, "Step staple", "NOR"],
  [234, "Hip compression screw", "VER"], [235, "Side plate 135°, 4-hole", "VER"], [236, "Patella cerclage wire kit", "HAL"],
  [237, "Mini fragment plate 2.4 mm", "NOR"], [238, "Mini fragment screw 2.4 mm × 14 mm", "NOR"], [239, "Foot fusion plate", "NOR"],
  [240, "Syndesmosis fixation kit", "HAL"],
];
const SM_SEED: ProdSeed[] = [
  [111, "Suture anchor 4.5 mm, triple-loaded", "CON"], [112, "Suture anchor 5.5 mm, double-loaded", "CON"], [113, "All-suture anchor 1.8 mm", "CON"],
  [114, "Knotless anchor 3.5 mm", "AQU"], [115, "Interference screw 8 × 25 mm", "CON"], [116, "Interference screw 9 × 25 mm", "CON"],
  [117, "Cortical button, adjustable loop", "CON"], [118, "Suture anchor 2.9 mm, PEEK", "CON", 165], [119, "Meniscal repair device, all-inside", "AQU"],
  [120, "Meniscal repair device, curved", "AQU"], [121, "High-strength suture No. 2, box of 12", "CON"], [122, "Graft preparation kit", "AQU"],
  [123, "ACL tibial fixation sheath", "CON"], [124, "Biocomposite anchor 5.5 mm", "CON"], [125, "Labral repair anchor 2.4 mm", "AQU"],
  [126, "Rotator cuff bridge kit", "CON"], [127, "Biceps tenodesis screw 7 mm", "CON"], [128, "Ankle syndesmosis button", "AQU"],
  [129, "Hip labral anchor 1.4 mm", "AQU"], [130, "Patellar tendon repair kit", "AQU"], [131, "MPFL reconstruction kit", "VER"],
  [132, "Osteochondral graft kit", "VER"], [133, "Shoulder instability kit", "CON"], [134, "Suture passer, single-use", "CON"],
  [135, "Knotless anchor 4.75 mm", "AQU"], [136, "Tendon graft preparation tray", "VER"], [137, "Meniscal root repair kit", "AQU"],
  [138, "Cartilage scaffold 2 × 2 cm", "VER"], [139, "Elbow UCL repair kit", "AQU"], [140, "Knotless suture anchor 2.9 mm", "AQU", 290],
];
const AC_SEED: ProdSeed[] = [
  [301, "Shaver blade 4.0 mm, full radius", "CON"], [302, "Shaver blade 4.5 mm, aggressive", "CON"], [303, "Shaver blade 5.5 mm, bone cutter", "CON"],
  [304, "Ablation probe 90°", "CON"], [305, "Ablation probe 50°", "CON"], [306, "Arthroscopy pump tubing set", "CON"],
  [307, "Inflow/outflow cannula 5.5 mm", "POL"], [308, "Twist-in cannula 8 mm", "POL"], [309, "Arthroscopy drape, knee", "CEL"],
  [310, "Shaver blade 3.5 mm, incisor", "CON", 38], [311, "Arthroscopy drape, shoulder", "CEL"], [312, "Suction tubing, sterile", "CEL"],
  [313, "Burr 4.0 mm, oval", "POL"], [314, "Burr 5.5 mm, round", "POL"], [315, "Hip access kit", "POL"],
  [316, "Fluid management cassette", "CON"], [317, "Camera drape, sterile", "CEL"], [318, "Switching stick set, single-use", "POL"],
  [319, "Wound closure strip pack", "CEL"], [320, "Irrigation set", "CEL"], [321, "Theatre gown pack", "CEL"], [322, "Hip distraction pad kit", "CEL"],
];
const PT_SEED: ProdSeed[] = [
  [401, "Small-bone power handpiece", "CON"], [402, "Large-bone power drill", "CON"], [403, "Sagittal saw handpiece", "POL"],
  [404, "Reciprocating saw handpiece", "POL"], [405, "Sagittal saw blade 25 × 90 mm", "POL"], [406, "Sagittal saw blade 18 × 70 mm", "POL"],
  [407, "Reciprocating blade 50 mm", "POL"], [408, "Drill bit 2.5 mm, quick-connect", "POL"], [409, "Drill bit 3.2 mm, quick-connect", "POL"],
  [410, "Wire driver attachment", "CON"], [411, "Reamer attachment", "CON"], [412, "Jacobs chuck attachment", "CON"],
  [413, "Sterile battery cover kit", "CON"], [414, "Oscillating tip, micro", "POL"], [415, "Lithium battery pack", "CON", 820],
  [416, "Battery charging module", "CON"], [417, "High-speed burr attachment", "POL"], [418, "Pin collet set", "CON"],
];
const AR_SEED: ProdSeed[] = [[1, "Arthrosamid treatment pack", "ART", 310], [2, "Arthrosamid treatment pack with injection set", "ART", 330]];
const IN_SEED: ProdSeed[] = [
  [501, "Depth gauge, small fragment", "BRI"], [502, "Drill guide 3.5 mm", "BRI"], [503, "Reduction forceps, pointed", "BRI"],
  [504, "Bone holding forceps", "BRI"], [505, "Plate bender pair", "BRI"], [506, "Ratchet screwdriver handle", "BRI"],
  [507, "Hex screwdriver shaft 3.5 mm", "BRI"], [508, "Torque-limiting handle 1.5 Nm", "BRI"], [509, "Arthroscopic grasper 3.4 mm", "CON"],
  [510, "Arthroscopic probe", "CON"], [511, "Arthroscopic punch, straight", "CON"], [512, "Arthroscopic hook scissors", "CON"],
  [513, "Knot pusher", "CON"], [514, "Hohmann retractor set", "BRI"], [515, "Periosteal elevator", "BRI"],
  [516, "Bone curette set", "BRI"], [517, "Mallet 450 g", "BRI"], [518, "Tissue protector sleeve", "VER"],
  [519, "Guide wire inserter", "VER"], [520, "Nail extraction set", "VER"],
];

const SERIAL_SKUS = new Set(["HH-PT-401", "HH-PT-402", "HH-PT-403", "HH-PT-404", "HH-PT-415", "HH-PT-416"]);
const COST_RANGE: Record<CatId, [number, number, number]> = {
  OR: [24, 420, 1.62], SM: [95, 380, 1.68], AC: [18, 140, 1.66], PT: [30, 160, 1.6], AR: [310, 330, 1.58], IN: [120, 760, 1.55],
};
const MDR: Record<CatId, Product["mdrClass"]> = { OR: "IIb", SM: "IIb", AC: "IIa", PT: "IIa", AR: "III", IN: "Ir" };

function mkProducts(): Product[] {
  const all: Product[] = [];
  const add = (cat: CatId, seeds: ProdSeed[]) => seeds.forEach(([num, name, supplier, fixedCost]) => {
    const sku = "HH-" + cat + "-" + String(num).padStart(3, "0");
    const [lo, hi, mk] = COST_RANGE[cat];
    let cost = fixedCost ?? round5(lo + R() * (hi - lo));
    if (SERIAL_SKUS.has(sku) && !fixedCost) cost = sku === "HH-PT-416" ? 640 : round5(6400 + R() * 5600);
    const price = sku === "HH-OR-204" ? 235 : sku === "HH-SM-140" ? 465 : sku === "HH-SM-118" ? 270 : sku === "HH-AC-310" ? 64
      : sku === "HH-OR-226" ? 38 : sku === "HH-AR-002" ? 495 : sku === "HH-PT-415" ? 1290 : round5(cost * mk);
    all.push({
      sku, num, cat, name, supplier,
      subtitle: sku === "HH-OR-204" ? "Demonstration orthopaedic fixation product" : undefined,
      tracking: SERIAL_SKUS.has(sku) ? "serial" : "lot",
      sterile: cat === "OR" || cat === "SM" || cat === "AC" || cat === "AR",
      unitCost: cost, unitPrice: price, gtin: gtin(cat, num), mdrClass: SERIAL_SKUS.has(sku) ? "IIa" : MDR[cat],
      minCentral: 0, docRef: "DOC-" + supplier + "-" + cat,
    });
  });
  add("OR", OR_SEED); add("SM", SM_SEED); add("AC", AC_SEED); add("PT", PT_SEED); add("AR", AR_SEED); add("IN", IN_SEED);
  return all;
}

export const PRODUCTS: Product[] = mkProducts();
export const productBySku = (sku: string) => PRODUCTS.find(p => p.sku === sku);

/* ── Stock ──────────────────────────────────────────────────────────────── */

export type StockStatus = "Available" | "Verify" | "Quarantine";
export type StockLine = {
  id: string; sku: string; loc: LocId; lot: string; serial?: string; expiry?: string; received: string;
  qty: number; min?: number; status: StockStatus; note?: string;
};

const lotCode = (sku: string, received: string, k: number) =>
  "L" + received.slice(2, 4) + received.slice(5, 7) + "-" + sku.slice(-3) + String.fromCharCode(65 + (k % 26));
const shelfYears: Record<CatId, number> = { OR: 5, SM: 4, AC: 3, PT: 3, AR: 2, IN: 0 };
const expiryFor = (cat: CatId, received: string) => shelfYears[cat] ? addDays(received, shelfYears[cat] * 365 - rint(0, 60)) : undefined;
/* Random date in [from, to], never later than the day before the demo date. */
const randDate = (from: string, to: string) => {
  const hi = to > "2026-11-18" ? "2026-11-18" : to;
  if (from >= hi) return hi;
  const span = Math.round((Date.parse(hi) - Date.parse(from)) / 86400000);
  return addDays(from, rint(0, span));
};
const clampPast = (d: string) => (d > "2026-11-18" ? "2026-11-18" : d);

/* Explicit lines: the story stock and the deliberate exceptions. */
type Fixed = { sku: string; loc: LocId; qty: number; lot: string; received: string; expiry?: string; min?: number; status?: StockStatus; note?: string };
const FIXED: Fixed[] = [
  // Story A: HH-OR-204. Total 12 = main stockroom 6 + Harbour 4 + South Dublin 2.
  { sku: "HH-OR-204", loc: "DLM", qty: 6, lot: "L2609-204B", received: "2026-09-21", expiry: "2031-08-31" },
  { sku: "HH-OR-204", loc: "HAR", qty: 4, lot: "L2603-204A", received: "2026-03-12", expiry: "2031-02-28", min: 6 },
  { sku: "HH-OR-204", loc: "SDS", qty: 2, lot: "L2603-204A", received: "2026-03-12", expiry: "2031-02-28", min: 2 },
  // Story B: stock behind SO-1047's five lines.
  { sku: "HH-SM-118", loc: "DLM", qty: 9, lot: "L2607-118C", received: "2026-07-14", expiry: "2030-06-30" },
  { sku: "HH-AC-310", loc: "DLM", qty: 14, lot: "L2608-310A", received: "2026-08-19", expiry: "2029-07-31" },
  { sku: "HH-OR-226", loc: "DLM", qty: 16, lot: "L2606-226B", received: "2026-06-03", expiry: "2031-05-31" },
  { sku: "HH-AR-002", loc: "DLM", qty: 5, lot: "L2610-002A", received: "2026-10-08", expiry: "2028-09-30" },
  // Story E: the twelve anchors received on PO-337 (the supplier billed fourteen).
  { sku: "HH-SM-140", loc: "DLM", qty: 12, lot: "AQ-2611-140", received: "2026-11-13", expiry: "2030-10-31" },
  // Other replenishment candidates (site below its par level).
  { sku: "HH-SM-122", loc: "DLM", qty: 6, lot: "L2608-122A", received: "2026-08-05", expiry: "2030-07-31" },
  { sku: "HH-SM-122", loc: "LIF", qty: 2, lot: "L2604-122B", received: "2026-04-16", expiry: "2030-03-31", min: 4 },
  { sku: "HH-AC-305", loc: "DLM", qty: 8, lot: "L2609-305C", received: "2026-09-09", expiry: "2029-08-31" },
  { sku: "HH-AC-305", loc: "ATL", qty: 3, lot: "L2605-305B", received: "2026-05-20", expiry: "2029-04-30", min: 5 },
  { sku: "HH-OR-213", loc: "DLM", qty: 5, lot: "L2607-213A", received: "2026-07-02", expiry: "2031-06-30" },
  { sku: "HH-OR-213", loc: "BLK", qty: 1, lot: "L2602-213C", received: "2026-02-11", expiry: "2031-01-31", min: 3 },
  // Expiry exposure.
  { sku: "HH-AC-305", loc: "RIV", qty: 4, lot: "L2401-305A", received: "2024-01-15", expiry: "2026-12-31", min: 3 },
  { sku: "HH-SM-125", loc: "WES", qty: 3, lot: "L2302-125A", received: "2023-02-20", expiry: "2027-02-10", min: 2 },
  { sku: "HH-AR-001", loc: "DLM", qty: 6, lot: "L2502-001A", received: "2025-02-03", expiry: "2027-01-31" },
  { sku: "HH-AC-314", loc: "DLM", qty: 4, lot: "L2312-314A", received: "2023-12-18", expiry: "2026-12-15", status: "Quarantine", note: "Expires 15 Dec. Held back from picking pending return-to-supplier decision." },
  // Stock requiring verification.
  { sku: "HH-SM-114", loc: "EAS", qty: 5, lot: "L2606-114A", received: "2026-06-24", expiry: "2030-05-31", min: 3, status: "Verify", note: "Cycle count on 14 Nov found 4. One unit unaccounted for: no usage order raised yet." },
  { sku: "HH-OR-238", loc: "WES", qty: 2, lot: "L2605-238A", received: "2026-05-07", expiry: "2031-04-30", min: 1, status: "Verify", note: "Hospital reported 1 unit opened in theatre on 12 Nov. Usage order not received." },
];

const SERIAL_FIXED: { sku: string; serials: string[]; received: string }[] = [
  { sku: "HH-PT-415", serials: ["SN-415-2611", "SN-415-2614", "SN-415-2620"], received: "2026-10-22" },
];

/* Which categories each consignment site keeps. */
const SITE_PROFILE: Record<Exclude<LocId, "DLM">, { cats: CatId[]; n: number }> = {
  HAR: { cats: ["OR", "OR", "SM", "AC"], n: 14 },
  SDS: { cats: ["OR", "AC", "SM"], n: 13 },
  LIF: { cats: ["SM", "SM", "AC"], n: 12 },
  EAS: { cats: ["OR", "OR", "SM"], n: 10 },
  ATL: { cats: ["SM", "AC", "SM"], n: 10 },
  BLK: { cats: ["OR", "OR", "SM"], n: 9 },
  RIV: { cats: ["AC", "SM"], n: 7 },
  WES: { cats: ["OR", "SM"], n: 6 },
};

/** Splits `total` into integer parts proportional to `weights`, each at least `min`. */
function apportion(total: number, weights: number[], min: number): number[] {
  const n = weights.length;
  const base = new Array(n).fill(min);
  let left = total - min * n;
  if (left < 0) throw new Error("apportion: total too small");
  const wsum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map(w => (w / wsum) * left);
  const floors = raw.map(Math.floor);
  let rem = left - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < rem; k++) floors[order[k][1]]++;
  return base.map((b, i) => b + floors[i]);
}

function mkStock(): StockLine[] {
  const lines: StockLine[] = [];
  let id = 0;
  const push = (l: Omit<StockLine, "id">) => lines.push({ id: "SL-" + String(++id).padStart(4, "0"), ...l });

  FIXED.forEach(f => push({ sku: f.sku, loc: f.loc, qty: f.qty, lot: f.lot, received: f.received, expiry: f.expiry, min: f.min, status: f.status || "Available", note: f.note }));
  SERIAL_FIXED.forEach(s => s.serials.forEach(sn => push({ sku: s.sku, loc: "DLM", qty: 1, lot: "L" + s.received.slice(2, 4) + s.received.slice(5, 7) + "-415", serial: sn, received: s.received, status: "Available" })));

  // Consignment sites: fill each to its exact unit target.
  for (const site of SITES) {
    const prof = SITE_PROFILE[site.id as Exclude<LocId, "DLM">];
    const fixed = lines.filter(l => l.loc === site.id);
    const used = new Set(fixed.map(l => l.sku));
    const pool = PRODUCTS.filter(p => prof.cats.includes(p.cat) && p.tracking === "lot" && !used.has(p.sku));
    const chosen: Product[] = [];
    while (chosen.length < prof.n - fixed.length && pool.length) {
      const want = pick(prof.cats);
      const cands = pool.filter(p => p.cat === want);
      const p = cands.length ? pick(cands) : pool[0];
      chosen.push(p);
      pool.splice(pool.indexOf(p), 1);
    }
    const remaining = site.target - fixed.reduce((a, l) => a + l.qty, 0);
    const weights = chosen.map(p => (p.cat === "AC" ? 6 : p.cat === "SM" ? 4 : 3) + R() * 4);
    const qtys = apportion(remaining, weights, 2);
    chosen.forEach((p, i) => {
      const received = randDate("2025-03-01", "2026-11-10");
      const qty = qtys[i];
      push({ sku: p.sku, loc: site.id, qty, lot: lotCode(p.sku, received, i + 3), received, expiry: expiryFor(p.cat, received),
        min: Math.max(1, qty - rint(1, 3)), status: "Available" });
    });
  }

  // Main stockroom: every SKU keeps some central stock, totalling 820 units.
  const centralFixed = lines.filter(l => l.loc === "DLM");
  const centralSkus = new Set(centralFixed.map(l => l.sku));
  const rest = PRODUCTS.filter(p => !centralSkus.has(p.sku));
  const remaining = 820 - centralFixed.reduce((a, l) => a + l.qty, 0);
  const wt = (p: Product) => SERIAL_SKUS.has(p.sku) ? 0.15
    : p.cat === "AC" ? 9 + R() * 8 : p.cat === "OR" ? 3 + R() * 6 : p.cat === "SM" ? 3 + R() * 5
    : p.cat === "PT" ? 4 + R() * 6 : p.cat === "AR" ? 4 : 0.9 + R() * 1.4;
  const qtys = apportion(remaining, rest.map(wt), 1);
  rest.forEach((p, i) => {
    const received = randDate(p.cat === "IN" || p.cat === "PT" ? "2024-06-01" : "2025-05-01", "2026-11-12");
    if (p.tracking === "serial") {
      for (let k = 0; k < qtys[i]; k++) push({ sku: p.sku, loc: "DLM", qty: 1, lot: lotCode(p.sku, received, 0), serial: "SN-" + p.num + "-" + (2400 + rint(10, 980)), received, status: "Available" });
    } else {
      push({ sku: p.sku, loc: "DLM", qty: qtys[i], lot: lotCode(p.sku, received, i), received, expiry: expiryFor(p.cat, received), status: "Available" });
    }
  });
  return lines;
}

export const STOCK: StockLine[] = mkStock();

// Central reorder points: about half of what is normally held, with a few
// deliberately set above today's level so the Purchasing view has real work.
(() => {
  const central: Record<string, number> = {};
  STOCK.filter(l => l.loc === "DLM").forEach(l => { central[l.sku] = (central[l.sku] || 0) + l.qty; });
  const LOW: Record<string, number> = { "HH-OR-204": 6, "HH-SM-111": 0, "HH-PT-405": 0, "HH-AC-306": 0, "HH-OR-217": 0 };
  PRODUCTS.forEach(p => {
    const q = central[p.sku] || 0;
    p.minCentral = p.sku in LOW ? (LOW[p.sku] || q + rint(2, 5)) : Math.max(1, Math.floor(q * 0.45));
  });
})();

/* ── Movements (traceability history) ───────────────────────────────────── */

export type MoveType = "Receipt" | "Transfer" | "Consumption" | "Dispatch" | "Return" | "Count adjustment" | "Pick";
export type Movement = {
  id: string; date: string; time: string; type: MoveType; sku: string; lot: string; serial?: string; qty: number;
  from: string; to: string; ref: string; finRef?: string; by: string; note?: string;
};

function mkMovements(): Movement[] {
  const mv: Movement[] = [];
  let n = 0;
  const add = (m: Omit<Movement, "id">) => mv.push({ id: "MV-" + String(++n).padStart(5, "0"), ...m });
  const tm = () => String(rint(8, 17)).padStart(2, "0") + ":" + String(rint(0, 59)).padStart(2, "0");

  // Story A: the full life of HH-OR-204.
  add({ date: "2026-03-12", time: "10:14", type: "Receipt", sku: "HH-OR-204", lot: "L2603-204A", qty: 8, from: "HAL", to: "DLM", ref: "PO-301", finRef: "BILL-1962", by: "SO", note: "Goods-in check passed. Lot and expiry captured from label." });
  add({ date: "2026-03-18", time: "09:02", type: "Transfer", sku: "HH-OR-204", lot: "L2603-204A", qty: 6, from: "DLM", to: "HAR", ref: "TR-0412", by: "JC", note: "Initial consignment build for Harbour." });
  add({ date: "2026-04-02", time: "11:40", type: "Transfer", sku: "HH-OR-204", lot: "L2603-204A", qty: 2, from: "DLM", to: "SDS", ref: "TR-0418", by: "JC" });
  add({ date: "2026-09-21", time: "14:26", type: "Receipt", sku: "HH-OR-204", lot: "L2609-204B", qty: 6, from: "HAL", to: "DLM", ref: "PO-329", finRef: "BILL-2027", by: "SO", note: "Goods-in check passed." });
  add({ date: "2026-10-09", time: "16:05", type: "Consumption", sku: "HH-OR-204", lot: "L2603-204A", qty: 1, from: "HAR", to: "Used in procedure", ref: "SO-0991", finRef: "INV-6066", by: "AC", note: "Usage reported by hospital. No patient data held in Pulse." });
  add({ date: "2026-11-06", time: "15:31", type: "Consumption", sku: "HH-OR-204", lot: "L2603-204A", qty: 1, from: "HAR", to: "Used in procedure", ref: "SO-0996", finRef: "INV-6141", by: "AC", note: "Usage reported by hospital. Harbour now at 4 against a par level of 6." });

  // Story E: the anchors on PO-337.
  add({ date: "2026-11-13", time: "10:48", type: "Receipt", sku: "HH-SM-140", lot: "AQ-2611-140", qty: 12, from: "AQU", to: "DLM", ref: "PO-337", finRef: "BILL-2034", by: "SO", note: "GRN-0419: 12 units counted and scanned. Supplier invoice later billed 14." });

  // Everything else: a receipt for every lot, a transfer for consigned lots and some usage.
  const done = new Set(["HH-OR-204|L2603-204A", "HH-OR-204|L2609-204B", "HH-SM-140|AQ-2611-140"]);
  for (const l of STOCK) {
    const key = l.sku + "|" + l.lot + "|" + (l.serial || "");
    if (done.has(l.sku + "|" + l.lot) || done.has(key)) continue;
    done.add(key);
    const p = productBySku(l.sku)!;
    const consumed = l.loc === "DLM" || l.serial ? 0 : rint(0, 3);
    const shipped = l.loc === "DLM" && !l.serial ? rint(0, 3) : 0;
    const poNum = 200 + rint(0, 79);
    add({ date: l.received, time: tm(), type: "Receipt", sku: l.sku, lot: l.lot, serial: l.serial, qty: l.qty + consumed + shipped,
      from: p.supplier, to: "DLM", ref: "PO-" + poNum, finRef: "BILL-" + (1650 + poNum), by: pick(["SO", "JC"]) });
    if (l.loc !== "DLM") {
      const tDate = clampPast(addDays(l.received, rint(2, 12)));
      add({ date: tDate, time: tm(), type: "Transfer", sku: l.sku, lot: l.lot, qty: l.qty + consumed, from: "DLM", to: l.loc, ref: "TR-0" + rint(380, 499), by: "JC" });
      for (let c = 0; c < consumed; c++) {
        const cDate = randDate(addDays(tDate, 3), "2026-11-17");
        const so = rint(900, 989);
        add({ date: cDate, time: tm(), type: "Consumption", sku: l.sku, lot: l.lot, qty: 1, from: l.loc, to: "Used in procedure", ref: "SO-0" + so, finRef: "INV-5" + so, by: accountForLoc(l.loc)?.owner || "AC", note: "Usage reported by hospital. No patient data held in Pulse." });
      }
    }
    for (let s = 0; s < shipped; s++) {
      const so = rint(800, 899);
      const sDate = randDate(addDays(l.received, 2), "2026-11-14");
      add({ date: sDate, time: tm(), type: "Dispatch", sku: l.sku, lot: l.lot, qty: 1, from: "DLM", to: pick(ACCOUNTS).name, ref: "SO-0" + so, finRef: "INV-4" + so, by: "SO" });
    }
  }
  return mv.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

export const MOVEMENTS: Movement[] = mkMovements();

/* ── Sales orders ───────────────────────────────────────────────────────── */

export type OrderStatus = "Confirmed" | "Picking" | "Packed" | "Awaiting courier" | "Dispatched" | "Delivered" | "Issue";
export type OrderLine = { id: string; sku: string; qty: number; price: number; lot?: string; serial?: string; scanned: boolean; needs?: "lot" | "serial" };
export type SalesOrder = {
  id: string; account: string; created: string; required: string; status: OrderStatus; owner: StaffId;
  lines: OrderLine[]; courier?: string; tracking?: string; dispatched?: string; delivered?: string;
  issue?: string; poRef: string; note?: string; demo?: boolean;
};

function mkOrders(): SalesOrder[] {
  const orders: SalesOrder[] = [];
  const avail: Record<string, number> = {};
  STOCK.filter(l => l.loc === "DLM" && l.status === "Available").forEach(l => { avail[l.sku] = (avail[l.sku] || 0) + l.qty; });
  // Hold back the story stock.
  ["HH-OR-204", "HH-SM-118", "HH-AC-310", "HH-OR-226", "HH-AR-002", "HH-PT-415", "HH-SM-140", "HH-SM-122", "HH-AC-305", "HH-OR-213"].forEach(s => { avail[s] = 0; });
  const lotOf = (sku: string) => STOCK.find(l => l.sku === sku && l.loc === "DLM");
  const plan: OrderStatus[] = [
    ...Array(13).fill("Delivered"), ...Array(9).fill("Dispatched"), ...Array(2).fill("Issue"), ...Array(4).fill("Awaiting courier"),
    ...Array(5).fill("Packed"), ...Array(5).fill("Picking"), ...Array(8).fill("Confirmed"),
  ];
  const accWeights = ACCOUNTS.map(a => [a, a.consignment ? 3 : 1] as const);
  const pickAcc = () => {
    const tot = accWeights.reduce((s, [, w]) => s + w, 0);
    let r = R() * tot;
    for (const [a, w] of accWeights) { r -= w; if (r <= 0) return a; }
    return ACCOUNTS[0];
  };
  /* Order dates follow the order numbers and never pass the demo date:
     deliveries early in the month (the last few confirmed this week), recent
     dispatches still awaiting proof of delivery, and today's work on top. */
  const seen: Record<string, number> = {};
  const createdFor = (status: OrderStatus): string => {
    const k = (seen[status] = (seen[status] ?? -1) + 1);
    const base: Record<string, [string, number]> = {
      Delivered: ["2026-11-02", 1], Dispatched: ["2026-11-12", 0.7], Issue: ["2026-11-16", 0], "Awaiting courier": ["2026-11-17", 0.5],
      Packed: ["2026-11-17", 0.5], Picking: ["2026-11-18", 0], Confirmed: ["2026-11-18", 0.25],
    };
    const [d, step] = base[status];
    const c = addDays(d, Math.floor(k * step));
    return c > TODAY ? TODAY : c;
  };
  plan.forEach((status, i) => {
    const num = 1001 + i;
    const created = createdFor(status);
    const account = num === 1017 ? ACCOUNTS[0] : pickAcc();
    const nLines = rint(1, 4);
    const lines: OrderLine[] = [];
    const cands = PRODUCTS.filter(p => (avail[p.sku] || 0) >= 4 && p.tracking === "lot");
    for (let k = 0; k < nLines && cands.length; k++) {
      const p = pick(cands);
      cands.splice(cands.indexOf(p), 1);
      const q = Math.max(1, Math.min(rint(1, 6), Math.floor((avail[p.sku] || 0) / 3)));
      if (status !== "Delivered" && status !== "Dispatched") avail[p.sku] -= q;
      const sl = lotOf(p.sku);
      lines.push({ id: "L" + (k + 1), sku: p.sku, qty: q, price: p.unitPrice, lot: sl?.lot, scanned: status !== "Confirmed" });
    }
    if (status === "Picking") {
      // Every order still in picking has at least one line left to scan.
      const done = lines.length <= 1 ? 0 : rint(1, lines.length - 1);
      lines.forEach((l, k) => { l.scanned = k < done; });
    }
    const dispatched = status === "Delivered" || status === "Dispatched" ? (addDays(created, 1) > TODAY ? TODAY : addDays(created, 1)) : undefined;
    orders.push({
      id: "SO-" + num, account: account.id, created, required: addDays(created, rint(2, 5)), status,
      owner: R() > 0.15 ? "SO" : "MD", lines,
      courier: dispatched || status === "Awaiting courier" ? pick(["Overnight courier", "Hogan van run", "Same-day courier"]) : undefined,
      tracking: dispatched ? "DEMO-" + (48210 + num) : undefined, dispatched,
      delivered: status === "Delivered" ? addDays(dispatched!, 1) : undefined,
      issue: status === "Issue" ? (num === 1023 ? "Hospital purchase order number not received. Order on hold until the PO arrives." : "Short pick: one line is below the quantity ordered. Partial dispatch or wait for PO-338.") : undefined,
      poRef: num === 1023 ? "Awaiting hospital PO" : "HPO-" + (77100 + num * 3),
    });
  });
  // Story A history: Harbour's usage orders for HH-OR-204 (consumed from consignment stock).
  orders.unshift(
    { id: "SO-0991", account: "A-HAR", created: "2026-10-09", required: "2026-10-09", status: "Delivered", owner: "SO", poRef: "HPO-79114", delivered: "2026-10-09",
      note: "Usage order: one unit used from Harbour's consignment stock and invoiced.", lines: [{ id: "L1", sku: "HH-OR-204", qty: 1, price: 235, lot: "L2603-204A", scanned: true }] },
    { id: "SO-0996", account: "A-HAR", created: "2026-11-06", required: "2026-11-06", status: "Delivered", owner: "SO", poRef: "HPO-80177", delivered: "2026-11-06",
      note: "Usage order: one unit used from Harbour's consignment stock and invoiced.", lines: [{ id: "L1", sku: "HH-OR-204", qty: 1, price: 235, lot: "L2603-204A", scanned: true }] },
  );
  // Story B: SO-1047. Five lines, three scanned, two waiting on lot/serial validation.
  orders.push({
    id: "SO-1047", account: "A-SDS", created: "2026-11-18", required: "2026-11-19", status: "Picking", owner: "SO",
    poRef: "HPO-80241", courier: "Overnight courier", note: "Dispatch expected today. Two items still need scanning.",
    lines: [
      { id: "L1", sku: "HH-SM-118", qty: 4, price: 270, lot: "L2607-118C", scanned: true },
      { id: "L2", sku: "HH-AC-310", qty: 6, price: 64, lot: "L2608-310A", scanned: true },
      { id: "L3", sku: "HH-OR-226", qty: 10, price: 38, lot: "L2606-226B", scanned: true },
      { id: "L4", sku: "HH-AR-002", qty: 2, price: 495, scanned: false, needs: "lot" },
      { id: "L5", sku: "HH-PT-415", qty: 1, price: 1290, scanned: false, needs: "serial" },
    ],
  });
  return orders;
}

export const ORDERS: SalesOrder[] = mkOrders();
export const orderValue = (o: SalesOrder) => o.lines.reduce((s, l) => s + l.qty * l.price, 0);
export const OPEN_STATUSES: OrderStatus[] = ["Confirmed", "Picking", "Packed", "Awaiting courier", "Dispatched", "Issue"];

/* ── Transfers ──────────────────────────────────────────────────────────── */

export type TransferStatus = "Proposed" | "Awaiting approval" | "Approved" | "Completed" | "Rejected";
export type Transfer = {
  id: string; sku: string; qty: number; lot: string; from: LocId; to: LocId; status: TransferStatus;
  proposedBy: string; approver: StaffId; created: string; completed?: string; reason: string;
};
export const TRANSFERS: Transfer[] = [
  { id: "TR-0412", sku: "HH-OR-204", qty: 6, lot: "L2603-204A", from: "DLM", to: "HAR", status: "Completed", proposedBy: "JC", approver: "JC", created: "2026-03-18", completed: "2026-03-18", reason: "Initial consignment build for Harbour" },
  { id: "TR-0418", sku: "HH-OR-204", qty: 2, lot: "L2603-204A", from: "DLM", to: "SDS", status: "Completed", proposedBy: "JC", approver: "JC", created: "2026-04-02", completed: "2026-04-02", reason: "Consignment top-up" },
  { id: "TR-0503", sku: "HH-AC-301", qty: 6, lot: "", from: "DLM", to: "LIF", status: "Completed", proposedBy: "agent:stock", approver: "JC", created: "2026-11-12", completed: "2026-11-13", reason: "Par level top-up" },
  { id: "TR-0505", sku: "HH-OR-205", qty: 2, lot: "", from: "DLM", to: "EAS", status: "Completed", proposedBy: "JC", approver: "JC", created: "2026-11-10", completed: "2026-11-11", reason: "Surgeon preference change" },
];

/* ── Sales: opportunities, activities, quotes, requests ─────────────────── */

export const STAGES = ["Lead", "Qualified", "Product Discussion", "Clinical Evaluation", "Quotation", "Negotiation"] as const;
export type Stage = typeof STAGES[number] | "Won" | "Lost";
export type Opportunity = {
  id: string; account: string; title: string; value: number; stage: Stage; owner: StaffId;
  lastActivity: string; nextAction: string; nextDue: string; interest: string; source: string; probability: number; created: string;
};
const opp = (id: string, account: string, title: string, value: number, stage: Stage, owner: StaffId, last: string, nextAction: string, nextDue: string, interest: string, source: string, created: string): Opportunity => ({
  id, account, title, value, stage, owner, lastActivity: last, nextAction, nextDue, interest, source, created,
  probability: { Lead: 10, Qualified: 20, "Product Discussion": 35, "Clinical Evaluation": 50, Quotation: 65, Negotiation: 80, Won: 100, Lost: 0 }[stage],
});

/* 26 open opportunities = €186,500. Seven follow-ups are overdue. */
export const OPPORTUNITIES: Opportunity[] = [
  opp("OPP-301", "A-PIN", "Knotless anchor system evaluation", 16800, "Clinical Evaluation", "AC", "2026-10-31", "Collect evaluation feedback from Mr Ruane", "2026-11-12", "Sports medicine anchors", "Surgeon referral", "2026-08-18"),
  opp("OPP-302", "A-CED", "Power tool fleet refresh (2 handpieces)", 19800, "Negotiation", "ET", "2026-11-17", "Send revised service terms", "2026-11-20", "Power tools", "Existing account", "2026-07-09"),
  opp("OPP-303", "A-LAK", "Fixation implants consignment extension", 13400, "Quotation", "RW", "2026-11-13", "Chase quote QT-2207 response", "2026-11-18", "Implants & fixation", "Website enquiry", "2026-09-02"),
  opp("OPP-304", "A-KIN", "Arthrosamid clinic launch", 9400, "Product Discussion", "CB", "2026-11-06", "Book meeting with clinic lead", "2026-11-13", "Arthrosamid", "Conference / trade event", "2026-09-24"),
  opp("OPP-305", "A-ATL", "Shoulder anchor portfolio switch", 7800, "Clinical Evaluation", "CB", "2026-11-16", "Review first cases with theatre team", "2026-11-24", "Sports medicine anchors", "Conference / trade event", "2026-08-30"),
  opp("OPP-306", "A-MEA", "Arthroscopy consumables tender", 11600, "Quotation", "AC", "2026-11-10", "Answer tender clarification questions", "2026-11-17", "Arthroscopy consumables", "Existing account", "2026-09-15"),
  opp("OPP-307", "A-EAS", "Small fragment set upgrade", 7900, "Product Discussion", "RW", "2026-11-12", "Demo new plate range to Mr Hughes's team", "2026-11-21", "Implants & fixation", "Existing account", "2026-10-03"),
  opp("OPP-308", "A-ARD", "Arthrosamid starter programme", 4200, "Qualified", "CB", "2026-11-02", "Call clinic director about pricing", "2026-11-10", "Arthrosamid", "Clinical evaluation programme", "2026-10-11"),
  opp("OPP-309", "A-RIV", "Day-case arthroscopy pack", 6300, "Qualified", "ET", "2026-11-14", "Confirm pack contents with procurement", "2026-11-25", "Arthroscopy consumables", "Supplier referral", "2026-10-20"),
  opp("OPP-310", "A-GLE", "Injection clinic (Arthrosamid)", 3600, "Lead", "CB", "2026-11-11", "Send clinical evidence pack", "2026-11-20", "Arthrosamid", "Website enquiry", "2026-11-05"),
  opp("OPP-311", "A-HAR", "Consignment expansion: fixation range", 9300, "Negotiation", "AC", "2026-11-18", "Agree par levels for new range", "2026-11-23", "Implants & fixation", "Existing account", "2026-08-07"),
  opp("OPP-312", "A-SDS", "Sagittal saw blades contract", 5400, "Quotation", "ET", "2026-11-09", "Follow up on quote QT-2203", "2026-11-16", "Power tools", "Existing account", "2026-10-01"),
  opp("OPP-313", "A-LIF", "Meniscal repair evaluation", 6900, "Clinical Evaluation", "RW", "2026-11-15", "Collect surgeon feedback after case 3", "2026-11-26", "Sports medicine", "Surgeon referral", "2026-09-19"),
  opp("OPP-314", "A-WES", "Hip fracture nailing set", 8600, "Product Discussion", "RW", "2026-11-04", "Arrange loan set trial date", "2026-11-11", "Implants & fixation", "Conference / trade event", "2026-09-28"),
  opp("OPP-315", "A-BLK", "Foot & ankle implants", 4800, "Qualified", "RW", "2026-11-17", "Send product comparison", "2026-11-27", "Implants & fixation", "Existing account", "2026-10-29"),
  opp("OPP-316", "A-RAT", "Arthrosamid referral pathway", 2900, "Lead", "CB", "2026-11-16", "Introductory call with clinical director", "2026-11-24", "Arthrosamid", "Surgeon referral", "2026-11-09"),
  opp("OPP-317", "A-SEA", "NICE1 rental partnership", 2400, "Lead", "AC", "2026-11-12", "Share rental referral process", "2026-11-20", "NICE1 rentals", "NICE1 website enquiry", "2026-11-03"),
  opp("OPP-318", "A-KIL", "Arthroscopy shaver blades", 3300, "Qualified", "ET", "2026-11-13", "Send blade samples", "2026-11-21", "Arthroscopy consumables", "Supplier referral", "2026-10-22"),
  opp("OPP-319", "A-CED", "ACL reconstruction implants", 7600, "Clinical Evaluation", "CB", "2026-11-18", "Support second evaluation case", "2026-11-25", "Sports medicine", "Existing account", "2026-09-08"),
  opp("OPP-320", "A-LAK", "Battery fleet replacement", 3900, "Product Discussion", "ET", "2026-11-16", "Audit battery ages on site", "2026-11-23", "Power tools", "Existing account", "2026-10-14"),
  opp("OPP-321", "A-DOD", "Sports medicine consumables", 2700, "Lead", "AC", "2026-11-17", "Qualify annual volumes", "2026-11-26", "Sports medicine", "Website enquiry", "2026-11-12"),
  opp("OPP-322", "A-KIN", "Shoulder arthroscopy set", 6100, "Qualified", "CB", "2026-11-18", "Confirm set configuration", "2026-11-24", "Arthroscopy", "Existing account", "2026-10-27"),
  opp("OPP-323", "A-MEA", "Fixation consignment", 4600, "Product Discussion", "RW", "2026-11-17", "Walk stores team through consignment model", "2026-11-25", "Implants & fixation", "Existing account", "2026-10-30"),
  opp("OPP-324", "A-ATL", "Knee arthroscopy pack", 2500, "Quotation", "CB", "2026-11-18", "Quote QT-2209 awaiting response", "2026-11-25", "Arthroscopy consumables", "Existing account", "2026-11-04"),
  opp("OPP-325", "A-NOR", "Implant evaluation", 5200, "Clinical Evaluation", "AC", "2026-11-13", "Product discussion with Ms Carroll", "2026-11-27", "Implants & fixation", "Surgeon referral", "2026-10-16"),
  opp("OPP-326", "A-PIN", "Power tool demonstration", 9500, "Negotiation", "ET", "2026-11-16", "Agree trial-to-purchase terms", "2026-11-26", "Power tools", "Surgeon referral", "2026-09-11"),
];

/* Closed this quarter (for conversion, not part of the open pipeline). */
export const CLOSED_OPPS: Opportunity[] = [
  opp("OPP-288", "A-HAR", "Wrist plating range", 12400, "Won", "AC", "2026-10-14", "n/a", "2026-10-14", "Implants & fixation", "Existing account", "2026-06-02"),
  opp("OPP-290", "A-SDS", "Arthroscopy tubing standardisation", 8800, "Won", "ET", "2026-10-21", "n/a", "2026-10-21", "Arthroscopy consumables", "Existing account", "2026-07-11"),
  opp("OPP-291", "A-LIF", "ACL fixation switch", 10200, "Won", "CB", "2026-10-09", "n/a", "2026-10-09", "Sports medicine", "Surgeon referral", "2026-06-20"),
  opp("OPP-293", "A-EAS", "Headless screw range", 5600, "Won", "RW", "2026-10-28", "n/a", "2026-10-28", "Implants & fixation", "Existing account", "2026-08-12"),
  opp("OPP-294", "A-CED", "Saw blade contract", 6900, "Won", "ET", "2026-11-03", "n/a", "2026-11-03", "Power tools", "Existing account", "2026-08-01"),
  opp("OPP-295", "A-ATL", "Meniscal repair devices", 4700, "Won", "CB", "2026-11-05", "n/a", "2026-11-05", "Sports medicine", "Conference / trade event", "2026-08-26"),
  opp("OPP-296", "A-KIL", "Drapes and tubing", 2600, "Won", "ET", "2026-11-10", "n/a", "2026-11-10", "Arthroscopy consumables", "Supplier referral", "2026-09-17"),
  opp("OPP-297", "A-RAT", "Arthrosamid pilot", 3300, "Won", "CB", "2026-11-12", "n/a", "2026-11-12", "Arthrosamid", "Surgeon referral", "2026-09-30"),
  opp("OPP-298", "A-MEA", "Shoulder anchors", 7400, "Won", "AC", "2026-11-14", "n/a", "2026-11-14", "Sports medicine", "Existing account", "2026-08-21"),
  opp("OPP-289", "A-BLK", "Power tool rental conversion", 9600, "Lost", "RW", "2026-10-07", "n/a", "2026-10-07", "Power tools", "Existing account", "2026-06-15"),
  opp("OPP-292", "A-GLE", "Injection clinic set-up", 2100, "Lost", "CB", "2026-10-19", "n/a", "2026-10-19", "Arthrosamid", "Website enquiry", "2026-08-03"),
  opp("OPP-299", "A-WES", "Arthroscopy tower accessories", 5200, "Lost", "ET", "2026-11-04", "n/a", "2026-11-04", "Arthroscopy consumables", "Conference / trade event", "2026-07-27"),
  opp("OPP-300", "A-DOD", "Sports tape programme", 1800, "Lost", "AC", "2026-11-08", "n/a", "2026-11-08", "Sports medicine", "Website enquiry", "2026-09-05"),
  opp("OPP-287", "A-SDS", "Cement and mixing", 4300, "Lost", "RW", "2026-10-03", "n/a", "2026-10-03", "Implants & fixation", "Existing account", "2026-05-29"),
];

export type ActType = "Visit" | "Call" | "Meeting" | "Follow-up" | "Demo" | "Admin" | "Clinical support";
export type SalesActivity = {
  id: string; rep: StaffId; date: string; time: string; type: ActType; account?: string; opp?: string; title: string;
  status: "Planned" | "Done" | "Missed"; priority: "High" | "Medium" | "Low"; source?: "rep" | "planner" | "agent"; note?: string;
};

function mkActivities(): SalesActivity[] {
  const a: SalesActivity[] = [];
  let n = 0;
  const add = (rep: StaffId, date: string, time: string, type: ActType, title: string, account?: string, oppId?: string, status: SalesActivity["status"] = "Planned", priority: SalesActivity["priority"] = "Medium", note?: string) =>
    a.push({ id: "SA-" + String(++n).padStart(3, "0"), rep, date, time, type, title, account, opp: oppId, status, priority, source: "rep", note });

  // Aileen, Thursday 19 November (the My Day story).
  add("AC", "2026-11-19", "09:00", "Admin", "Review Harbour account", "A-HAR", "OPP-311", "Done", "High", "Par levels for the new fixation range, and INV-6128 is 21 days overdue.");
  add("AC", "2026-11-19", "10:30", "Meeting", "Orthopaedic product discussion", "A-NOR", "OPP-325", "Planned", "Medium");
  add("AC", "2026-11-19", "12:00", "Follow-up", "Follow up Pinewood opportunity", "A-PIN", "OPP-301", "Planned", "High", "Evaluation feedback is 19 days old. Mr Ruane's team ran three cases.");
  add("AC", "2026-11-19", "14:00", "Visit", "Existing customer check-in", "A-LIF", undefined, "Planned", "Medium");
  add("AC", "2026-11-19", "16:00", "Admin", "Update account notes", undefined, undefined, "Planned", "Low");
  // Aileen, the rest of this week.
  add("AC", "2026-11-16", "09:30", "Visit", "Quarterly review", "A-MEA", "OPP-306", "Done");
  add("AC", "2026-11-16", "14:00", "Call", "Tender clarification call", "A-MEA", "OPP-306", "Missed", "High", "Rescheduled twice. Clarification answers were due 17 Nov.");
  add("AC", "2026-11-17", "10:00", "Meeting", "Dodder Valley introduction", "A-DOD", "OPP-321", "Done");
  add("AC", "2026-11-17", "15:00", "Call", "Seafield NICE1 referral call", "A-SEA", "OPP-317", "Done");
  add("AC", "2026-11-18", "08:30", "Clinical support", "Theatre support, fixation case", "A-HAR", "OPP-311", "Done");
  add("AC", "2026-11-18", "13:30", "Meeting", "Team pipeline review", undefined, undefined, "Done");
  add("AC", "2026-11-20", "09:00", "Visit", "Harbour par-level walk-through", "A-HAR", "OPP-311", "Planned", "High");
  add("AC", "2026-11-20", "11:30", "Call", "Northbay evaluation follow-up", "A-NOR", "OPP-325");
  add("AC", "2026-11-20", "15:00", "Admin", "Friday team review with Graham", undefined, undefined, "Planned", "Medium");

  // Rory (fictional rep).
  add("RW", "2026-11-16", "09:00", "Visit", "Eastgate stores walk-round", "A-EAS", "OPP-307", "Done");
  add("RW", "2026-11-16", "13:00", "Call", "Lakeside quote follow-up", "A-LAK", "OPP-303", "Missed", "High", "No answer. Not rebooked.");
  add("RW", "2026-11-17", "10:00", "Clinical support", "Theatre support, distal radius case", "A-SDS", undefined, "Done");
  add("RW", "2026-11-17", "15:00", "Visit", "Blackrock product comparison", "A-BLK", "OPP-315", "Done");
  add("RW", "2026-11-18", "09:30", "Meeting", "Meadowbank consignment walk-through", "A-MEA", "OPP-323", "Done");
  add("RW", "2026-11-18", "14:00", "Follow-up", "Westside loan set trial date", "A-WES", "OPP-314", "Missed", "High", "Overdue since 11 Nov.");
  add("RW", "2026-11-19", "08:00", "Clinical support", "Theatre support, ankle fixation", "A-EAS", undefined, "Done");
  add("RW", "2026-11-19", "11:00", "Visit", "Liffey meniscal case review", "A-LIF", "OPP-313");
  add("RW", "2026-11-19", "15:30", "Call", "South Dublin restock confirmation", "A-SDS");
  add("RW", "2026-11-20", "10:00", "Visit", "Eastgate demo, new plate range", "A-EAS", "OPP-307", "Planned", "High");
  add("RW", "2026-11-20", "14:00", "Admin", "Expenses and CRM notes", undefined, undefined, "Planned", "Low");

  // Clodagh (fictional rep).
  add("CB", "2026-11-16", "10:00", "Visit", "Atlantic theatre team review", "A-ATL", "OPP-305", "Done");
  add("CB", "2026-11-16", "16:00", "Call", "Rathview intro call", "A-RAT", "OPP-316", "Done");
  add("CB", "2026-11-17", "09:00", "Call", "Ardmore pricing call", "A-ARD", "OPP-308", "Missed", "High", "Director unavailable. Overdue since 10 Nov.");
  add("CB", "2026-11-17", "11:30", "Clinical support", "Theatre support, ACL case", "A-CED", "OPP-319", "Done");
  add("CB", "2026-11-18", "10:00", "Meeting", "Kingsbridge set configuration", "A-KIN", "OPP-322", "Done");
  add("CB", "2026-11-18", "14:30", "Visit", "Atlantic quote walkthrough", "A-ATL", "OPP-324", "Done");
  add("CB", "2026-11-19", "09:30", "Visit", "Liffey graft kit stock check", "A-LIF");
  add("CB", "2026-11-19", "13:00", "Demo", "Glenmore evidence pack review", "A-GLE", "OPP-310");
  add("CB", "2026-11-20", "10:00", "Clinical support", "Theatre support, shoulder case", "A-ATL", "OPP-305");
  add("CB", "2026-11-20", "14:00", "Call", "Rathview follow-up", "A-RAT", "OPP-316");

  // Eoin (fictional rep).
  add("ET", "2026-11-16", "09:00", "Visit", "Cedarview procurement meeting", "A-CED", "OPP-302", "Done");
  add("ET", "2026-11-16", "14:00", "Demo", "Lakeside battery audit", "A-LAK", "OPP-320", "Done");
  add("ET", "2026-11-17", "10:30", "Visit", "Riverpark pack contents", "A-RIV", "OPP-309", "Done");
  add("ET", "2026-11-17", "15:00", "Call", "South Dublin blade quote follow-up", "A-SDS", "OPP-312", "Missed", "High", "Quote QT-2203 sent 9 Nov. Follow-up was due 16 Nov.");
  add("ET", "2026-11-18", "09:00", "Visit", "Kilmore blade samples", "A-KIL", "OPP-318", "Done");
  add("ET", "2026-11-18", "13:00", "Call", "Pinewood power tool terms (call)", "A-PIN", "OPP-326", "Done");
  add("ET", "2026-11-19", "10:00", "Visit", "Cedarview service terms", "A-CED", "OPP-302", "Planned", "High");
  add("ET", "2026-11-19", "14:30", "Clinical support", "Power tool in-service, Riverpark", "A-RIV");
  add("ET", "2026-11-20", "09:30", "Call", "Kilmore sample feedback", "A-KIL", "OPP-318");
  add("ET", "2026-11-20", "13:00", "Visit", "Westside arthroscopy review", "A-WES");

  // Next week, partly planned (the planner fills the gaps).
  add("AC", "2026-11-23", "10:00", "Meeting", "Harbour par-level sign-off", "A-HAR", "OPP-311", "Planned", "High");
  add("AC", "2026-11-24", "09:30", "Visit", "Meadowbank tender meeting", "A-MEA", "OPP-306");
  add("RW", "2026-11-23", "09:00", "Visit", "Lakeside consignment review", "A-LAK", "OPP-303");
  add("RW", "2026-11-25", "11:00", "Visit", "Liffey meniscal feedback", "A-LIF", "OPP-313");
  add("CB", "2026-11-24", "10:00", "Visit", "Atlantic case review", "A-ATL", "OPP-305");
  add("CB", "2026-11-26", "14:00", "Meeting", "Kingsbridge set sign-off", "A-KIN", "OPP-322");
  add("ET", "2026-11-23", "10:00", "Visit", "Lakeside battery proposal", "A-LAK", "OPP-320");
  add("ET", "2026-11-25", "09:00", "Visit", "Riverpark pack decision", "A-RIV", "OPP-309");
  return a;
}
export const SALES_ACTIVITIES: SalesActivity[] = mkActivities();

export const WEEKLY_TARGETS: Record<string, { visits: number; followups: number; quotes: number; revenue: number }> = {
  AC: { visits: 10, followups: 12, quotes: 3, revenue: 34000 },
  RW: { visits: 12, followups: 10, quotes: 3, revenue: 26000 },
  CB: { visits: 12, followups: 10, quotes: 3, revenue: 24000 },
  ET: { visits: 11, followups: 10, quotes: 3, revenue: 22000 },
};
/* Revenue attributed this week to date (demo). */
export const WEEK_REVENUE: Record<string, number> = { AC: 27400, RW: 19800, CB: 17900, ET: 16300 };

export type Quote = { id: string; opp: string; account: string; owner: StaffId; sent: string; value: number; status: "Awaiting response" | "Viewed" | "Revision requested" | "Accepted" | "Declined"; validTo: string };
export const QUOTES: Quote[] = [
  { id: "QT-2203", opp: "OPP-312", account: "A-SDS", owner: "ET", sent: "2026-11-09", value: 5400, status: "Awaiting response", validTo: "2026-12-09" },
  { id: "QT-2204", opp: "OPP-302", account: "A-CED", owner: "ET", sent: "2026-11-04", value: 19800, status: "Revision requested", validTo: "2026-12-04" },
  { id: "QT-2205", opp: "OPP-306", account: "A-MEA", owner: "AC", sent: "2026-11-10", value: 11600, status: "Viewed", validTo: "2026-12-10" },
  { id: "QT-2206", opp: "OPP-311", account: "A-HAR", owner: "AC", sent: "2026-11-12", value: 9300, status: "Viewed", validTo: "2026-12-12" },
  { id: "QT-2207", opp: "OPP-303", account: "A-LAK", owner: "RW", sent: "2026-11-11", value: 13400, status: "Awaiting response", validTo: "2026-12-11" },
  { id: "QT-2208", opp: "OPP-326", account: "A-PIN", owner: "ET", sent: "2026-11-16", value: 9500, status: "Viewed", validTo: "2026-12-16" },
  { id: "QT-2209", opp: "OPP-324", account: "A-ATL", owner: "CB", sent: "2026-11-18", value: 2500, status: "Awaiting response", validTo: "2026-12-18" },
  { id: "QT-2198", opp: "OPP-298", account: "A-MEA", owner: "AC", sent: "2026-10-30", value: 7400, status: "Accepted", validTo: "2026-11-30" },
  { id: "QT-2199", opp: "OPP-299", account: "A-WES", owner: "ET", sent: "2026-10-21", value: 5200, status: "Declined", validTo: "2026-11-21" },
];

export type CustomerRequest = { id: string; account: string; owner: StaffId; raised: string; title: string; status: "Open" | "In progress" | "Waiting on customer"; kind: string };
export const REQUESTS: CustomerRequest[] = [
  { id: "REQ-118", account: "A-HAR", owner: "AC", raised: "2026-11-14", title: "In-service training on the fixation set for new theatre staff", status: "Open", kind: "Training" },
  { id: "REQ-119", account: "A-LIF", owner: "JC", raised: "2026-11-17", title: "ACL loan set for a procedure on 24 Nov", status: "In progress", kind: "Loan set" },
  { id: "REQ-120", account: "A-ATL", owner: "CB", raised: "2026-11-15", title: "Price confirmation for shoulder anchors before PO", status: "Open", kind: "Pricing" },
  { id: "REQ-121", account: "A-CED", owner: "ET", raised: "2026-11-13", title: "CE certificates and IFUs for power tool tender file", status: "In progress", kind: "Documentation" },
  { id: "REQ-122", account: "A-EAS", owner: "SO", raised: "2026-11-16", title: "Return unused screws from cancelled list", status: "In progress", kind: "Return" },
  { id: "REQ-123", account: "A-MEA", owner: "AC", raised: "2026-11-11", title: "Tender clarification: delivery lead times", status: "Open", kind: "Tender" },
  { id: "REQ-124", account: "A-BLK", owner: "RW", raised: "2026-11-18", title: "Quarterly usage report for consignment review", status: "Waiting on customer", kind: "Reporting" },
  { id: "REQ-125", account: "A-RIV", owner: "ET", raised: "2026-11-12", title: "Replace short-dated ablation probes (exp. 31 Dec)", status: "Open", kind: "Stock" },
];

/* Leads and wins are the last 12 months (illustrative); pipeline is today's open
   opportunities by source, so it always sums to the live pipeline (€186,500). */
export const LEAD_SOURCES = [
  { source: "Existing account", leads: 31, won: 12 },
  { source: "Surgeon referral", leads: 18, won: 7 },
  { source: "Conference / trade event", leads: 14, won: 3 },
  { source: "Website enquiry", leads: 16, won: 2 },
  { source: "Supplier referral", leads: 9, won: 3 },
  { source: "Clinical evaluation programme", leads: 5, won: 1 },
  { source: "NICE1 website enquiry", leads: 7, won: 1 },
].map(l => ({ ...l, pipeline: OPPORTUNITIES.filter(o => o.source === l.source).reduce((a, o) => a + o.value, 0),
  open: OPPORTUNITIES.filter(o => o.source === l.source).length }));

/* ── Purchasing ─────────────────────────────────────────────────────────── */

export type POStatus = "Draft" | "Awaiting approval" | "Sent" | "Confirmed" | "Part received" | "Received" | "Closed";
export type PurchaseOrder = { id: string; supplier: SupplierId; created: string; expected: string; status: POStatus; lines: { sku: string; qty: number; cost: number; received: number }[]; freight: number; raisedBy: StaffId; note?: string };
const po = (id: string, supplier: SupplierId, created: string, expected: string, status: POStatus, lines: [string, number, number?][], freight = 0, raisedBy: StaffId = "SO", note?: string): PurchaseOrder => ({
  id, supplier, created, expected, status, freight, raisedBy, note,
  lines: lines.map(([sku, qty, rec]) => ({ sku, qty, cost: productBySku(sku)!.unitCost, received: rec ?? (status === "Received" || status === "Closed" ? qty : 0) })),
});
export const PURCHASE_ORDERS: PurchaseOrder[] = [
  po("PO-301", "HAL", "2026-02-26", "2026-03-12", "Closed", [["HH-OR-204", 8]], 150),
  po("PO-329", "HAL", "2026-09-08", "2026-09-21", "Closed", [["HH-OR-204", 6], ["HH-OR-205", 4]], 180),
  po("PO-331", "CON", "2026-10-02", "2026-10-13", "Closed", [["HH-SM-111", 10], ["HH-AC-301", 20]], 240),
  po("PO-333", "VER", "2026-10-20", "2026-11-03", "Part received", [["HH-OR-217", 4, 2], ["HH-OR-219", 3, 3]], 260, "SO", "Two tibial nails five days late. Supplier quotes 24 Nov."),
  po("PO-334", "POL", "2026-10-27", "2026-11-05", "Received", [["HH-PT-405", 20], ["HH-AC-313", 12]], 90),
  po("PO-335", "CEL", "2026-11-03", "2026-11-07", "Received", [["HH-AC-309", 30], ["HH-AC-311", 30]], 0),
  po("PO-336", "CON", "2026-11-05", "2026-11-16", "Confirmed", [["HH-SM-112", 8], ["HH-AC-306", 24], ["HH-SM-115", 10]], 260),
  po("PO-337", "AQU", "2026-11-02", "2026-11-13", "Received", [["HH-SM-140", 12]], 220, "SO", "GRN-0419 received 12 units. BILL-2034 invoiced 14."),
  po("PO-338", "NOR", "2026-11-10", "2026-11-20", "Sent", [["HH-OR-213", 10], ["HH-OR-224", 6]], 120),
  po("PO-339", "ART", "2026-11-12", "2026-11-19", "Confirmed", [["HH-AR-001", 10], ["HH-AR-002", 6]], 0),
  po("PO-340", "BRI", "2026-11-14", "2026-11-29", "Sent", [["HH-IN-506", 2], ["HH-IN-514", 1]], 60),
  po("PO-341", "HAL", "2026-11-18", "2026-12-01", "Awaiting approval", [["HH-OR-201", 20], ["HH-OR-212", 6], ["HH-OR-227", 30]], 180, "SO", "Over €5,000: needs Graham's approval."),
];
export const poValue = (p: PurchaseOrder) => p.lines.reduce((s, l) => s + l.qty * l.cost, 0) + p.freight;

export type GRN = { id: string; po: string; date: string; by: StaffId; lines: { sku: string; qty: number; lot: string; expiry?: string }[]; checks: { k: string; ok: boolean | null; note?: string }[]; status: "Passed" | "Exception" | "Pending docs" };
export const GRNS: GRN[] = [
  { id: "GRN-0419", po: "PO-337", date: "2026-11-13", by: "SO", status: "Passed", lines: [{ sku: "HH-SM-140", qty: 12, lot: "AQ-2611-140", expiry: "2030-10-31" }],
    checks: [{ k: "Packaging intact", ok: true }, { k: "Quantity matches PO", ok: true, note: "12 of 12" }, { k: "UDI / GS1 label scanned", ok: true }, { k: "Lot and expiry captured", ok: true }, { k: "Documentation present", ok: true }, { k: "Storage conditions met", ok: true }] },
  { id: "GRN-0418", po: "PO-335", date: "2026-11-07", by: "SO", status: "Passed", lines: [{ sku: "HH-AC-309", qty: 30, lot: "L2611-309A", expiry: "2029-10-31" }, { sku: "HH-AC-311", qty: 30, lot: "L2611-311A", expiry: "2029-10-31" }],
    checks: [{ k: "Packaging intact", ok: true }, { k: "Quantity matches PO", ok: true }, { k: "UDI / GS1 label scanned", ok: true }, { k: "Lot and expiry captured", ok: true }, { k: "Documentation present", ok: true }, { k: "Storage conditions met", ok: true }] },
  { id: "GRN-0416", po: "PO-334", date: "2026-11-05", by: "JC", status: "Passed", lines: [{ sku: "HH-PT-405", qty: 20, lot: "L2611-405A" }, { sku: "HH-AC-313", qty: 12, lot: "L2611-313A", expiry: "2029-10-31" }],
    checks: [{ k: "Packaging intact", ok: true }, { k: "Quantity matches PO", ok: true }, { k: "UDI / GS1 label scanned", ok: true }, { k: "Lot and expiry captured", ok: true }, { k: "Documentation present", ok: true }, { k: "Storage conditions met", ok: true }] },
  { id: "GRN-0412", po: "PO-333", date: "2026-11-03", by: "SO", status: "Exception", lines: [{ sku: "HH-OR-217", qty: 2, lot: "VS-2610-217" }, { sku: "HH-OR-219", qty: 3, lot: "VS-2610-219" }],
    checks: [{ k: "Packaging intact", ok: true }, { k: "Quantity matches PO", ok: false, note: "2 of 4 tibial nails received" }, { k: "UDI / GS1 label scanned", ok: false, note: "2 labels keyed by hand: barcode unreadable" }, { k: "Lot and expiry captured", ok: true }, { k: "Documentation present", ok: null, note: "Declaration of conformity copy requested" }, { k: "Storage conditions met", ok: true }] },
];

export type BillStatus = "Matched" | "Awaiting payment run" | "Paid" | "Quantity discrepancy" | "Price variance" | "No matching receipt" | "Under review";
export type Bill = { id: string; supplier: SupplierId; po?: string; grn?: string; date: string; due: string; amount: number; status: BillStatus; owner: StaffId; detail?: string; invoicedQty?: number; expectedQty?: number };
export const BILLS: Bill[] = [
  { id: "BILL-2034", supplier: "AQU", po: "PO-337", grn: "GRN-0419", date: "2026-11-14", due: "2026-12-14", amount: 4280, status: "Quantity discrepancy", owner: "MD", invoicedQty: 14, expectedQty: 12,
    detail: "Invoice bills 14 × HH-SM-140 at €290 plus €220 freight. PO-337 ordered 12 and GRN-0419 received 12. The 2 extra units (€580) were never delivered." },
  { id: "BILL-2029", supplier: "POL", po: "PO-334", grn: "GRN-0416", date: "2026-11-08", due: "2026-12-08", amount: poValue(PURCHASE_ORDERS.find(p => p.id === "PO-334")!) + 240, status: "Price variance", owner: "MD",
    detail: "PO-334 in full, but the 20 saw blades are billed at €12 per unit above the agreed 2026 price list: €240 more than the PO." },
  { id: "BILL-2038", supplier: "CEL", date: "2026-11-17", due: "2026-12-17", amount: 1185, status: "No matching receipt", owner: "MD",
    detail: "No PO reference on the invoice. Likely the drapes top-up John ordered by phone on 12 Nov; needs a receipt or PO to match." },
  { id: "BILL-2031", supplier: "CEL", po: "PO-335", grn: "GRN-0418", date: "2026-11-08", due: "2026-12-08", amount: 2160, status: "Matched", owner: "MD" },
  { id: "BILL-2030", supplier: "CON", po: "PO-331", date: "2026-10-14", due: "2026-12-13", amount: 6840, status: "Awaiting payment run", owner: "MD" },
  { id: "BILL-2027", supplier: "HAL", po: "PO-329", date: "2026-09-22", due: "2026-11-06", amount: 1810, status: "Paid", owner: "MD" },
  { id: "BILL-1962", supplier: "HAL", po: "PO-301", date: "2026-03-13", due: "2026-04-27", amount: 1310, status: "Paid", owner: "MD" },
  { id: "BILL-2033", supplier: "VER", po: "PO-333", grn: "GRN-0412", date: "2026-11-04", due: "2026-12-19", amount: 9420, status: "Awaiting payment run", owner: "MD" },
  { id: "BILL-2035", supplier: "CON", date: "2026-11-15", due: "2027-01-14", amount: 18640, status: "Matched", owner: "MD" },
  { id: "BILL-2036", supplier: "HAL", date: "2026-11-16", due: "2026-12-31", amount: 12470, status: "Matched", owner: "MD" },
  { id: "BILL-2037", supplier: "NOR", date: "2026-11-16", due: "2026-12-16", amount: 3980, status: "Matched", owner: "MD" },
  { id: "BILL-2039", supplier: "ART", date: "2026-11-18", due: "2026-12-18", amount: 5290, status: "Matched", owner: "MD" },
  { id: "BILL-2040", supplier: "NIC", date: "2026-11-18", due: "2026-12-18", amount: 760, status: "Matched", owner: "MD" },
  { id: "BILL-2041", supplier: "BRI", date: "2026-11-18", due: "2026-12-18", amount: 1930, status: "Awaiting payment run", owner: "MD" },
];

/* ── Finance ────────────────────────────────────────────────────────────── */

export type InvoiceStatus = "Open" | "Overdue" | "Paid";
export type Invoice = { id: string; account: string; issued: string; due: string; amount: number; status: InvoiceStatus; owner: StaffId; lastReminder?: string; reminders: number; paid?: string };

const ovd = (id: string, account: string, amount: number, daysOver: number, lastReminder?: string, reminders = 0): Invoice => {
  const due = addDays(TODAY, -daysOver);
  return { id, account, amount, due, issued: addDays(due, -30), status: "Overdue", owner: "MD", lastReminder, reminders };
};
/* Twelve overdue invoices totalling €23,800. */
const OVERDUE: Invoice[] = [
  ovd("INV-6128", "A-HAR", 8750, 21, "2026-11-05", 1),
  ovd("INV-6097", "A-BLK", 1240, 34, "2026-11-10", 2),
  ovd("INV-6102", "A-EAS", 2310, 28, "2026-11-04", 1),
  ovd("INV-6110", "A-RIV", 980, 26, "2026-11-06", 1),
  ovd("INV-6115", "A-WES", 1560, 24, "2026-11-11", 1),
  ovd("INV-6119", "A-ATL", 2180, 22, undefined, 0),
  ovd("INV-6131", "A-LIF", 1425, 18, undefined, 0),
  ovd("INV-6134", "A-CED", 1870, 15, undefined, 0),
  ovd("INV-6139", "A-ARD", 640, 12, undefined, 0),
  ovd("INV-6142", "A-LAK", 1095, 9, undefined, 0),
  ovd("INV-6147", "A-KIL", 515, 6, undefined, 0),
  ovd("INV-6150", "A-SEA", 1235, 3, undefined, 0),
];
function mkOpenInvoices(): Invoice[] {
  const out: Invoice[] = [];
  const amounts = [4820, 6210, 2980, 3640, 1290, 5870, 2450, 7920, 1860, 3310, 4475, 2060, 6640, 1580, 3980, 2770, 5120, 1940, 3360, 2215, 4730, 1690, 2880, 3025, 1415, 2390, 4105, 1960];
  const accs = ["A-SDS", "A-HAR", "A-LIF", "A-EAS", "A-ATL", "A-CED", "A-MEA", "A-SDS", "A-KIN", "A-LAK", "A-HAR", "A-BLK", "A-SDS", "A-RIV", "A-LIF", "A-ATL", "A-CED", "A-WES", "A-MEA", "A-KIL", "A-HAR", "A-NOR", "A-EAS", "A-DOD", "A-RAT", "A-KIN", "A-SDS", "A-PIN"];
  amounts.forEach((amount, i) => {
    const issued = addDays("2026-10-21", Math.round(i * 1.05));
    out.push({ id: "INV-" + (6151 + i), account: accs[i], amount, issued, due: addDays(issued, 30), status: "Open", owner: "MD", reminders: 0 });
  });
  return out;
}
const PAID_RECENT: Invoice[] = [
  { id: "INV-6066", account: "A-HAR", issued: "2026-10-09", due: "2026-11-08", amount: 235, status: "Paid", owner: "MD", reminders: 0, paid: "2026-11-05" },
  { id: "INV-6141", account: "A-HAR", issued: "2026-11-06", due: "2026-12-06", amount: 235, status: "Open", owner: "MD", reminders: 0 },
  { id: "INV-6088", account: "A-SDS", issued: "2026-09-30", due: "2026-10-30", amount: 6420, status: "Paid", owner: "MD", reminders: 0, paid: "2026-11-12" },
  { id: "INV-6091", account: "A-LIF", issued: "2026-10-02", due: "2026-11-01", amount: 3180, status: "Paid", owner: "MD", reminders: 0, paid: "2026-11-14" },
  { id: "INV-6094", account: "A-CED", issued: "2026-10-05", due: "2026-11-04", amount: 5260, status: "Paid", owner: "MD", reminders: 1, paid: "2026-11-17" },
];
export const INVOICES: Invoice[] = [...OVERDUE, ...mkOpenInvoices(), ...PAID_RECENT];

export type BankTxn = { id: string; date: string; desc: string; amount: number; state: "Suggested match" | "Unmatched" | "Exception" | "Matched"; suggest?: string; confidence?: number; note?: string };
export const BANK: BankTxn[] = [
  { id: "BT-9921", date: "2026-11-18", desc: "SEPA CR BLACKROCK ORTHO PRAC INV6097", amount: 1240, state: "Suggested match", suggest: "INV-6097", confidence: 98, note: "Reference and amount match exactly." },
  { id: "BT-9922", date: "2026-11-18", desc: "SEPA CR SDSC LTD REMIT 4471", amount: 4820, state: "Suggested match", suggest: "INV-6151", confidence: 91, note: "Amount matches INV-6151. Remittance number not in Pulse." },
  { id: "BT-9918", date: "2026-11-17", desc: "SEPA CR CEDARVIEW PH AP RUN", amount: 5870, state: "Suggested match", suggest: "INV-6156", confidence: 88 },
  { id: "BT-9917", date: "2026-11-17", desc: "SEPA CR LIFFEY SURG 6153", amount: 2980, state: "Suggested match", suggest: "INV-6153", confidence: 95 },
  { id: "BT-9915", date: "2026-11-14", desc: "SEPA DR AQUILA SPORTS MED", amount: -3480, state: "Exception", note: "Part payment against BILL-2034 not expected: bill is on hold. Check who released it." },
  { id: "BT-9914", date: "2026-11-14", desc: "CARD DEBIT FUEL ORLA SERV", amount: -86.4, state: "Unmatched", note: "Card spend. Needs a receipt and a cost code." },
  { id: "BT-9912", date: "2026-11-13", desc: "SEPA CR MEADOWBANK PH", amount: 2450, state: "Suggested match", suggest: "INV-6157", confidence: 84 },
  { id: "BT-9911", date: "2026-11-13", desc: "SEPA CR HARBOUR ORTH CLIN", amount: 3000, state: "Unmatched", note: "Partial amount. Could be part of INV-6128 (€8,750) or INV-6152 (€6,210)." },
  { id: "BT-9909", date: "2026-11-12", desc: "SEPA DR PAYROLL NOV P1", amount: -24180, state: "Matched", note: "Payroll journal." },
  { id: "BT-9907", date: "2026-11-12", desc: "SEPA CR UNKNOWN REF 55821", amount: 640, state: "Unmatched", note: "No reference. Same amount as INV-6139 (Ardmore)." },
  { id: "BT-9905", date: "2026-11-11", desc: "DD SOFTWARE SUBSCRIPTION", amount: -1490, state: "Matched" },
  { id: "BT-9903", date: "2026-11-10", desc: "SEPA CR KINGSBRIDGE SH", amount: 7920, state: "Exception", note: "Received twice? A matching credit landed on 6 Nov. Possible duplicate payment to refund." },
  { id: "BT-9901", date: "2026-11-10", desc: "SEPA DR CONMED EU AP", amount: -18200, state: "Matched" },
  { id: "BT-9899", date: "2026-11-09", desc: "SEPA CR RIVERPARK DS", amount: 1580, state: "Suggested match", suggest: "INV-6164", confidence: 79 },
];

/* November to date (1 to 19 Nov 2026). These reconcile: 165,400 − 101,200 = 64,200; 64,200 − 38,500 = 25,700. */
export const FIN = {
  revenue: 165400, cogs: 101200, grossProfit: 64200, opex: 38500, ebitda: 25700, grossMargin: 38.8, ebitdaMargin: 15.5,
  bankBalance: 148320, bankAsOf: "2026-11-18",
  opexLines: [
    { k: "Salaries and PRSI", v: 26400 }, { k: "Vehicles and travel", v: 4300 }, { k: "Premises (office and stockroom)", v: 2900 },
    { k: "Courier and logistics", v: 1700 }, { k: "Systems and software", v: 1500 }, { k: "Insurance and quality", v: 1100 }, { k: "Marketing and events", v: 600 },
  ],
  byCategory: [
    { k: "Orthopaedic implants & fixation", rev: 58600, cogs: 37100 },
    { k: "Sports medicine & joint reconstruction", rev: 41200, cogs: 24300 },
    { k: "Power tools & instruments", rev: 22800, cogs: 15100 },
    { k: "Arthroscopy consumables", rev: 21800, cogs: 13100 },
    { k: "Arthrosamid", rev: 14300, cogs: 8900 },
    { k: "Loan set & service fees", rev: 4100, cogs: 1800 },
    { k: "NICE1 rentals", rev: 2600, cogs: 900 },
  ],
  bySupplier: [
    { k: "CONMED portfolio", rev: 54700, gp: 21000 },
    { k: "Halcyon Orthopaedics", rev: 38900, gp: 14200 },
    { k: "Veritas Surgical", rev: 24600, gp: 9300 },
    { k: "Arthrosamid", rev: 14300, gp: 5400 },
    { k: "Other agencies (5)", rev: 26200, gp: 10300 },
    { k: "Loan set & service fees", rev: 4100, gp: 2300 },
    { k: "NICE1 rentals", rev: 2600, gp: 1700 },
  ],
  /* Full months are illustrative history. Nov is month to date. */
  monthly: [
    { m: "Dec 25", rev: 231400, gp: 88900, ebitda: 31900 }, { m: "Jan 26", rev: 214800, gp: 81200, ebitda: 24100 },
    { m: "Feb 26", rev: 238600, gp: 91800, ebitda: 33500 }, { m: "Mar 26", rev: 256200, gp: 99100, ebitda: 38900 },
    { m: "Apr 26", rev: 247900, gp: 95200, ebitda: 35200 }, { m: "May 26", rev: 262300, gp: 101600, ebitda: 40800 },
    { m: "Jun 26", rev: 251700, gp: 96900, ebitda: 36400 }, { m: "Jul 26", rev: 236900, gp: 90100, ebitda: 30200 },
    { m: "Aug 26", rev: 219400, gp: 83300, ebitda: 25800 }, { m: "Sep 26", rev: 268500, gp: 104200, ebitda: 42300 },
    { m: "Oct 26", rev: 274100, gp: 106700, ebitda: 43900 }, { m: "Nov 26*", rev: 165400, gp: 64200, ebitda: 25700 },
  ],
  forecast: { workingDaysDone: 14, workingDays: 21, base: 251600, low: 238400, high: 266900 },
  cashWeeks: [
    { w: "w/c 23 Nov", inflow: 41200, outflow: 38600 }, { w: "w/c 30 Nov", inflow: 52800, outflow: 61400 },
    { w: "w/c 7 Dec", inflow: 47300, outflow: 29800 }, { w: "w/c 14 Dec", inflow: 56100, outflow: 44200 },
    { w: "w/c 21 Dec", inflow: 22400, outflow: 36900 }, { w: "w/c 28 Dec", inflow: 18600, outflow: 12300 },
  ],
};

/* ── Loan sets, returns ─────────────────────────────────────────────────── */

export type LoanSet = {
  id: string; name: string; components: { k: string; n: number }[]; location: string; status: "Available" | "Requested" | "Dispatched" | "At hospital" | "Returned: inspection" | "Decontamination";
  requestedBy?: string; procedureDate?: string; dispatchBy?: string; returnBy?: string; inspection: "Inspected & sealed" | "Awaiting decontamination certificate" | "Count check required" | "Pending"; owner: StaffId;
};
export const LOAN_SETS: LoanSet[] = [
  { id: "LS-01", name: "ACL reconstruction instrument set", components: [{ k: "Tibial guide", n: 1 }, { k: "Femoral offset guides", n: 4 }, { k: "Reamers 7 to 11 mm", n: 5 }, { k: "Graft passing pins", n: 6 }], location: "DLM", status: "Requested", requestedBy: "A-LIF", procedureDate: "2026-11-24", dispatchBy: "2026-11-23", returnBy: "2026-11-27", inspection: "Inspected & sealed", owner: "JC" },
  { id: "LS-02", name: "Proximal tibia plating set", components: [{ k: "Plate templates", n: 6 }, { k: "Drill guides", n: 4 }, { k: "Reduction clamps", n: 3 }], location: "SDS", status: "At hospital", requestedBy: "A-SDS", procedureDate: "2026-11-18", dispatchBy: "2026-11-17", returnBy: "2026-11-21", inspection: "Pending", owner: "JC" },
  { id: "LS-03", name: "Shoulder arthroscopy anchor set", components: [{ k: "Drill guides", n: 3 }, { k: "Punches", n: 2 }, { k: "Suture retrievers", n: 4 }], location: "DLM", status: "Available", inspection: "Inspected & sealed", owner: "JC" },
  { id: "LS-04", name: "Hip fracture nailing set", components: [{ k: "Targeting arm", n: 1 }, { k: "Reamers", n: 8 }, { k: "Guide wires", n: 6 }], location: "DLM", status: "Returned: inspection", requestedBy: "A-WES", inspection: "Awaiting decontamination certificate", owner: "JC" },
  { id: "LS-05", name: "Small fragment set", components: [{ k: "Drill bits", n: 6 }, { k: "Depth gauges", n: 2 }, { k: "Screw racks", n: 2 }], location: "EAS", status: "At hospital", requestedBy: "A-EAS", procedureDate: "2026-11-19", dispatchBy: "2026-11-18", returnBy: "2026-11-24", inspection: "Pending", owner: "JC" },
  { id: "LS-06", name: "Foot & ankle set", components: [{ k: "Staple instruments", n: 3 }, { k: "Plate benders", n: 2 }, { k: "K-wire driver", n: 1 }], location: "DLM", status: "Available", inspection: "Inspected & sealed", owner: "JC" },
  { id: "LS-07", name: "Power tool loan kit (saw + drill)", components: [{ k: "Sagittal saw", n: 1 }, { k: "Drill", n: 1 }, { k: "Batteries", n: 4 }, { k: "Charger", n: 1 }], location: "DLM", status: "Requested", requestedBy: "A-WES", procedureDate: "2026-11-26", dispatchBy: "2026-11-25", returnBy: "2026-11-28", inspection: "Inspected & sealed", owner: "JC" },
  { id: "LS-08", name: "Knee arthroscopy set", components: [{ k: "Probes", n: 2 }, { k: "Graspers", n: 3 }, { k: "Punches", n: 3 }], location: "In transit", status: "Dispatched", requestedBy: "A-ATL", procedureDate: "2026-11-20", dispatchBy: "2026-11-19", returnBy: "2026-11-25", inspection: "Inspected & sealed", owner: "JC" },
  { id: "LS-09", name: "Meniscal repair set", components: [{ k: "Cannulas", n: 4 }, { k: "Depth probes", n: 2 }, { k: "Knot pushers", n: 2 }], location: "DLM", status: "Decontamination", inspection: "Count check required", owner: "JC" },
  { id: "LS-10", name: "Hand & wrist set", components: [{ k: "Mini drivers", n: 2 }, { k: "Bending irons", n: 2 }, { k: "Drill guides", n: 3 }], location: "DLM", status: "Available", inspection: "Inspected & sealed", owner: "JC" },
];

export type ReturnRec = { id: string; account: string; sku: string; qty: number; lot: string; reason: string; status: "Requested" | "Received" | "Inspected" | "Restocked" | "Return to supplier"; raised: string; credit?: string };
export const RETURNS: ReturnRec[] = [
  { id: "RMA-0086", account: "A-EAS", sku: "HH-OR-201", qty: 6, lot: "L2605-201A", reason: "Unused: case list cancelled", status: "Requested", raised: "2026-11-16", credit: "CN-0088 (pending approval)" },
  { id: "RMA-0085", account: "A-RIV", sku: "HH-AC-305", qty: 4, lot: "L2401-305A", reason: "Short-dated (expires 31 Dec)", status: "Requested", raised: "2026-11-12" },
  { id: "RMA-0084", account: "A-ATL", sku: "HH-SM-119", qty: 1, lot: "L2603-119B", reason: "Outer packaging damaged in transit", status: "Inspected", raised: "2026-11-10" },
  { id: "RMA-0083", account: "A-SDS", sku: "HH-AC-302", qty: 10, lot: "L2607-302A", reason: "Wrong blade size ordered", status: "Restocked", raised: "2026-11-06", credit: "CN-0086" },
  { id: "RMA-0082", account: "A-CED", sku: "HH-PT-406", qty: 5, lot: "L2606-406A", reason: "Surplus after tender change", status: "Received", raised: "2026-11-04" },
  { id: "RMA-0081", account: "DLM", sku: "HH-AC-314", qty: 4, lot: "L2312-314A", reason: "Short-dated stock back to supplier", status: "Return to supplier", raised: "2026-11-18" },
];

/* ── NICE1 rentals ──────────────────────────────────────────────────────── */

export const RENTAL_PRICING = [
  { k: "NICE1 system only: initial two weeks", v: 300 },
  { k: "NICE1 system with therapy wrap: initial two weeks", v: 400 },
  { k: "Each additional week", v: 100 },
];

export type RentalAssetStatus = "On hire" | "Reserved" | "Available" | "Inspection";
export type RentalAsset = { id: string; serial: string; status: RentalAssetStatus; booking?: string; lastService: string; cleaned: string; hireDaysYtd: number; revenueYtd: number };
export const RENTAL_ASSETS: RentalAsset[] = [
  { id: "N1-011", serial: "N1-SN-0411", status: "On hire", booking: "RN-0203", lastService: "2026-08-14", cleaned: "2026-11-04", hireDaysYtd: 231, revenueYtd: 5900 },
  { id: "N1-012", serial: "N1-SN-0412", status: "On hire", booking: "RN-0204", lastService: "2026-08-14", cleaned: "2026-11-05", hireDaysYtd: 214, revenueYtd: 5300 },
  { id: "N1-013", serial: "N1-SN-0413", status: "On hire", booking: "RN-0205", lastService: "2026-09-02", cleaned: "2026-11-08", hireDaysYtd: 226, revenueYtd: 5700 },
  { id: "N1-014", serial: "N1-SN-0414", status: "Available", lastService: "2026-09-02", cleaned: "2026-11-18", hireDaysYtd: 198, revenueYtd: 5000 },
  { id: "N1-015", serial: "N1-SN-0415", status: "On hire", booking: "RN-0206", lastService: "2026-10-01", cleaned: "2026-11-11", hireDaysYtd: 187, revenueYtd: 4800 },
  { id: "N1-017", serial: "N1-SN-0417", status: "On hire", booking: "RN-0207", lastService: "2026-10-01", cleaned: "2026-11-14", hireDaysYtd: 142, revenueYtd: 3600 },
  { id: "N1-018", serial: "N1-SN-0418", status: "Reserved", booking: "RN-0208", lastService: "2026-10-20", cleaned: "2026-11-14", hireDaysYtd: 96, revenueYtd: 2500 },
];

export type BookingStatus = "Enquiry" | "Reserved" | "Dispatched" | "On hire" | "Returned" | "Completed";
export type RentalBooking = {
  id: string; asset?: string; customer: string; referral?: string; pkg: "System only" | "System + therapy wrap"; price: number; start: string; end: string;
  status: BookingStatus; extension?: { weeks: number; fee: number; state: "Requested" | "Approved" }; delivery: string; steps?: { k: string; done: boolean }[];
};
export const RENTAL_BOOKINGS: RentalBooking[] = [
  { id: "RN-0208", asset: "N1-018", customer: "Private customer · ref P-1182", referral: "Referred by Atlantic Sports Surgery", pkg: "System + therapy wrap", price: 400, start: "2026-11-20", end: "2026-12-04", status: "Reserved", delivery: "Courier, South County Dublin",
    steps: [{ k: "Unit cleaned and inspected", done: true }, { k: "Battery and cooling test", done: true }, { k: "Therapy wrap packed", done: false }, { k: "Patient instructions leaflet (no clinical advice)", done: false }, { k: "Courier booked", done: false }] },
  { id: "RN-0207", asset: "N1-017", customer: "Physiotherapy clinic · ref C-0412", pkg: "System + therapy wrap", price: 400, start: "2026-11-16", end: "2026-11-30", status: "On hire", delivery: "Courier, Dublin 6" },
  { id: "RN-0206", asset: "N1-015", customer: "Private customer · ref P-1176", pkg: "System + therapy wrap", price: 500, start: "2026-11-12", end: "2026-12-03", status: "On hire", delivery: "Collected from Dún Laoghaire", extension: { weeks: 1, fee: 100, state: "Approved" } },
  { id: "RN-0205", asset: "N1-013", customer: "Private customer · ref P-1171", referral: "Referred by Liffey Surgical Clinic", pkg: "System + therapy wrap", price: 400, start: "2026-11-09", end: "2026-11-23", status: "On hire", delivery: "Courier, Co. Kildare" },
  { id: "RN-0204", asset: "N1-012", customer: "Private customer · ref P-1168", pkg: "System only", price: 300, start: "2026-11-06", end: "2026-11-20", status: "On hire", delivery: "Courier, Dublin 15" },
  { id: "RN-0203", asset: "N1-011", customer: "Sports club · ref C-0398", pkg: "System + therapy wrap", price: 400, start: "2026-11-05", end: "2026-11-19", status: "On hire", delivery: "Courier, Co. Wicklow", extension: { weeks: 1, fee: 100, state: "Requested" } },
  { id: "RN-0202", asset: "N1-018", customer: "Private customer · ref P-1150", pkg: "System + therapy wrap", price: 400, start: "2026-10-30", end: "2026-11-13", status: "Completed", delivery: "Courier, Dublin 18" },
  { id: "RN-0201", asset: "N1-014", customer: "Private customer · ref P-1153", pkg: "System + therapy wrap", price: 400, start: "2026-11-03", end: "2026-11-17", status: "Completed", delivery: "Courier, Dublin 14" },
  { id: "RN-0200", asset: "N1-017", customer: "Physiotherapy clinic · ref C-0377", pkg: "System only", price: 400, start: "2026-10-23", end: "2026-11-13", status: "Completed", delivery: "Courier, Dublin 4", extension: { weeks: 1, fee: 100, state: "Approved" } },
  { id: "RN-0199", asset: "N1-015", customer: "Private customer · ref P-1139", pkg: "System + therapy wrap", price: 400, start: "2026-10-21", end: "2026-11-04", status: "Completed", delivery: "Courier, Co. Meath" },
  { id: "RN-0198", asset: "N1-013", customer: "Private customer · ref P-1134", pkg: "System + therapy wrap", price: 500, start: "2026-10-19", end: "2026-11-09", status: "Completed", delivery: "Courier, Dublin 16", extension: { weeks: 1, fee: 100, state: "Approved" } },
  { id: "RN-0209", customer: "Enquiry via nice1.ie · ref E-0219", pkg: "System + therapy wrap", price: 400, start: "2026-11-25", end: "2026-12-09", status: "Enquiry", delivery: "To confirm" },
  { id: "RN-0210", customer: "Physiotherapy clinic · ref C-0412", pkg: "System only", price: 300, start: "2026-12-01", end: "2026-12-15", status: "Enquiry", delivery: "To confirm" },
];
/* Rental revenue by month (illustrative). November is month to date and matches FIN.byCategory. */
export const RENTAL_MONTHLY = [
  { m: "Jun", v: 1900 }, { m: "Jul", v: 2300 }, { m: "Aug", v: 2700 }, { m: "Sep", v: 3100 }, { m: "Oct", v: 3600 }, { m: "Nov*", v: 2600 },
];

/* ── Quality and compliance ─────────────────────────────────────────────── */

export type QualityDoc = { id: string; title: string; kind: "CE certificate" | "Declaration of conformity" | "IFU" | "SOP" | "Agreement" | "Checklist" | "Report"; owner: StaffId; supplier?: SupplierId; version: string; reviewed: string; nextReview: string; status: "Current" | "Review due" | "Draft" | "Missing" | "Expiring" };
export const QUALITY_DOCS: QualityDoc[] = [
  { id: "QD-001", title: "SOP-QA-07 Goods receiving and verification", kind: "SOP", owner: "JC", version: "v4", reviewed: "2026-03-10", nextReview: "2027-03-10", status: "Current" },
  { id: "QD-002", title: "SOP-QA-11 Traceability and recall drill", kind: "SOP", owner: "JC", version: "v3", reviewed: "2025-11-02", nextReview: "2026-11-02", status: "Review due" },
  { id: "QD-003", title: "SOP-QA-09 Complaints and vigilance handling", kind: "SOP", owner: "JC", version: "v2", reviewed: "2026-05-21", nextReview: "2027-05-21", status: "Current" },
  { id: "QD-004", title: "SOP-QA-03 Storage conditions and stock rotation (FEFO)", kind: "SOP", owner: "JC", version: "v5", reviewed: "2026-01-14", nextReview: "2027-01-14", status: "Current" },
  { id: "QD-005", title: "Loan set decontamination and return procedure", kind: "SOP", owner: "JC", version: "v2", reviewed: "2026-06-09", nextReview: "2027-06-09", status: "Current" },
  { id: "QD-006", title: "Distributor obligations checklist (EU MDR Art. 14)", kind: "Checklist", owner: "GH", version: "v1.3", reviewed: "2026-02-18", nextReview: "2027-02-18", status: "Current" },
  { id: "QD-007", title: "Consignment agreement template", kind: "Agreement", owner: "GH", version: "v6", reviewed: "2026-04-02", nextReview: "2027-04-02", status: "Current" },
  { id: "QD-008", title: "CE certificate: Halcyon fixation portfolio", kind: "CE certificate", owner: "JC", supplier: "HAL", version: "Demo ref. CE-HAL-118", reviewed: "2026-01-20", nextReview: "2028-05-31", status: "Current" },
  { id: "QD-009", title: "CE certificate: Polaris power consumables", kind: "CE certificate", owner: "JC", supplier: "POL", version: "Demo ref. CE-POL-042", reviewed: "2025-12-03", nextReview: "2027-01-08", status: "Expiring" },
  { id: "QD-010", title: "Declaration of conformity: Nordfix foot fusion plate", kind: "Declaration of conformity", owner: "JC", supplier: "NOR", version: "n/a", reviewed: "n/a", nextReview: "n/a", status: "Missing" },
  { id: "QD-011", title: "Declaration of conformity: Nordfix step staple", kind: "Declaration of conformity", owner: "JC", supplier: "NOR", version: "n/a", reviewed: "n/a", nextReview: "n/a", status: "Missing" },
  { id: "QD-012", title: "Declaration of conformity: Veritas nailing system", kind: "Declaration of conformity", owner: "JC", supplier: "VER", version: "Demo ref. DoC-VER-07", reviewed: "2026-02-11", nextReview: "2027-02-11", status: "Current" },
  { id: "QD-013", title: "IFU pack: Aquila knotless anchors", kind: "IFU", owner: "JC", supplier: "AQU", version: "Rev F", reviewed: "2026-07-15", nextReview: "2027-07-15", status: "Current" },
  { id: "QD-014", title: "IFU pack: Arthrosamid", kind: "IFU", owner: "JC", supplier: "ART", version: "Supplier current", reviewed: "2026-08-02", nextReview: "2027-08-02", status: "Current" },
  { id: "QD-015", title: "Supplier approval file: Celtic Sterile Supplies", kind: "Report", owner: "MD", supplier: "CEL", version: "2026", reviewed: "2026-03-30", nextReview: "2027-03-30", status: "Current" },
  { id: "QD-016", title: "Internal audit: traceability (Q3)", kind: "Report", owner: "JC", version: "Draft", reviewed: "2026-10-28", nextReview: "2026-11-28", status: "Draft" },
  { id: "QD-017", title: "Consignment stock count procedure", kind: "SOP", owner: "JC", version: "v3", reviewed: "2025-10-15", nextReview: "2026-10-15", status: "Review due" },
  { id: "QD-018", title: "CE certificate: CONMED sports medicine (supplier copy)", kind: "CE certificate", owner: "JC", supplier: "CON", version: "Supplier copy on file", reviewed: "2026-04-11", nextReview: "2028-09-30", status: "Current" },
];

export type QualityException = { id: string; title: string; kind: "Documentation" | "Traceability" | "Expiry" | "Stock" | "Complaint" | "Loan set"; severity: "High" | "Medium" | "Low"; ref: string; refType: string; owner: StaffId; raised: string; status: "Open" | "In review" | "Closed"; detail: string };
export const QUALITY_EXCEPTIONS: QualityException[] = [
  { id: "QX-031", title: "Declarations of conformity missing for 2 Nordfix SKUs", kind: "Documentation", severity: "High", ref: "QD-010", refType: "doc", owner: "JC", raised: "2026-11-10", status: "Open", detail: "HH-OR-239 and HH-OR-233 were received without a DoC copy on file. Supplier asked on 10 Nov." },
  { id: "QX-032", title: "GRN-0412: two UDI labels keyed by hand", kind: "Traceability", severity: "Medium", ref: "GRN-0412", refType: "grn", owner: "SO", raised: "2026-11-03", status: "In review", detail: "Barcodes on two tibial nails were unreadable. Lot captured by hand; needs second-person verification." },
  { id: "QX-033", title: "Lot L2401-305A at Riverpark expires 31 Dec", kind: "Expiry", severity: "Medium", ref: "HH-AC-305", refType: "product", owner: "ET", raised: "2026-11-12", status: "Open", detail: "4 units held at Riverpark Day Surgery. Return requested (RMA-0085); replacement stock available centrally." },
  { id: "QX-034", title: "Lot L2312-314A in main stockroom expires 15 Dec", kind: "Expiry", severity: "Low", ref: "HH-AC-314", refType: "product", owner: "JC", raised: "2026-11-18", status: "In review", detail: "4 burrs quarantined. Return to supplier raised (RMA-0081)." },
  { id: "QX-035", title: "Count variance at Eastgate: HH-SM-114", kind: "Stock", severity: "Medium", ref: "HH-SM-114", refType: "product", owner: "JC", raised: "2026-11-14", status: "Open", detail: "System says 5, count found 4. Likely used in theatre without a usage order. Confirm with practice manager." },
  { id: "QX-036", title: "CE certificate for Polaris consumables expires 8 Jan", kind: "Documentation", severity: "Medium", ref: "QD-009", refType: "doc", owner: "JC", raised: "2026-11-08", status: "Open", detail: "Renewed certificate requested from the supplier. Stock can be distributed until expiry only if conformity is maintained." },
  { id: "QX-037", title: "Complaint CMP-014: damaged outer packaging", kind: "Complaint", severity: "Low", ref: "RMA-0084", refType: "return", owner: "JC", raised: "2026-11-10", status: "In review", detail: "One meniscal repair device returned from Atlantic. Inner sterile barrier intact. No patient involvement recorded." },
  { id: "QX-038", title: "LS-04 returned without decontamination certificate", kind: "Loan set", severity: "Medium", ref: "LS-04", refType: "loanset", owner: "JC", raised: "2026-11-17", status: "Open", detail: "Hip nailing set back from Westside. Cannot be inspected or re-issued until the certificate arrives." },
];

/* ── Business performance series (illustrative) ─────────────────────────── */

export const WEEKS = ["w/c 31 Aug", "7 Sep", "14 Sep", "21 Sep", "28 Sep", "5 Oct", "12 Oct", "19 Oct", "26 Oct", "2 Nov", "9 Nov", "16 Nov"];
export const OPS_TRENDS = {
  handlingMins: [44, 46, 43, 45, 42, 44, 41, 43, 40, 42, 41, 39],
  manualCorrections: [9, 11, 8, 10, 9, 12, 8, 9, 7, 10, 8, 6],
  stockExceptions: [7, 6, 8, 7, 9, 6, 7, 8, 6, 7, 9, 8],
  followupCompletion: [71, 68, 74, 70, 66, 72, 69, 73, 70, 67, 71, 64],
  onSchedule: [88, 91, 87, 90, 89, 86, 92, 90, 88, 91, 89, 90],
  reconLines: [38, 42, 35, 41, 44, 39, 46, 40, 43, 47, 41, 45],
};
export const MOVE_TRENDS = {
  receipts: [12, 9, 14, 11, 13, 10, 15, 12, 11, 14, 12, 9],
  transfers: [8, 10, 7, 9, 11, 8, 9, 10, 12, 9, 11, 7],
  consumption: [21, 24, 19, 23, 26, 22, 25, 24, 27, 23, 26, 18],
  dispatches: [17, 19, 16, 20, 18, 21, 19, 22, 20, 23, 21, 15],
};
export const CATEGORY_USAGE_90D = [
  { k: "Implants & fixation", v: 412 }, { k: "Sports medicine", v: 356 }, { k: "Arthroscopy", v: 528 },
  { k: "Power tools", v: 141 }, { k: "Arthrosamid", v: 62 }, { k: "Instruments", v: 23 },
];

/* ── Seed tasks, approvals and activity ─────────────────────────────────── */

export type TaskStatus = "Not started" | "In progress" | "Waiting" | "Done";
export type Task = {
  id: string; title: string; owner: StaffId; due: string; dueTime?: string; priority: "High" | "Medium" | "Low"; dept: string;
  related?: { type: string; id: string; label: string }; status: TaskStatus; createdBy?: string; note?: string;
};
export const TASKS: Task[] = [
  { id: "T-101", title: "Finish scans for SO-1047", owner: "SO", due: "2026-11-19", dueTime: "15:00", priority: "High", dept: "Orders", related: { type: "order", id: "SO-1047", label: "SO-1047 · South Dublin Surgical Centre" }, status: "In progress", note: "Two lines left: Arthrosamid pack (lot) and battery pack (serial)." },
  { id: "T-102", title: "Resolve BILL-2034 quantity discrepancy", owner: "MD", due: "2026-11-21", priority: "High", dept: "Finance", related: { type: "bill", id: "BILL-2034", label: "BILL-2034 · Aquila Sports Medicine" }, status: "Not started" },
  { id: "T-103", title: "Follow up Pinewood Orthopaedics", owner: "AC", due: "2026-11-12", priority: "High", dept: "Sales", related: { type: "opp", id: "OPP-301", label: "OPP-301 · €16,800" }, status: "Not started", note: "Last activity 31 Oct." },
  { id: "T-104", title: "Approve Harbour stock transfer", owner: "JC", due: "2026-11-19", priority: "High", dept: "Operations", related: { type: "product", id: "HH-OR-204", label: "HH-OR-204 · Harbour replenishment" }, status: "Waiting", note: "Waiting for the transfer request to be raised." },
  { id: "T-105", title: "Review next week's sales priorities", owner: "GH", due: "2026-11-20", priority: "Medium", dept: "Management", related: { type: "page", id: "Sales:planner", label: "Weekly planner · w/c 23 Nov" }, status: "Not started" },
  { id: "T-106", title: "Chase INV-6128 with Harbour accounts", owner: "MD", due: "2026-11-19", priority: "High", dept: "Finance", related: { type: "invoice", id: "INV-6128", label: "INV-6128 · €8,750 · 21 days overdue" }, status: "Not started" },
  { id: "T-107", title: "Book courier for SO-1025 to SO-1028", owner: "SO", due: "2026-11-19", dueTime: "12:00", priority: "Medium", dept: "Orders", related: { type: "page", id: "Orders:dispatch", label: "Dispatch board" }, status: "In progress" },
  { id: "T-108", title: "Prepare ACL loan set for Liffey", owner: "JC", due: "2026-11-23", priority: "Medium", dept: "Operations", related: { type: "loanset", id: "LS-01", label: "LS-01 · procedure 24 Nov" }, status: "Not started" },
  { id: "T-109", title: "Prepare N1-018 for RN-0208 dispatch", owner: "JC", due: "2026-11-19", priority: "Medium", dept: "Rentals", related: { type: "booking", id: "RN-0208", label: "RN-0208 · starts 20 Nov" }, status: "In progress" },
  { id: "T-110", title: "Chase quote QT-2207 with Lakeside", owner: "RW", due: "2026-11-18", priority: "High", dept: "Sales", related: { type: "opp", id: "OPP-303", label: "OPP-303 · €13,400" }, status: "Not started" },
  { id: "T-111", title: "Book Kingsbridge clinic lead meeting", owner: "CB", due: "2026-11-13", priority: "High", dept: "Sales", related: { type: "opp", id: "OPP-304", label: "OPP-304 · €9,400" }, status: "Not started" },
  { id: "T-112", title: "Send revised service terms to Cedarview", owner: "ET", due: "2026-11-20", priority: "Medium", dept: "Sales", related: { type: "opp", id: "OPP-302", label: "OPP-302 · €19,800" }, status: "In progress" },
  { id: "T-113", title: "Bank reconciliation: 6 lines unresolved", owner: "MD", due: "2026-11-20", priority: "Medium", dept: "Finance", related: { type: "page", id: "Finance:recon", label: "Reconciliation queue" }, status: "In progress" },
  { id: "T-114", title: "Process return RMA-0086 from Eastgate", owner: "SO", due: "2026-11-20", priority: "Low", dept: "Orders", related: { type: "return", id: "RMA-0086", label: "RMA-0086 · 6 × HH-OR-201" }, status: "Not started" },
  { id: "T-115", title: "Approve PO-341 to Halcyon", owner: "GH", due: "2026-11-19", priority: "Medium", dept: "Purchasing", related: { type: "po", id: "PO-341", label: "PO-341 · Halcyon Orthopaedics" }, status: "Not started" },
  { id: "T-116", title: "Resolve Eastgate count variance", owner: "JC", due: "2026-11-21", priority: "Medium", dept: "Inventory", related: { type: "product", id: "HH-SM-114", label: "HH-SM-114 · Eastgate" }, status: "Not started" },
  { id: "T-117", title: "Chase Nordfix for missing declarations of conformity", owner: "JC", due: "2026-11-24", priority: "Medium", dept: "Compliance", related: { type: "doc", id: "QD-010", label: "QX-031 · 2 SKUs" }, status: "Waiting" },
  { id: "T-118", title: "Approve RN-0203 extension request", owner: "JC", due: "2026-11-19", priority: "Low", dept: "Rentals", related: { type: "booking", id: "RN-0203", label: "RN-0203 · +1 week" }, status: "Not started" },
  { id: "T-119", title: "Weekly usage report for Blackrock", owner: "RW", due: "2026-11-25", priority: "Low", dept: "Sales", related: { type: "account", id: "A-BLK", label: "Blackrock Orthopaedic Practice" }, status: "Not started" },
  { id: "T-120", title: "VAT return: October", owner: "MD", due: "2026-11-17", priority: "Medium", dept: "Finance", status: "Done" },
];

export type ApprovalStatus = "Awaiting" | "Approved" | "Rejected";
export type Approval = {
  id: string; kind: "Stock transfer" | "Purchase order" | "Credit note" | "Bill resolution" | "Discount" | "Weekly plan" | "Rental extension";
  title: string; requestedBy: string; approver: StaffId; value?: number; raised: string; status: ApprovalStatus;
  ref: { type: string; id: string }; detail: string; decidedAt?: string; decidedBy?: string;
};
export const APPROVALS: Approval[] = [
  { id: "AP-71", kind: "Purchase order", title: "PO-341 to Halcyon Orthopaedics", requestedBy: "SO", approver: "GH", value: 0, raised: "2026-11-18", status: "Awaiting", ref: { type: "po", id: "PO-341" }, detail: "Restock of three fast-moving fixation lines. Over the €5,000 sign-off threshold." },
  { id: "AP-72", kind: "Credit note", title: "CN-0088 for Eastgate return RMA-0086", requestedBy: "SO", approver: "GH", value: 0, raised: "2026-11-16", status: "Awaiting", ref: { type: "return", id: "RMA-0086" }, detail: "Six unused screws from a cancelled case list. Packaging intact." },
  { id: "AP-73", kind: "Discount", title: "8% volume discount on QT-2207 (Lakeside)", requestedBy: "RW", approver: "GH", value: 1070, raised: "2026-11-17", status: "Awaiting", ref: { type: "opp", id: "OPP-303" }, detail: "Asked for to match a competitor quote. Margin after discount 31.2%." },
  { id: "AP-74", kind: "Rental extension", title: "RN-0203 extension: one more week", requestedBy: "AC", approver: "JC", value: 100, raised: "2026-11-18", status: "Awaiting", ref: { type: "booking", id: "RN-0203" }, detail: "Customer asked for one more week. No conflicting booking on N1-011." },
  { id: "AP-69", kind: "Purchase order", title: "PO-339 to Arthrosamid supply partner", requestedBy: "SO", approver: "GH", value: 0, raised: "2026-11-12", status: "Approved", ref: { type: "po", id: "PO-339" }, detail: "Standard monthly order.", decidedAt: "2026-11-12 11:04", decidedBy: "GH" },
];

export type HEvent = {
  id: string; date: string; time: string; stream: "data" | "people" | "ai"; actor: string; title: string; note: string;
  ref?: string; refType?: string; status: "completed" | "awaiting" | "working" | "failed"; demo?: boolean;
};
export const SEED_EVENTS: HEvent[] = [
  { id: "E-001", date: TODAY, time: "07:02", stream: "ai", actor: "Briefing Agent", title: "Posted the morning briefing", note: "Three things need attention: Harbour stock, SO-1047 scans and seven overdue follow-ups.", status: "completed" },
  { id: "E-002", date: TODAY, time: "06:00", stream: "ai", actor: "Stock & Traceability Agent", title: "Harbour below par level for HH-OR-204", note: "4 on hand against a minimum of 6. Suggests 3 from the main stockroom (lot L2609-204B).", ref: "HH-OR-204", refType: "product", status: "awaiting" },
  { id: "E-003", date: TODAY, time: "06:12", stream: "data", actor: "ERP sync (demo)", title: "Overnight order import", note: "34 open sales orders read from the current ERP. Demo activity: connection not yet verified.", status: "completed", demo: true },
  { id: "E-004", date: TODAY, time: "08:41", stream: "people", actor: "Sharon O'Mongain", title: "Scanned 3 of 5 lines on SO-1047", note: "Arthrosamid pack and battery pack still to validate.", ref: "SO-1047", refType: "order", status: "working" },
  { id: "E-005", date: TODAY, time: "08:15", stream: "ai", actor: "Sales Agent", title: "Flagged 7 overdue follow-ups", note: "Largest: Pinewood Orthopaedics, €16,800, quiet for 19 days.", ref: "OPP-301", refType: "opp", status: "awaiting" },
  { id: "E-006", date: TODAY, time: "08:30", stream: "ai", actor: "Finance Agent", title: "12 invoices overdue, €23,800", note: "INV-6128 (Harbour, €8,750) is the largest at 21 days.", ref: "INV-6128", refType: "invoice", status: "awaiting" },
  { id: "E-007", date: TODAY, time: "09:05", stream: "ai", actor: "Purchasing Agent", title: "BILL-2034 does not match PO-337", note: "Billed 14 units, ordered and received 12. Drafted an investigation task for Margaret. Nothing posted.", ref: "BILL-2034", refType: "bill", status: "awaiting" },
  { id: "E-008", date: TODAY, time: "09:12", stream: "people", actor: "Aileen Cahalane", title: "Completed: Review Harbour account", note: "Par levels for the new fixation range, and INV-6128 raised with the clinic.", ref: "A-HAR", refType: "account", status: "completed" },
  { id: "E-009", date: TODAY, time: "09:20", stream: "data", actor: "Bank feed (demo)", title: "14 bank lines imported", note: "6 suggested matches. Demo activity: bank feed not yet verified.", status: "completed", demo: true },
  { id: "E-010", date: TODAY, time: "09:48", stream: "people", actor: "John Culkin", title: "Booked LS-08 to Atlantic", note: "Knee arthroscopy set dispatched for a procedure on 20 Nov.", ref: "LS-08", refType: "loanset", status: "completed" },
  { id: "E-011", date: TODAY, time: "10:02", stream: "ai", actor: "Order Flow Agent", title: "4 orders packed with no courier", note: "SO-1025 to SO-1028 waiting since yesterday. Suggests the 12:00 collection.", status: "awaiting" },
  { id: "E-012", date: TODAY, time: "10:20", stream: "people", actor: "Margaret Duff", title: "Matched 4 bank lines", note: "Payroll, software and two supplier payments.", status: "completed" },
  { id: "E-013", date: TODAY, time: "10:34", stream: "ai", actor: "Quality & Compliance Agent", title: "CE certificate expiring in 50 days", note: "Polaris consumables certificate expires 8 Jan. Renewal requested; needs a person to confirm.", ref: "QD-009", refType: "doc", status: "awaiting" },
  { id: "E-014", date: TODAY, time: "11:05", stream: "people", actor: "Rory Whelan", title: "Logged theatre support at Eastgate", note: "Ankle fixation case. Two HH-OR-238 used; usage order to follow.", ref: "A-EAS", refType: "account", status: "completed" },
  { id: "E-015", date: TODAY, time: "11:30", stream: "data", actor: "nice1.ie (not connected)", title: "Rental enquiry logged by hand", note: "RN-0209 for 25 Nov. Website booking integration is a future concept.", ref: "RN-0209", refType: "booking", status: "completed", demo: true },
  { id: "E-016", date: TODAY, time: "11:52", stream: "ai", actor: "Ops Watchdog", title: "SO-1047 at risk of missing today's courier", note: "Two scans outstanding. Courier cut-off 16:00.", ref: "SO-1047", refType: "order", status: "awaiting" },
  { id: "E-017", date: TODAY, time: "12:10", stream: "people", actor: "Clodagh Byrne", title: "Moved Atlantic quote to 'awaiting response'", note: "QT-2209, €2,500.", ref: "OPP-324", refType: "opp", status: "completed" },
  { id: "E-018", date: TODAY, time: "12:40", stream: "people", actor: "Eoin Tierney", title: "Logged Cedarview procurement call", note: "Revised service terms promised for Friday.", ref: "OPP-302", refType: "opp", status: "completed" },
  { id: "E-019", date: "2026-11-18", time: "16:48", stream: "people", actor: "Sharon O'Mongain", title: "Created SO-1047", note: "South Dublin Surgical Centre, 5 lines, €4,124.", ref: "SO-1047", refType: "order", status: "completed" },
  { id: "E-020", date: "2026-11-18", time: "15:02", stream: "people", actor: "John Culkin", title: "Cleaned and inspected N1-014", note: "Back from RN-0201. Available for hire.", ref: "N1-014", refType: "rental", status: "completed" },
];
