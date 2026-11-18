/* Pulse template data, re-skinned for Hogan Healthcare OS (fictional demo content). */

const INK="var(--ink)", BODY="var(--body)", DIM="var(--dim)", FAINT="var(--faint)";
const LIME="var(--accent)", GREEN="var(--ok)", AMBER="var(--warn)", RED="var(--bad)", NEUTRAL="var(--neutral)";
const MONO="var(--mono)";

const ICONS = {
  navHome:"M12 3.2 3.6 9.1v10a1.5 1.5 0 0 0 1.5 1.5h13.8a1.5 1.5 0 0 0 1.5-1.5v-10L12 3.2Z M8.9 13.1h2l1-2.6 1.5 5 1.1-2.4h1.6",
  navAgents:"M12 2.4v2.3 M12 2.4a.9.9 0 1 0 0-.02 M8.2 6.5h7.6A2.2 2.2 0 0 1 18 8.7v5.1a2.2 2.2 0 0 1-2.2 2.2H8.2A2.2 2.2 0 0 1 6 13.8V8.7a2.2 2.2 0 0 1 2.2-2.2Z M9.9 10.6v1.4 M14.1 10.6v1.4 M6 10h-1.9 M18 10h1.9 M9.2 18.6h5.6 M9.2 21.2h5.6",
  navDash:"M4 5.6h7.2v5.1H4V5.6Z M13.6 5.6H20v8.6h-6.4V5.6Z M4 13.1h7.2v5.3H4v-5.3Z M13.6 16.6H20v1.8h-6.4v-1.8Z",
  navWork:"M9.4 4.4h5.2a1.4 1.4 0 0 1 1.4 1.4v1.1h2.4A1.6 1.6 0 0 1 20 8.5v9.1a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 17.6V8.5a1.6 1.6 0 0 1 1.6-1.6H8V5.8a1.4 1.4 0 0 1 1.4-1.4Z M8 6.9h8 M9.6 13.3l1.8 1.8 3.4-3.6",
  navRecords:"M12 3.6c3.9 0 7 1.1 7 2.5S15.9 8.6 12 8.6 5 7.5 5 6.1 8.1 3.6 12 3.6Z M5 6.1v5.7c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6.1 M5 11.8v5.7c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-5.7",
  navActivity:"M4.6 4.6h14.8A1.6 1.6 0 0 1 21 6.2v11.6a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 17.8V6.2a1.6 1.6 0 0 1 1.6-1.6Z M6 12.4h2.2l1.5-4.1 2.3 8 1.9-5.4 1.2 1.5H18",
  navAdmin:"M12 2.9 5 5.6v5.9c0 4 2.8 7.1 7 8.6 4.2-1.5 7-4.6 7-8.6V5.6L12 2.9Z M12 8.6a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z M8.8 16.3a3.6 3.6 0 0 1 6.4 0",
  helios:"M21 11.5a8.4 8.4 0 0 1-9 8.4 9.9 9.9 0 0 1-4-.8L3 21l1.9-4.9A8.3 8.3 0 0 1 4 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z M8 12h1.6l1.2-2.6 1.6 5 1.4-2.4H16",
  inbox:"M3 13h4l1.5 3h7l1.5-3h4 M3 13l2.4-7A2 2 0 0 1 7.3 4.6h9.4a2 2 0 0 1 1.9 1.4L21 13v4.4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V13Z",
  work:"M6 4.6h12a1.6 1.6 0 0 1 1.6 1.6v12.2A1.6 1.6 0 0 1 18 20H6a1.6 1.6 0 0 1-1.6-1.6V6.2A1.6 1.6 0 0 1 6 4.6Z M8.4 10.4l1.9 1.9 3.9-3.9 M8.4 15.6h7.2",
  approvals:"M12 3.6 19.5 6v6.1c0 4-3.1 6.9-7.5 8.3-4.4-1.4-7.5-4.3-7.5-8.3V6L12 3.6Z M9.2 12.2l2 2 3.6-3.7",
  insights:"M4.5 19.5V13 M9.7 19.5V7.5 M14.9 19.5v-8 M20 19.5V5",
  people:"M12 12.5a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z M5 20.2c.9-3.1 3.6-4.9 7-4.9s6.1 1.8 7 4.9",
  orgs:"M4.5 20V6.4A1.4 1.4 0 0 1 5.9 5h6.2a1.4 1.4 0 0 1 1.4 1.4V20 M13.5 10.5h4.6A1.4 1.4 0 0 1 19.5 12v8 M3 20h18 M7.5 8.5h2.5 M7.5 12h2.5 M7.5 15.5h2.5",
  teams:"M9 12a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 12Z M16.5 12.5a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z M2.6 19.6c.8-2.8 3.2-4.4 6.4-4.4s5.6 1.6 6.4 4.4 M17 15.4c2.2.4 3.7 1.8 4.3 4.2",
  locations:"M12 21s6.5-5.6 6.5-11a6.5 6.5 0 1 0-13 0C5.5 15.4 12 21 12 21Z M12 12.8a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z",
  visits:"M8 4v3 M16 4v3 M4.5 9.5h15 M6.4 6h11.2A1.9 1.9 0 0 1 19.5 8v10a1.9 1.9 0 0 1-1.9 1.9H6.4A1.9 1.9 0 0 1 4.5 18V8A1.9 1.9 0 0 1 6.4 6Z M9 13.5l1.6 1.6 3.4-3.4",
  autos:"M18.5 8.5A5 5 0 0 0 8.9 7.3 3.8 3.8 0 0 0 6 14.6 M8 17.5l3.2 3.2 M11.2 20.7l3.2-3.2 M11.2 20.7V9.6",
  health:"M3 12.5h3.4l2-5 3 10 2.2-5H21",
  modules:"M6.6 4.4h10.8a2.2 2.2 0 0 1 2.2 2.2v10.8a2.2 2.2 0 0 1-2.2 2.2H6.6a2.2 2.2 0 0 1-2.2-2.2V6.6a2.2 2.2 0 0 1 2.2-2.2Z M4.4 9.6h15.2 M9.6 19.6V9.6",
  agents:"M8.5 3.6h7A2.4 2.4 0 0 1 17.9 6v5.6a2.4 2.4 0 0 1-2.4 2.4h-7A2.4 2.4 0 0 1 6.1 11.6V6a2.4 2.4 0 0 1 2.4-2.4Z M9.6 8.2h.01 M14.4 8.2h.01 M12 14v2.6 M7.6 20.4h8.8 M12 16.6c-2.4 0-4.4 1.7-4.4 3.8h8.8c0-2.1-2-3.8-4.4-3.8Z",
  dash:"M4.4 4.4h6v6h-6v-6Z M13.6 4.4h6v3.6h-6V4.4Z M13.6 11.6h6v8h-6v-8Z M4.4 14h6v5.6h-6V14Z",
  files:"M5 7.2a1.8 1.8 0 0 1 1.8-1.8h3l1.8 2.2h5.6A1.8 1.8 0 0 1 19 9.4v7.4a1.8 1.8 0 0 1-1.8 1.8H6.8A1.8 1.8 0 0 1 5 16.8V7.2Z",
  pulseLine:"M2.5 12.5h3.6l2.1-6.4 3.2 12.2 2.6-8.4 1.8 2.6h5.7",
  records:"M6.4 3.6h7.4l4.2 4.2v12.6H6.4V3.6Z M13.4 3.8v4.2h4.2 M9 12.4h6 M9 16h4",
  tree:"M4.5 6h5 M4.5 12h5 M4.5 18h5 M12.5 6h7 M12.5 12h7 M12.5 18h7",
  graph:"M7 7.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z M17.6 10.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z M9.4 21.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z M8.6 6.4l7.6 2.6 M15.8 11.4l-5.6 5.2",
  bell:"M6 8.5a6 6 0 0 1 12 0c0 6.5 2.6 8.5 2.6 8.5H3.4S6 15 6 8.5Z M10.3 20.5a1.94 1.94 0 0 0 3.4 0",
  navSales:"M3.5 17.5l5.5-5.5 4 4 7.5-7.5 M15 8.5h5.5V14",
  navOrders:"M9 4.5h6a1 1 0 0 1 1 1V7H8V5.5a1 1 0 0 1 1-1Z M8 6H6.5A1.5 1.5 0 0 0 5 7.5v11A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 17.5 6H16 M8.5 13.2l2.2 2.2 4.8-4.8",
  navInventory:"M12 3.2 4.2 7.1v9.8L12 20.8l7.8-3.9V7.1L12 3.2Z M4.2 7.1 12 11l7.8-3.9 M12 11v9.8 M8.1 5.15l7.8 3.9",
  navPurchasing:"M3 6.5h11v9H3z M14 9.5h3.6l3.4 3.4v2.6h-7 M7 18.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z M17.5 18.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z",
  navFinance:"M17.5 6.6A6.6 6.6 0 0 0 7 12a6.6 6.6 0 0 0 10.5 5.4 M4.5 10.2h8 M4.5 13.8h8",
  navCompliance:"M12 3.6 19.5 6v6.1c0 4-3.1 6.9-7.5 8.3-4.4-1.4-7.5-4.3-7.5-8.3V6L12 3.6Z M9.2 12.2l2 2 3.6-3.7",
  navRentals:"M12 3v18 M4.2 7.5l15.6 9 M4.2 16.5l15.6-9 M9.5 4.5 12 7l2.5-2.5 M9.5 19.5 12 17l2.5 2.5",
  navSettings:"M5.5 20v-5.5 M5.5 9.5V4 M12 20v-7.5 M12 7.5V4 M18.5 20v-4 M18.5 11V4 M3 12.5h5 M9.5 5.5h5 M16 14h5"
};

/* Ontology stays first and is never removed (PulseLogic enforces this too). */
const REC_SECTIONS = [
  {id:"ontology", label:"Ontology", blurb:"How every record connects: entities, predicates and the paths between them."},
  {id:"files", label:"Files", blurb:"Agreements, certificates and quality documents, indexed where Pulse can read them."},
  {id:"contacts", label:"Contacts", blurb:"Every person the business deals with: staff, hospital contacts and suppliers."},
  {id:"explorer", label:"Explorer", blurb:"Follow any record to everything it touches: hospital, stock, product, lot, transfer, order."}
];

const CONTACTS = [
  ["Graham Hogan","Managing Director","Demo placeholder","Hogan Healthcare","staff","#4A9DA5"],
  ["John Culkin","Operations Director","Demo placeholder","Hogan Healthcare","staff","#9FC3D9"],
  ["Aileen Cahalane","Sales Director","Demo placeholder","Hogan Healthcare","staff","#8FC7A4"],
  ["Margaret Duff","Office Manager","Demo placeholder","Hogan Healthcare","staff","#D9C27A"],
  ["Sharon O'Mongain","Sales Administration","Demo placeholder","Hogan Healthcare","staff","#E0A98C"],
  ["Rory Whelan","Field Sales Representative","Demo placeholder","Hogan Healthcare","fictional","#B9A9D9"],
  ["Clodagh Byrne","Field Sales Representative","Demo placeholder","Hogan Healthcare","fictional","#E6B7C8"],
  ["Eoin Tierney","Field Sales Representative","Demo placeholder","Hogan Healthcare","fictional","#A9CFE8"],
  ["Orla Keane","Theatre manager","Via clinic office (demo)","Harbour Orthopaedic Clinic","customer","#7FB8C9"],
  ["Mr D. Furlong","Consultant orthopaedic surgeon","Via clinic office (demo)","Harbour Orthopaedic Clinic","customer","#7FB8C9"],
  ["Ciara Doyle","Materials manager","Via clinic office (demo)","South Dublin Surgical Centre","customer","#7FB8C9"],
  ["Niall Kearney","Clinical nurse manager","Via clinic office (demo)","Liffey Surgical Clinic","customer","#7FB8C9"],
  ["Sinéad Moran","Practice manager","Via clinic office (demo)","Eastgate Orthopaedics","customer","#7FB8C9"],
  ["Pádraig Lynch","Theatre stores","Via clinic office (demo)","Atlantic Sports Surgery","customer","#7FB8C9"],
  ["Mr K. Ruane","Consultant orthopaedic surgeon","Via clinic office (demo)","Pinewood Orthopaedics","prospect","#E0A98C"],
  ["Deirdre Coyle","Head of procurement","Via hospital office (demo)","Cedarview Private Hospital","customer","#7FB8C9"],
  ["Customer service desk","Order desk","Supplier portal (demo)","Aquila Sports Medicine","supplier","#D9C27A"],
  ["Account manager","Key account","Supplier portal (demo)","Halcyon Orthopaedics","supplier","#D9C27A"],
  ["Regional manager","Distribution","Supplier portal (demo)","CONMED","supplier","#D9C27A"]
];

const FILE_TREE = [
  {type:"folder", id:"f-agr", name:"Agreements", depth:0},
  {type:"file", id:"fl-1", name:"Harbour Orthopaedic Clinic: consignment agreement CA-2023-04.pdf", depth:1, parent:"f-agr", indexed:true,
   path:"Agreements / Consignment", title:"Consignment agreement CA-2023-04 (demo)",
   facts:[["TYPE","PDF · 8 pages"],["SIGNED","14 Apr 2023"],["INDEXED","All 8 pages"],["OWNER","Graham Hogan"]],
   body:["Stock held at Harbour Orthopaedic Clinic stays Hogan Healthcare's property until it is used. The clinic reports usage, Hogan raises a usage order and invoices it.",
     "Par levels are agreed per product and reviewed quarterly. HH-OR-204 is set at 6 units. Hogan tops the site up when it falls below par.",
     "Either side may request a full stock count on reasonable notice. Variances are investigated jointly before any adjustment. (Fictional demo document.)"],
   links:[["Harbour Orthopaedic Clinic","location"],["HH-OR-204","product"],["INV-6128","invoice"]]},
  {type:"file", id:"fl-2", name:"Distribution agreement summary: key partners.pdf", depth:1, parent:"f-agr", indexed:true,
   path:"Agreements / Suppliers", title:"Distribution agreements summary (demo)",
   facts:[["TYPE","PDF · 5 pages"],["UPDATED","2 Feb 2026"],["INDEXED","All 5 pages"],["OWNER","Graham Hogan"]],
   body:["A one-page summary per key global partner: territory, product scope, payment terms and stock obligations. Terms shown in this demo are illustrative.",
     "Every agreement requires the distributor to keep traceability records by lot and serial, and to support field safety actions and recalls when the manufacturer asks."],
   links:[["Halcyon Orthopaedics","supplier"],["Veritas Surgical","supplier"]]},
  {type:"folder", id:"f-qa", name:"Quality", depth:0},
  {type:"file", id:"fl-3", name:"SOP-QA-11 Traceability and recall drill.pdf", depth:1, parent:"f-qa", indexed:true,
   path:"Quality / SOPs", title:"SOP-QA-11 Traceability and recall drill",
   facts:[["TYPE","PDF · 6 pages"],["VERSION","v3"],["REVIEW DUE","2 Nov 2026"],["OWNER","John Culkin"]],
   body:["How to find every unit of a lot or serial within an hour: where it was received, which hospitals hold it, which were used and which organisations to contact.",
     "A drill is run twice a year on a real lot, marked as an exercise. The review of this SOP is overdue; the Quality & Compliance Agent has flagged it."],
   links:[["HH-OR-204","product"],["Simulated traceability drill","drill"]]},
  {type:"file", id:"fl-4", name:"CE certificate: Polaris power consumables.pdf", depth:1, parent:"f-qa", indexed:false,
   path:"Quality / Certificates", title:"CE certificate: Polaris power consumables (demo ref.)",
   facts:[["TYPE","PDF · 2 pages"],["EXPIRES","8 Jan 2027"],["INDEXED","Not indexed"],["OWNER","John Culkin"]],
   body:["Supplier copy of the notified body certificate for saw blades and burrs. Not indexed, so Pulse cannot answer questions from it yet.",
     "A renewed certificate has been requested. Indexing it would let the register check certificate dates automatically."],
   links:[["Polaris Surgical Power","supplier"],["QX-036","exception"]]},
  {type:"folder", id:"f-fin", name:"Finance", depth:0},
  {type:"file", id:"fl-5", name:"BILL-2034 Aquila Sports Medicine.pdf", depth:1, parent:"f-fin", indexed:true,
   path:"Finance / Supplier bills", title:"BILL-2034 (demo)",
   facts:[["TYPE","PDF · 1 page"],["VALUE","€4,280"],["DATED","14 Nov 2026"],["OWNER","Margaret Duff"]],
   body:["Bills 14 knotless suture anchors (HH-SM-140) at €290 plus €220 freight against PO-337.",
     "PO-337 ordered 12 and GRN-0419 received 12, so the invoice is on hold pending a credit note for the two units not delivered."],
   links:[["PO-337","po"],["GRN-0419","grn"],["Aquila Sports Medicine","supplier"]]},
  {type:"file", id:"fl-6", name:"Month-end pack: October.xlsx", depth:1, parent:"f-fin", indexed:false,
   path:"Finance / Close", title:"Month-end pack: October (demo)",
   facts:[["TYPE","XLSX · 7 sheets"],["ADDED","4 Nov 2026"],["INDEXED","Not indexed"],["OWNER","Margaret Duff"]],
   body:["The working file behind the October close. Spreadsheets are stored but not indexed by default.",
     "In production, the numbers Pulse quotes would come from the accounting integration, which is not yet verified for this demo."],
   links:[["Finance","area"]]},
  {type:"folder", id:"f-rent", name:"NICE1 rentals", depth:0},
  {type:"file", id:"fl-7", name:"NICE1 rental terms and published pricing.pdf", depth:1, parent:"f-rent", indexed:true,
   path:"NICE1 rentals", title:"NICE1 rental terms (reference)",
   facts:[["TYPE","PDF · 3 pages"],["UPDATED","Sep 2026"],["INDEXED","All 3 pages"],["OWNER","John Culkin"]],
   body:["Published pricing used as a reference in this demo: system only for the first two weeks €300, system with therapy wrap €400, each extra week €100.",
     "Customers are recorded by reference number only. No clinical or patient details are held in Pulse."],
   links:[["RN-0208","booking"],["N1-018","rental"]]}
];

const ONTO_NODES = [
  ["Product","entity",500,300,1,"Every device the business distributes: SKU, GTIN / UDI-DI, supplier, class and documents."],
  ["Hospital / account","entity",300,190,1,"Hospitals, clinics and practices, with their contacts, consignment site and ledger balance."],
  ["Location","entity",700,190,1,"The main stockroom and the eight hospital consignment sites. Stock is held per location."],
  ["Lot / serial","entity",250,430,1,"UDI-PI: lot, batch, serial and expiry. The unit of traceability."],
  ["Stock movement","entity",690,430,1,"Receipts, transfers, use, dispatch and returns. Each one links to its order and money."],
  ["Approval","entity",850,320,0,"Transfers, purchase orders, credit notes and bill holds. Always decided by a named person."],
  ["Invoice","ledger",390,95,0,"Customer invoices and supplier bills, read from accounting (integration not yet verified)."],
  ["Order","ledger",620,95,0,"Sales orders and purchase orders, linked to the account or supplier that raised them."],
  ["Rental","module",860,470,0,"NICE1 devices and bookings, contributed by the rentals module."],
  ["Document","entity",140,300,0,"CE certificates, declarations of conformity, IFUs and SOPs against any record."],
  ["held at","predicate",395,240,0,"Lot / serial → Location."],
  ["supplied by","predicate",605,240,0,"Product → Supplier."],
  ["moved by","predicate",360,370,0,"Lot / serial → Stock movement."],
  ["fulfils","predicate",600,370,0,"Stock movement → Order."],
  ["evidenced by","predicate",140,372,0,"Document → Product."]
];

const ONTO_EDGES = [
  [500,300,300,190],[500,300,700,190],[500,300,250,430],[500,300,690,430],
  [500,300,850,320],[500,300,390,95],[500,300,620,95],[500,300,140,300],
  [300,190,250,430],[700,190,860,470],[690,430,850,320],[690,430,860,470],
  [300,190,140,300],[390,95,620,95]
];

const REC_TEMPLATES = [
  ["Field sheet","Records","Labelled fields in a grid: the default for a person, organisation or location.",
   "M5 5.5h14v13H5v-13Z M5 10h14 M12 10v8.5","grid"],
  ["Contact card","Records","A portrait, key fields and every linked record in one compact panel.",
   "M12 11.5a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Z M5.5 19c.8-3 3.3-4.7 6.5-4.7s5.7 1.7 6.5 4.7","card"],
  ["Directory","Records","A sortable table of many records at once, built for lists.",
   "M4.5 6.5h15 M4.5 12h15 M4.5 17.5h15 M4.5 6.5h.01 M4.5 12h.01 M4.5 17.5h.01","rows"],
  ["Timeline","Case work","Ordered events with who did what and when. Good for a case or a claim.",
   "M12 3.5v17 M12 7.5h6 M12 13h-6 M12 18h6","timeline"],
  ["Kanban board","Case work","Cards in columns by status. For anything that moves through stages.",
   "M5 5h4.5v14H5V5Z M9.75 5h4.5v9h-4.5V5Z M14.5 5H19v6h-4.5V5Z","kanban"],
  ["Checklist","Case work","Ticked steps in order, with an owner and a due date on each.",
   "M5 6.5h2l1.4 1.4L11 5.5 M5 12.5h2l1.4 1.4 2.6-2.4 M5 18.5h2l1.4 1.4 2.6-2.4 M15 6.5h4 M15 12.5h4 M15 18.5h4","checklist"],
  ["Ledger","Finance","Rows and running totals. For anything with amounts and dates.",
   "M4 6h16 M4 12h16 M4 18h16 M9 3.5v17","ledger"],
  ["Invoice","Finance","Line items, totals and a status, built to be sent, not just stored.",
   "M7 3.5h10v17H7v-17Z M9.5 8h5 M9.5 11.5h5 M9.5 15h3","invoice"],
  ["Document","Notes","Long-form text with linked records pulled out down the side.",
   "M7 3.5h7l5 5v12H7v-17Z M14 3.7v5h5 M10 13h6 M10 16.5h4","document"],
  ["Gallery","Notes","A wall of images and files with a caption on each, for a site or a job.",
   "M4.5 6h6v6h-6V6Z M13.5 6h6v6h-6V6Z M4.5 14h6v4h-6v-4Z M13.5 14h6v4h-6v-4Z","gallery"],
  ["Map & locations","Ops","A pinboard of places, with the record's fields beside each pin.",
   "M12 21s6.5-5.6 6.5-11a6.5 6.5 0 1 0-13 0C5.5 15.4 12 21 12 21Z M12 12.8a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z","map"],
  ["Schedule","Ops","A calendar of bookings against this record, with recurring rules.",
   "M8 4v3 M16 4v3 M4.5 9.5h15 M6.4 6h11.2A1.9 1.9 0 0 1 19.5 8v10a1.9 1.9 0 0 1-1.9 1.9H6.4A1.9 1.9 0 0 1 4.5 18V8A1.9 1.9 0 0 1 6.4 6Z","schedule"]
];
const REC_TEMPLATE_CATS = ["All","Records","Case work","Finance","Notes","Ops"];

/* ---- admin hub ---- */
/* ---- admin hub: 13 settings areas in five groups ---- */
const PEOPLE = [
  ["Graham Hogan","Managing Director","Demo placeholder","Dún Laoghaire","active","Admin","Now"],
  ["John Culkin","Operations Director","Demo placeholder","Dún Laoghaire","active","Manager","12 min ago"],
  ["Aileen Cahalane","Sales Director","Demo placeholder","Field","active","Manager","9 min ago"],
  ["Margaret Duff","Office Manager","Demo placeholder","Dún Laoghaire","active","Manager","4 min ago"],
  ["Sharon O'Mongain","Sales Administration","Demo placeholder","Dún Laoghaire","active","Standard","2 min ago"],
  ["Rory Whelan (fictional)","Field Sales Representative","Demo placeholder","Field","active","Standard","1 h ago"],
  ["Clodagh Byrne (fictional)","Field Sales Representative","Demo placeholder","Field","active","Standard","38 min ago"],
  ["Eoin Tierney (fictional)","Field Sales Representative","Demo placeholder","Field","active","Standard","2 h ago"]
];
const ROLE_LEVELS = ["Admin","Manager","Standard","External"];
const PERM_KEYS = [["view","View records"],["edit","Edit records"],["approve","Approve payments"]];
const GRANT_DEFS = [
  ["view","View records","Read anything in scope"],
  ["edit","Edit records","Create and change records"],
  ["approve","Approve decisions","Say yes to parked work"],
  ["pay","Release payments","Send money out"],
  ["export","Export data","Download and share out"],
  ["agents","Manage agents","Create and grant agents"],
  ["settings","Change settings","Modules, roles, integrations"],
  ["audit","Read the audit log","Every action, everyone"]
];
const ROLE_SCOPES = ["All records","Their location","Assigned only"];
const DEFAULT_PERMS = {Admin:{view:true,edit:true,approve:true}, Manager:{view:true,edit:true,approve:true},
  Standard:{view:true,edit:true,approve:false}, External:{view:true,edit:false,approve:false}};
const INTEGRATIONS = [
  {name:"Current ERP", blurb:"Probably Enterpryze (to confirm). Pulse would sit above it and read orders, customers, products, stock movements and invoices. Nothing in the ERP is replaced or written to in this demo.", tint:"#9FB5D9", status:"demo · to verify", statusKind:"warn",
   glyph:"M4.5 7.5c0-1.7 3.4-3 7.5-3s7.5 1.3 7.5 3-3.4 3-7.5 3-7.5-1.3-7.5-3Z M4.5 7.5v9c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-9 M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3",
   lastSync:"Demo data only", usage:"Potential data: orders, customers, products, stock movements, invoices", auth:"To confirm in discovery", scopes:["Read (planned)"]},
  {name:"Xero", blurb:"Accounting. Introduced at the request of a financial partner. Would supply AP, AR, bank feeds and financial performance. Current connection status to confirm.", tint:"#13b5ea", status:"to confirm", statusKind:"warn",
   glyph:"M4.5 12a7.5 7.5 0 0 1 12.8-5.3 M19.5 12a7.5 7.5 0 0 1-12.8 5.3 M17.3 4v3.3h-3.3 M6.7 20v-3.3H10",
   lastSync:"Not connected in this demo", usage:"Potential data: AP, AR, bank feeds, financial performance", auth:"OAuth 2.0 (planned)", scopes:["Read (planned)"]},
  {name:"Bank feed", blurb:"The feed today is incomplete. In the demo, bank lines are sample data so reconciliation can be shown. Not yet verified.", tint:"#D9C27A", status:"not verified", statusKind:"warn",
   glyph:"M4 10h16 M5 10v8 M9.5 10v8 M14.5 10v8 M19 10v8 M3.5 20h17 M12 3.5 3.5 8h17L12 3.5Z",
   lastSync:"Sample lines, 18 Nov", usage:"Potential data: bank transactions for matching", auth:"Via accounting (to confirm)", scopes:[]},
  {name:"nice1.ie", blurb:"The existing public NICE1 rental website. Online booking into Pulse is a future concept; enquiries are entered by hand in this demo.", tint:"#B9A9D9", status:"not connected", statusKind:"off",
   glyph:"M12 3v18 M4.2 7.5l15.6 9 M4.2 16.5l15.6-9",
   lastSync:"n/a", usage:"Future: booking requests and availability", auth:"n/a", scopes:[]},
  {name:"Email and calendar", blurb:"Generic placeholder for a future connection so visits and follow-ups land in each person's calendar. Provider unconfirmed.", tint:"#E0A98C", status:"not connected", statusKind:"off",
   glyph:"M4 7.2 12 13 20 7.2 M4 7.2v10.6h16V7.2 M4 7.2 8.5 4h7L20 7.2",
   lastSync:"n/a", usage:"Future: meetings, follow-ups, reminders", auth:"n/a", scopes:[]},
  {name:"Barcode scanners (GS1)", blurb:"Proposed handheld scanning for receiving, picking, transfers and counts. Simulated in this demo with sample GS1 barcodes.", tint:"#8FC7A4", status:"simulated", statusKind:"warn",
   glyph:"M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8 M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8 M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16 M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16 M7 8v8 M10 8v8 M13 8v8 M16.5 8v8",
   lastSync:"Demo session", usage:"Lot, serial, expiry and GTIN / UDI-DI capture", auth:"n/a", scopes:["Demo"]},
  {name:"Previous systems", blurb:"Sage, QuickBooks and Surf were used historically. They are listed for context only; none is connected or needed.", tint:"#7f939d", status:"historical", statusKind:"off",
   glyph:"M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7.6V12l3 1.8",
   lastSync:"n/a", usage:"History only", auth:"n/a", scopes:[]}
];

/* Background catalogue. Each entry is pure CSS so a tile is the real thing at
   thumbnail size, not a picture of it. */
const BG_DEFS = [
  {id:"bloom", name:"Bloom", cat:"Signature",
   css:"background:radial-gradient(60% 48% at 50% 34%, var(--accent-faint), transparent 72%), radial-gradient(44% 38% at 16% 84%, rgba(255,255,255,.05), transparent 70%)",
   thumb:"background:radial-gradient(62% 58% at 46% 34%, var(--accent-soft), transparent 74%), radial-gradient(50% 46% at 82% 84%, rgba(255,255,255,.08), transparent 72%), var(--surface-2)"},
  {id:"mist", name:"Mist", cat:"Signature",
   css:"background:radial-gradient(52% 44% at 24% 22%, rgba(255,255,255,.07), transparent 70%), radial-gradient(56% 46% at 80% 76%, rgba(255,255,255,.05), transparent 72%)",
   thumb:"background:radial-gradient(58% 52% at 24% 22%, rgba(255,255,255,.16), transparent 72%), radial-gradient(60% 54% at 82% 78%, rgba(255,255,255,.10), transparent 74%), var(--surface-2)"},
  {id:"grid", name:"Grid", cat:"Signature",
   css:"background-image:linear-gradient(var(--border) 1px, transparent 1px),linear-gradient(90deg, var(--border) 1px, transparent 1px);background-size:56px 56px;mask-image:radial-gradient(62% 56% at 50% 46%, #000, transparent 78%);-webkit-mask-image:radial-gradient(62% 56% at 50% 46%, #000, transparent 78%)",
   thumb:"background-color:var(--surface-2);background-image:linear-gradient(var(--border-strong) 1px, transparent 1px),linear-gradient(90deg, var(--border-strong) 1px, transparent 1px);background-size:14px 14px"},
  {id:"none", name:"None", cat:"Signature", css:"", thumb:"background:var(--surface-2)"},

  {id:"aurora", name:"Aurora", cat:"Gradient",
   css:"background:radial-gradient(70% 52% at 18% 8%, var(--bloom-a), transparent 66%), radial-gradient(64% 48% at 84% 22%, var(--bloom-b), transparent 68%), radial-gradient(70% 60% at 50% 104%, var(--bloom-c), transparent 70%);filter:blur(24px)",
   thumb:"background:radial-gradient(72% 60% at 16% 6%, var(--bloom-a), transparent 68%), radial-gradient(66% 54% at 86% 24%, var(--bloom-b), transparent 70%), radial-gradient(74% 66% at 50% 108%, var(--bloom-c), transparent 72%), var(--surface-2)"},
  {id:"horizon", name:"Horizon", cat:"Gradient",
   css:"background:linear-gradient(180deg, transparent 0%, var(--accent-faint) 58%, transparent 100%), radial-gradient(90% 40% at 50% 72%, var(--accent-soft), transparent 70%)",
   thumb:"background:linear-gradient(180deg, var(--surface-2) 0%, var(--accent-faint) 58%, var(--surface-2) 100%), radial-gradient(90% 44% at 50% 74%, var(--accent-soft), transparent 70%)"},
  {id:"dusk", name:"Dusk", cat:"Gradient",
   css:"background:linear-gradient(200deg, var(--bloom-c) -10%, transparent 46%), linear-gradient(20deg, var(--bloom-b) -10%, transparent 52%);opacity:.5",
   thumb:"background:linear-gradient(200deg, var(--bloom-c) -12%, transparent 48%), linear-gradient(20deg, var(--bloom-b) -12%, transparent 54%), var(--surface-2)"},
  {id:"ember", name:"Ember", cat:"Gradient",
   css:"background:radial-gradient(60% 70% at 84% 96%, var(--bloom-a), transparent 64%), radial-gradient(50% 60% at 10% 96%, var(--bloom-c), transparent 66%)",
   thumb:"background:radial-gradient(64% 76% at 84% 100%, var(--bloom-a), transparent 66%), radial-gradient(54% 66% at 8% 100%, var(--bloom-c), transparent 68%), var(--surface-2)"},

  {id:"mesh", name:"Mesh", cat:"Abstract",
   css:"background-image:radial-gradient(var(--border-strong) 1px, transparent 1px);background-size:22px 22px;mask-image:radial-gradient(70% 62% at 50% 46%, #000, transparent 76%);-webkit-mask-image:radial-gradient(70% 62% at 50% 46%, #000, transparent 76%)",
   thumb:"background-color:var(--surface-2);background-image:radial-gradient(var(--border-strong) 1px, transparent 1px);background-size:8px 8px"},
  {id:"contour", name:"Contour", cat:"Abstract",
   css:"background:repeating-radial-gradient(circle at 30% 110%, transparent 0 22px, var(--border) 22px 23px);mask-image:radial-gradient(80% 70% at 40% 80%, #000, transparent 78%);-webkit-mask-image:radial-gradient(80% 70% at 40% 80%, #000, transparent 78%)",
   thumb:"background:repeating-radial-gradient(circle at 26% 116%, var(--surface-2) 0 9px, var(--border-strong) 9px 10px)"},
  {id:"weave", name:"Weave", cat:"Abstract",
   css:"background:repeating-linear-gradient(48deg, transparent 0 16px, var(--border) 16px 17px), repeating-linear-gradient(-48deg, transparent 0 16px, var(--border) 16px 17px);opacity:.7",
   thumb:"background-color:var(--surface-2);background-image:repeating-linear-gradient(48deg, transparent 0 7px, var(--border-strong) 7px 8px), repeating-linear-gradient(-48deg, transparent 0 7px, var(--border-strong) 7px 8px)"},
  {id:"halo", name:"Halo", cat:"Abstract",
   css:"background:repeating-radial-gradient(circle at 50% 50%, transparent 0 46px, var(--accent-line) 46px 47px);mask-image:radial-gradient(60% 60% at 50% 50%, #000, transparent 72%);-webkit-mask-image:radial-gradient(60% 60% at 50% 50%, #000, transparent 72%)",
   thumb:"background:repeating-radial-gradient(circle at 50% 50%, var(--surface-2) 0 11px, var(--accent-line) 11px 12px)"},
  {id:"drift", name:"Drift", cat:"Abstract",
   css:"background:conic-gradient(from 210deg at 32% 38%, var(--bloom-b), transparent 38%), conic-gradient(from 20deg at 76% 70%, var(--bloom-a), transparent 34%);filter:blur(30px);opacity:.6",
   thumb:"background:conic-gradient(from 210deg at 32% 38%, var(--bloom-b), transparent 38%), conic-gradient(from 20deg at 76% 70%, var(--bloom-a), transparent 34%), var(--surface-2)"},
  {id:"scan", name:"Scanlines", cat:"Abstract",
   css:"background:repeating-linear-gradient(0deg, var(--border) 0 1px, transparent 1px 7px);mask-image:linear-gradient(180deg, #000, transparent 88%);-webkit-mask-image:linear-gradient(180deg, #000, transparent 88%)",
   thumb:"background-color:var(--surface-2);background-image:repeating-linear-gradient(0deg, var(--border-strong) 0 1px, transparent 1px 5px)"}
];

const THEMES = [
  {id:"hogan", label:"Hogan navy", group:"Dark", bg:"#091218", surface:"#112029", ink:"#eef4f6", accent:"#4A9DA5"},
  {id:"dark", label:"Dark", group:"Dark", bg:"#0b0c0b", surface:"#1a1c19", ink:"#f2f3ef", accent:"#c8f04b"},
  {id:"indigo", label:"Indigo", group:"Dark", bg:"#0a0b13", surface:"#1a1b26", ink:"#f0f1fa", accent:"#8b93ff"},
  {id:"slate", label:"Slate", group:"Dark", bg:"#100e0c", surface:"#211c17", ink:"#f4f0ea", accent:"#e8a14a"},
  {id:"plum", label:"Plum", group:"Dark", bg:"#100a10", surface:"#20151f", ink:"#f6eef4", accent:"#f077b0"},
  {id:"ember", label:"Ember", group:"Dark", bg:"#0b0b0b", surface:"#1c1714", ink:"#f7f3ef", accent:"#f4561a"},
  {id:"harbour", label:"Harbour", group:"Dark", bg:"#0b0e10", surface:"#13171a", ink:"#f3f5f4", accent:"#5ee79a"},
  {id:"cargo", label:"Cargo", group:"Dark", bg:"#0a0a0a", surface:"#1a1c1a", ink:"#f2f5f2", accent:"#4ade80"},
  {id:"ocean", label:"Ocean", group:"Dark", bg:"#080e12", surface:"#141f25", ink:"#eaf4f8", accent:"#4fd4d0"},
  {id:"graphite", label:"Graphite", group:"Dark", bg:"#111112", surface:"#212124", ink:"#f4f4f5", accent:"#f4f4f5"},
  {id:"light", label:"Hogan light", group:"Light", bg:"#eef2f4", surface:"#ffffff", ink:"#10222d", accent:"#267985"},
  {id:"warm", label:"Warm paper", group:"Light", bg:"#faf5ec", surface:"#fffdf9", ink:"#2a2016", accent:"#c9683f"},
  {id:"mist", label:"Mist", group:"Light", bg:"#eef1f4", surface:"#ffffff", ink:"#141e20", accent:"#0e9f6e"},
  {id:"sand", label:"Sand", group:"Light", bg:"#f6f1e6", surface:"#fffdf7", ink:"#221d12", accent:"#7d5fd6"}
];

const ADMIN_ICONS = {
  people:"M12 12.5a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z M5 20.2c.9-3.1 3.6-4.9 7-4.9s6.1 1.8 7 4.9",
  teams:"M9 12a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 12Z M16.5 12.5a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z M2.6 19.6c.8-2.8 3.2-4.4 6.4-4.4s5.6 1.6 6.4 4.4 M17 15.4c2.2.4 3.7 1.8 4.3 4.2",
  structure:"M4.5 20V6.4A1.4 1.4 0 0 1 5.9 5h6.2a1.4 1.4 0 0 1 1.4 1.4V20 M13.5 10.5h4.6A1.4 1.4 0 0 1 19.5 12v8 M3 20h18 M7.5 8.5h2.5 M7.5 12h2.5",
  shield:"M12 3.6 19.5 6v6.1c0 4-3.1 6.9-7.5 8.3-4.4-1.4-7.5-4.3-7.5-8.3V6L12 3.6Z M9.2 12.2l2 2 3.6-3.7",
  agent:"M2 12h4l2.5-6 3.5 12 3-8 2 2h5",
  flow:"M18.5 8.5A5 5 0 0 0 8.9 7.3 3.8 3.8 0 0 0 6 14.6 M8 17.5l3.2 3.2 M11.2 20.7l3.2-3.2 M11.2 20.7V9.6",
  plug:"M9 3.5v5 M15 3.5v5 M6.5 8.5h11v3a5.5 5.5 0 0 1-11 0v-3Z M12 17v3.5",
  modules:"M6.6 4.4h10.8a2.2 2.2 0 0 1 2.2 2.2v10.8a2.2 2.2 0 0 1-2.2 2.2H6.6a2.2 2.2 0 0 1-2.2-2.2V6.6a2.2 2.2 0 0 1 2.2-2.2Z M4.4 9.6h15.2 M9.6 19.6V9.6",
  health:"M3 12.5h3.4l2-5 3 10 2.2-5H21",
  lock:"M6.5 10.5h11a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19v-7a1.5 1.5 0 0 1 1.5-1.5Z M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3",
  audit:"M8 3.5h8l3.5 3.5v13a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 6 3.5h2Z M9 12h6 M9 16h4",
  brand:"M12 3.5 14.6 9l6.4.6-4.8 4.2 1.4 6.2-5.6-3.3-5.6 3.3 1.4-6.2L3 9.6 9.4 9 12 3.5Z",
  bell:"M6 8.5a6 6 0 0 1 12 0c0 6.5 2.6 8.5 2.6 8.5H3.4S6 15 6 8.5Z M10.3 20.5a1.94 1.94 0 0 0 3.4 0",
  data:"M4.5 7.5c0-1.7 3.4-3 7.5-3s7.5 1.3 7.5 3-3.4 3-7.5 3-7.5-1.3-7.5-3Z M4.5 7.5v9c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-9 M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"
};

const ADMIN_CARDS = [
  {id:"people", group:"ORGANISATION", title:"People & access", icon:"people", tint:"#7FB8C9",
   blurb:"The eight people who use Hogan Healthcare OS, and what each can reach.",
   tags:["8 core users","5 departments","3 fictional reps"],
   footer:"Three field reps are fictional for the demo", action:"Review access",
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Add, invite or remove users",""],["Departments","Management, Sales, Orders, Operations, Finance & admin"],["Managers","John Culkin, Aileen Cahalane, Margaret Duff"],
     ["Locations","Dún Laoghaire office and stockroom, field"],["Contact details","demo placeholders only"]]},
  {id:"teams", group:"ORGANISATION", title:"Roles & permissions", icon:"shield", tint:"var(--accent)",
   blurb:"Who can see, change and approve what. Sensitive decisions always need a named person.",
   tags:["4 roles","approval limits","no agent approvals"],
   heroLabel:"APPROVAL RULES", heroAction:"Show approval rules",
   heroText:"Stock transfers need John Culkin. Purchase orders over €5,000, credit notes, discounts and supplier bill holds need Graham Hogan. Agents can propose but never approve.",
   footer:"Preview Pulse as another user", action:"Open preview",
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Admin","Graham Hogan"],["Manager","John, Aileen, Margaret"],["Standard","Sharon and the field team"],
     ["Purchase orders over €5,000","Graham approves", true],["Stock transfers","John approves", true],["Agents approving anything","never", false]]},
  {id:"structure", group:"ORGANISATION", title:"Company structure", icon:"structure", tint:"#D9C27A",
   blurb:"Company details, stock locations and working calendar.",
   tags:["Founded 2002","Dún Laoghaire","EUR"],
   listLabel:"COMPANY DETAILS",
   rows:[["Company","Hogan Healthcare Ltd"],["Founded","2002"],["Address","The Highline, Bakers Point, Pottery Road, Dún Laoghaire, A96 KW29"],
     ["Stock locations","1 main stockroom + 8 consignment sites (fictional demo accounts)"],["Supplier agencies","10, of which 3 key global partners"],
     ["Separate business","NICE1 rentals (nice1.ie)"],["Currency and timezone","EUR · Europe/Dublin"]]},

  {id:"agents", group:"CONTROL", title:"Agents & AI controls", icon:"agent", tint:"var(--accent)",
   blurb:"What the eight agents may read, what they may propose, and where they must stop.",
   tags:["8 agents","read + propose","human approval"],
   heroLabel:"GLOBAL CONTROL", heroAction:"Pause every agent",
   heroText:"One switch stops every agent immediately. Agents never post financial transactions, approve stock movements or make regulatory decisions.",
   footer:"Write actions always wait for a person", action:"Review limits",
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Read business records","by role"],["Draft tasks, reminders and plans","allowed", true],["Approve or post anything","never", false],
     ["Send email to customers","never; people send", false],["Regulated decisions","never", false],["Memory and retention","90 days (demo setting)"]]},
  {id:"wf", group:"CONTROL", title:"Workflow controls", icon:"flow", tint:"#9d8cf5",
   blurb:"Guardrails for routines and automations. Building them lives under Work.",
   tags:["Managers only","approval gates","retry twice"],
   footer:"Building workflows happens in Work", action:"Open Work",
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Who can create workflows","Managers"],["Maximum autonomy","proposes, never sends", true],
     ["Approval gates","transfers, POs, bill holds"],["Failure handling","retry twice, then notify"],["Global pause","all workflows", true]]},
  {id:"notif", group:"CONTROL", title:"Notifications", icon:"bell", tint:"#E0A98C",
   blurb:"Which events reach which people, and when not to.",
   tags:["In-app","Daily briefing 07:00","Quiet 19:00 to 07:00"],
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Morning briefing","07:00 weekdays", true],["Stock below par","John and the rep", true],["Order at risk of missing courier","Sharon", true],
     ["Overdue follow-up","rep and Aileen", true],["Email and mobile push","not connected", false],["Quiet hours","19:00 to 07:00"]]},

  {id:"integrations", group:"SYSTEMS", title:"Systems & integrations", icon:"plug", tint:"#7FB8C9",
   blurb:"The current ERP, accounting, bank feed and websites. What Pulse would read, and what is only a demo today.",
   tags:["ERP: demo","Xero: to confirm","nothing live"], badge:"Demo · to verify", badgeKind:"warn",
   footer:"No live system has been connected or accessed", action:"Plan discovery",
   listLabel:"CONNECTIONS",
   rows:[["Current ERP (probably Enterpryze)","demo · to verify"],["Xero","to confirm"],["Bank feed","not verified"],["nice1.ie","not connected"],["Email and calendar","not connected"]]},
  {id:"modules", group:"SYSTEMS", title:"Modules & configuration", icon:"modules", tint:"#D9C27A",
   blurb:"Modules switched on for Hogan, and the words Pulse uses.",
   tags:["7 business modules","medical-device terms"],
   heroLabel:"TERMINOLOGY", heroAction:"Edit terminology",
   heroText:"Organisations read as Accounts or Hospitals, stock is held per Location, and every movement carries its Lot or Serial, including in what agents say back to you.",
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Business modules","Sales, Orders, Inventory, Purchasing, Finance, Compliance, Rentals"],["Rentals module","NICE1, secondary"],
     ["Custom fields","GTIN / UDI-DI, lot, serial, expiry, MDR class"],["Statuses","order, transfer, bill, rental sets"]]},
  {id:"health", group:"SYSTEMS", title:"Data health", icon:"health", tint:"#e2705c",
   blurb:"What is wrong with the data, how much, and the fix.",
   tags:["6 issue types","demo data"], badge:"2 missing DoCs", badgeKind:"bad",
   footer:"Checked against the demo dataset", action:"Open exceptions",
   listLabel:"ISSUES FOUND",
   trend:[31,28,26,24,21,18,14],
   bySeverity:[["High","5",RED],["Medium","6",AMBER],["Low","9",DIM]],
   issues:[["Missing declarations of conformity","2","high","HH-OR-239 and HH-OR-233 were received without a DoC on file","Open exception"],
     ["Integrations not verified","3","high","ERP, Xero and bank feed are demo connections","Open Systems"],
     ["Count variances","2","medium","Eastgate HH-SM-114 and Westside HH-OR-238 to verify","Open counts"],
     ["Hand-keyed UDI labels","2","medium","GRN-0412: barcodes unreadable, lots keyed by hand","Open receipt"],
     ["Unmatched bank lines","3","low","Payments with no clear invoice reference","Open reconciliation"],
     ["Contacts without a role","6","low","Imported from the ERP without job titles (demo)","Review"]],
   rows:[]},

  {id:"security", group:"GOVERNANCE", title:"Security & privacy", icon:"lock", tint:"#8fa6ff",
   blurb:"Sign-in, sessions, and what this demo does and does not claim.",
   tags:["Demo environment","no patient data"], badge:"Demo", badgeKind:"warn",
   footer:"Production security to be designed with Hogan", action:"Review",
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Patient-identifiable data","none stored", false],["Single sign-on","to configure"],["Two-factor authentication","recommended", true],
     ["Certification or validation","none claimed for this frontend", false],["GDPR","needs a proper assessment before go-live"],["Data retention rules","to agree"]]},
  {id:"audit", group:"GOVERNANCE", title:"Audit log", icon:"audit", tint:"#9d8cf5",
   blurb:"A locked history of who changed what. Searchable, exportable, never editable.",
   tags:["Append-only","every demo action"],
   footer:"Nobody can edit or delete entries", action:"Open Activity",
   listLabel:"WHAT IS RECORDED",
   rows:[["Stock movements","with lot and serial"],["Approvals","who decided, when"],["Agent proposals","and who accepted them"],
     ["Order scans","line by line"],["Financial exceptions","no postings from Pulse"]]},
  {id:"datamgmt", group:"GOVERNANCE", title:"Data management", icon:"data", tint:"#5fe0a8",
   blurb:"Import, export and, for this demo, reset to the opening position.",
   tags:["Demo reset","fictional data"],
   heroLabel:"DEMO RESET", heroAction:"Reset demo data",
   heroText:"Puts every story back to its opening position: Harbour at 4 units, SO-1047 at 3 of 5 scanned, Pinewood overdue, INV-6128 open, BILL-2034 unresolved and RN-0208 reserved.",
   footer:"Reset puts every demo story back to its opening state", action:"Reset demo",
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Import data","from the ERP (planned)"],["Export data","CSV or PDF"],["Demo dataset","fictional, 19 Nov 2026"],
     ["Reset demo","stories back to the start"]]},

  {id:"brand", group:"EXPERIENCE", title:"Branding", icon:"brand", tint:"var(--accent)",
   blurb:"Logo, colours and how Hogan Healthcare OS presents itself.",
   tags:["Hogan logo","demo palette"],
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Company logo","from hoganhealthcare.com"],["Primary","#17374D deep navy (demo choice)"],["Secondary","#267985 teal (demo choice)"],
     ["Accent","#4A9DA5 aqua (demo choice)"],["Official brand colours","not verified, to replace"],["Product name","Hogan Healthcare OS, powered by Pulse"]]},
  {id:"appearance", group:"EXPERIENCE", title:"Appearance & themes", icon:"brand", tint:"#7FB8C9",
   blurb:"Pick a light or dark theme for how Pulse looks to you.",
   tags:["Hogan navy","Hogan light"],
   listLabel:"THEMES", rows:[]}
];

const ADMIN_GROUPS = [
  ["ORGANISATION", "repeat(3,1fr)"],
  ["CONTROL", "repeat(3,1fr)"],
  ["SYSTEMS", "repeat(3,1fr)"],
  ["GOVERNANCE", "repeat(3,1fr)"],
  ["EXPERIENCE", "repeat(3,1fr)"]
];

/* ---- activity feeds ---- */
const SRC_TINT = {ERP:"#9FB5D9", Pulse:"var(--accent)", Bank:"#D9C27A", Email:"#E0A98C", Scanner:"#8FC7A4", Xero:"#7FB8C9", NICE1:"#B9A9D9", Agent:"var(--accent)"};
const SRC_ABBR = {ERP:"ER", Pulse:"PL", Bank:"BK", Email:"EM", Scanner:"SC", Xero:"XR", NICE1:"N1", Agent:"AI"};

const DATA_EVENTS = [
  ["Order lines read from the ERP","12 lines across 4 open orders. Demo activity: connection not yet verified.","ERP sync (demo)","4 open orders","ERP","completed"],
  ["Usage report received","A consignment site reported units used. Usage order to raise.","Hospital report (demo)","Consignment stock","Email","completed"],
  ["Courier tracking updated","3 dispatched orders out for delivery.","Courier feed (demo)","Dispatch board","Pulse","completed"],
  ["Bank lines imported","New lines staged for matching. Demo activity: bank feed not yet verified.","Bank feed (demo)","Reconciliation","Bank","completed"],
  ["Supplier confirmation received","Nordfix confirmed PO-338 for delivery on 20 Nov.","Supplier email (demo)","PO-338","Email","completed"],
  ["Price list staged","CONMED 2027 price list staged for review. Not applied.","Supplier file (demo)","CONMED","Pulse","completed"],
  ["Scanner synced","Handheld uploaded 6 reads from the main stockroom.","Scanner","Main stockroom","Scanner","completed"],
  ["ERP sync retried","Customer master read failed once, retried and completed. Demo activity.","ERP sync (demo)","Accounts","ERP","completed"]
];

const PEOPLE_EVENTS = [
  ["Reviewed the dispatch board","No changes made.","Sharon O'Mongain","Dispatch board","Pulse","completed"]
];

const AI_EVENTS = [
  ["Stock & Traceability Agent checked 8 sites","No new shortfalls since 06:00. Harbour still the only urgent one until it is topped up.","Stock & Traceability Agent","8 consignment sites","Agent","working"],
  ["Order Flow Agent re-checked open orders","34 open, picking is the bottleneck.","Order Flow Agent","Open orders","Agent","working"],
  ["Finance Agent re-read the bank feed (demo)","No new lines to match since the last import.","Finance Agent","Reconciliation","Agent","working"],
  ["Sales Agent refreshed follow-up priorities","Overdue list unchanged. Pinewood still the largest.","Sales Agent","Pipeline","Agent","working"],
  ["Quality & Compliance Agent checked certificates","One CE certificate within 60 days of expiry.","Quality & Compliance Agent","Quality documents","Agent","working"],
  ["Purchasing Agent re-ran reorder points","Reorder list unchanged since 09:05.","Purchasing Agent","Main stockroom","Agent","working"]
];

const STREAM_DEFS = [
  {id:"data", title:"New data", sub:"Information entering Pulse", pool:DATA_EVENTS, every:3200,
   tint:"#6ad0f0", icon:"M4.5 7.5c0-1.7 3.4-3 7.5-3s7.5 1.3 7.5 3-3.4 3-7.5 3-7.5-1.3-7.5-3Z M4.5 7.5v9c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-9 M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"},
  {id:"people", title:"Employee activity", sub:"Decisions people made", pool:PEOPLE_EVENTS, every:86400000,
   tint:"#f0c04b", icon:"M12 12.5a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z M5 20.2c.9-3.1 3.6-4.9 7-4.9s6.1 1.8 7 4.9"},
  {id:"ai", title:"AI activity", sub:"Agents at work", pool:AI_EVENTS, every:4600,
   tint:"var(--accent)", icon:"M2 12h4l2.5-6 3.5 12 3-8 2 2h5"}
];

const NAV = [
  {group:"Workspace"},
  {label:"Home", icon:"helios", page:"Home"},
  {label:"Agents", icon:"navAgents", page:"Agents"},
  {label:"Dashboard", icon:"navDash", page:"Dashboard"},
  {label:"Work", icon:"navWork", page:"Work"},
  {group:"Business operations"},
  {label:"Sales", icon:"navSales", page:"Sales"},
  {label:"Orders", icon:"navOrders", page:"Orders"},
  {label:"Inventory", icon:"navInventory", page:"Inventory"},
  {label:"Purchasing", icon:"navPurchasing", page:"Purchasing"},
  {label:"Finance", icon:"navFinance", page:"Finance"},
  {label:"Compliance", icon:"navCompliance", page:"Compliance"},
  {label:"Rentals", icon:"navRentals", page:"Rentals"},
  {group:"System"},
  {label:"Records", icon:"navRecords", page:"Records"},
  {label:"Activity", icon:"pulseLine", page:"Activity"},
  {label:"Settings", icon:"navSettings", page:"Settings"}
];

/* Inbox items follow the real InboxItem shape: what happened, why it matters, what I can do. */
const ITEMS = {
  po:{kind:"Approval", importance:"high", icon:ICONS.approvals, age:"1d",
    title:"Purchase order PO-341 to Halcyon Orthopaedics",
    why:"Raised by Sharon O'Mongain. Over the €5,000 sign-off threshold, so it routed to you.",
    detail:"Restock of three fast-moving fixation lines. Pricing matches the current agreement. Approving records the decision as you.",
    actionLabel:"Approve", secondaryLabel:"Request changes", group:"Approvals",
    fields:[{k:"Requested by",v:"Sharon O'Mongain"},{k:"Supplier",v:"Halcyon Orthopaedics"},{k:"Record",v:"PO-341"}],
    history:[{when:"18 Nov 16:20",text:"Sharon raised the request"},{when:"18 Nov 16:20",text:"Routed to Graham Hogan, over threshold"}]},
  sync:{kind:"Alert", importance:"critical", icon:ICONS.health, age:"today",
    title:"ERP connection not yet verified",
    why:"Pulse is running on fictional demo data. Verifying the connection is a discovery step.",
    detail:"No live system has been connected or read in this demo.",
    actionLabel:"Open Systems", secondaryLabel:"Snooze", group:"Alerts",
    fields:[{k:"System",v:"Current ERP (to confirm)"},{k:"Status",v:"Demo"}],
    history:[{when:"Today",text:"Demo environment started"}]},
  visit:{kind:"Task", importance:"high", icon:ICONS.visits, age:"2d",
    title:"ACL loan set needed at Liffey for 24 Nov",
    why:"Requested by the clinic. Dispatch by 23 Nov.",
    detail:"LS-01 is inspected and sealed in the main stockroom.",
    actionLabel:"Prepare set", secondaryLabel:"Reschedule", group:"Work",
    fields:[{k:"Set",v:"LS-01"},{k:"Procedure date",v:"24 Nov"}],
    history:[{when:"17 Nov",text:"Request logged by John Culkin"}]},
  auto:{kind:"Alert", importance:"normal", icon:ICONS.autos, age:"today",
    title:"BILL-2034 does not match PO-337",
    why:"Billed 14, ordered and received 12. Held for Margaret.",
    detail:"The three-way match failed on quantity. Nothing has been posted.",
    actionLabel:"Open the bill", secondaryLabel:"Assign", group:"Automations",
    fields:[{k:"Bill",v:"BILL-2034"},{k:"Variance",v:"2 units, €580"}],
    history:[{when:"Today 09:05",text:"Purchasing Agent flagged the mismatch"}]},
  task:{kind:"Task", importance:"normal", icon:ICONS.work, age:"Fri",
    title:"Friday team review: plan next week",
    why:"Seven follow-ups are overdue going into next week.",
    detail:"The Sales Agent has drafted plans that wait for approval in the Weekly Planner.",
    actionLabel:"Open planner", secondaryLabel:"Assign", group:"Work",
    fields:[{k:"Owner",v:"Graham Hogan"},{k:"Due",v:"Fri 20 Nov"}],
    history:[{when:"Today",text:"Task created from the weekly routine"}]}
};
const ORDER = ["sync","po","visit","auto","task"];

const ANSWERS = {
  fallback:{tool:"pulse_search", effect:"read",
    text:"I can answer from every record in this demo. Anything with an effect is proposed and waits for a person.",
    actions:[["What needs my attention?",0]]}
};

// Turns a plain-English filter name into a full dashboard area — the "primitive
// vibe-coding" bit: no real backend, just a seeded generator so the same phrase
// always produces the same numbers, with direction and vocabulary nudged by
// keywords in the text (expansion/growth trends up, risk/issue trends down, a
// region/cost/people/ops/customer word picks which metrics show).
function synthesizeCustomArea(name){
  const trimmed = (name || "").trim();
  if (!trimmed) return null;
  let seed = 0;
  for (let i = 0; i < trimmed.length; i++) seed = (seed * 31 + trimmed.charCodeAt(i)) >>> 0;
  const rnd = (n) => (((seed >>> (n % 24)) ^ (seed << ((n * 7) % 13))) >>> 0) % 997 / 997;
  const low = trimmed.toLowerCase();
  const has = (...words) => words.some(w => low.indexOf(w) > -1);
  const growth = has("expansion","growth","launch","scale","pilot","new site","open","opening","grow");
  const risk = has("risk","issue","delay","problem","complaint","fault","incident","churn","decline");
  const dir = risk ? -1 : (growth ? 1 : (rnd(2) > 0.45 ? 1 : -1));

  let vocab = "generic";
  if (has("scotland","ireland","wales","england","region","dublin","belfast","cork","galway","london","glasgow","edinburgh"))
    vocab = "region";
  else if (has("cost","spend","budget","saving","margin")) vocab = "cost";
  else if (has("staff","hiring","team","recruit","headcount")) vocab = "people";
  else if (has("supplier","stock","inventory","warehouse","fleet")) vocab = "ops";
  else if (has("customer","client","retention","account")) vocab = "customer";

  const V = {
    region:   {labels:["New enquiries","Orders won","Revenue","Site coverage"], unit:"EUR · 30 DAYS"},
    cost:     {labels:["Spend","Cost per job","Savings found","Budget used"], unit:"EUR · 30 DAYS"},
    people:   {labels:["Headcount","Open roles","Time to hire","Retention"], unit:"PEOPLE"},
    ops:      {labels:["Stock cover","Lead time","Stockouts","Reorders raised"], unit:"DAYS"},
    customer: {labels:["Active accounts","Repeat rate","Churn","NPS"], unit:"ACCOUNTS"},
    generic:  {labels:["Volume","Rate","Cost","Coverage"], unit:"ACTIVITY · 30 DAYS"}
  }[vocab];

  const months = ["Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug"];
  let v0 = 40 + Math.floor(rnd(1) * 220);
  const chart = months.map((m, i) => {
    v0 = Math.max(8, Math.round(v0 * (1 + dir * (0.03 + rnd(i + 3) * 0.07))));
    return [m, v0, String(v0)];
  });
  const metrics = V.labels.map((label, i) => {
    const val = 20 + Math.floor(rnd(i + 5) * 400);
    const pct = 2 + Math.round(rnd(i + 9) * 18);
    const up = dir > 0 ? rnd(i + 12) > 0.25 : rnd(i + 12) > 0.7;
    const bars = [0,1,2,3,4,5,6,7,8].map(k => 0.3 + rnd(i * 3 + k) * 0.7);
    return [label, i === 1 ? pct + "%" : String(val), (up ? "+" : "\u2212") + pct + (i === 1 ? "pt" : "%"), up ? "up" : "down", "vs last month", bars];
  });
  const capName = trimmed.replace(/\b\w/g, c => c.toUpperCase());
  const split = [
    [capName + " \u2014 direct", String(Math.round(v0 * 0.5)), "48%", 1],
    ["Existing pipeline", String(Math.round(v0 * 0.3)), "31%", 0],
    ["Everything else", String(Math.round(v0 * 0.2)), "21%", 0]
  ];
  const table = [1,2,3].map(w => [capName + " \u2014 week " + w, String(20 + Math.floor(rnd(20 + w) * 200)),
    (dir > 0 ? "+" : "\u2212") + (3 + Math.floor(rnd(23 + w) * 14)) + "%", "Auto-tagged from records mentioning \u201c" + low + "\u201d"]);
  table.push(["Everything else", String(20 + Math.floor(rnd(30) * 200)), "\u2014", "Baseline"]);
  return {
    id: trimmed, label: capName, color: "var(--accent)", owner: "CUSTOM FILTER",
    description: "Generated from \u201c" + trimmed + "\u201d \u2014 a plain-English filter, not a registered metric set. Refine it and Pulse will tighten this up.",
    kind: "columns", chartTitle: capName + " over time", chartUnit: V.unit,
    chart, splitTitle: "Where \u201c" + low + "\u201d shows up", split,
    tableCols: ["Item","Value","Change","Note"], table,
    metrics, legend: [capName, "Pipeline", "Other"]
  };
}

function pickAnswer(q){
  return ANSWERS.fallback;
}

const ORGS = [
  ["Harbour Orthopaedic Clinic","Customer","€8,750","21 days","watch"],
  ["South Dublin Surgical Centre","Customer","€0","current","active"],
  ["Liffey Surgical Clinic","Customer","€1,425","18 days","active"],
  ["Halcyon Orthopaedics","Supplier","n/a","n/a","active"],
  ["Eastgate Orthopaedics","Customer","€2,310","28 days","watch"],
  ["Atlantic Sports Surgery","Customer","€2,180","22 days","active"]
];
const TEAMS = [
  ["Management","2 members","Graham Hogan","all permissions"],
  ["Sales","4 members","Aileen Cahalane","accounts, opportunities, plans"],
  ["Orders and office","2 members","Margaret Duff","orders, receivables, payables"],
  ["Operations","1 member","John Culkin","stock, transfers, loan sets, rentals"]
];
const LOCATIONS = [
  ["Dún Laoghaire main stockroom","The Highline, Dún Laoghaire","office team","active"],
  ["Harbour Orthopaedic Clinic","Consignment site (fictional)","par levels","below par"],
  ["South Dublin Surgical Centre","Consignment site (fictional)","par levels","active"]
];

const AGENT_DEFS = [
  {id:"briefing", name:"Briefing Agent", shape:"crown-pebble", tint:"#191c1f", state:"complete", role:"Reads the whole business every morning and tells Graham the few things that matter",
   when:"07:02", preview:"three things need attention today.",
   thread:[
     {kind:"stamp", text:"Today 07:00"},
     {kind:"routine", text:"Ran routine", routine:"Morning briefing"},
     {kind:"agent", text:"morning briefing for thursday 19 november (demo data):", lines:[
       {k:"Stock", v:"Harbour has 4 × HH-OR-204 against a par of 6"},
       {k:"Orders", v:"SO-1047 needs 2 more scans before the 16:00 courier"},
       {k:"Sales", v:"7 follow-ups overdue, largest Pinewood Orthopaedics €16,800"},
       {k:"Cash", v:"12 invoices overdue, €23,800 · INV-6128 Harbour €8,750"}]},
     {kind:"agent", text:"three of those need a person today: John's approval on the Harbour transfer, Sharon's last two scans, and a plan for Aileen's Pinewood follow-up. the invoices are with Margaret."},
     {kind:"user", text:"put pinewood on aileen's thursday"},
     {kind:"agent", text:"it is already on her day at 12:00. i've flagged it high in My Day and on Friday's team review so it doesn't slip a third week."}
   ]},
  {id:"ops", name:"Ops Watchdog", shape:"shield", tint:"#2b1b1e", state:"attention", role:"Watches orders, tasks and exceptions and says when something has stopped moving",
   when:"11:52", preview:"SO-1047 at risk of missing the 16:00 courier.",
   thread:[
     {kind:"stamp", text:"Today 10:02"},
     {kind:"agent", text:"four orders (SO-1025 to SO-1028) are packed with no courier booked since yesterday. the 12:00 collection can take all four."},
     {kind:"stamp", text:"Today 11:52"},
     {kind:"agent", text:"SO-1047 for South Dublin Surgical Centre is 3 of 5 scanned. the two left need a lot and expiry (Arthrosamid pack) and a serial (battery pack). at the current pace it misses the 16:00 cut-off."},
     {kind:"user", text:"who's on it"},
     {kind:"agent", text:"Sharon. it's top of her task list and the picking screen has both items queued. i won't touch the order myself: scans are hers."}
   ]},
  {id:"stock", name:"Stock & Traceability Agent", shape:"control-cube", tint:"#16241f", state:"waiting", role:"Hospital consignment levels, expiring lots, count variances and where every lot went",
   when:"06:00", preview:"harbour below par on HH-OR-204. transfer drafted.",
   thread:[
     {kind:"stamp", text:"Today 06:00"},
     {kind:"routine", text:"Ran routine", routine:"Hospital stock watch"},
     {kind:"agent", text:"Harbour Orthopaedic Clinic used 2 × HH-OR-204 since October and is down to 4 against a par level of 6.", lines:[
       {k:"Main stockroom", v:"6 on hand · lot L2609-204B · expires Aug 2031"},
       {k:"Harbour", v:"4 on hand · par 6"},
       {k:"South Dublin", v:"2 on hand · par 2"},
       {k:"Suggestion", v:"move 3 to Harbour, leaving it at 7"}]},
     {kind:"agent", text:"stock only moves when John approves. after it does, the main stockroom drops to 3, below its reorder point, so i'll hand that to the Purchasing Agent."},
     {kind:"agent", text:"also: 4 ablation probes at Riverpark expire 31 Dec and Eastgate counted 4 where the system says 5 on HH-SM-114. both are with John."}
   ]},
  {id:"sales", name:"Sales Agent", shape:"executive-capsule", tint:"#2a2118", state:"working", role:"Prioritises follow-ups, spots quiet accounts and drafts each rep's week for approval",
   when:"08:15", preview:"7 follow-ups overdue. pinewood quiet 19 days.",
   thread:[
     {kind:"stamp", text:"Today 08:15"},
     {kind:"agent", text:"seven open opportunities have an overdue follow-up, worth €68,400 together. the oldest:", lines:[
       {k:"Pinewood Orthopaedics", v:"€16,800 · Aileen · quiet 19 days"},
       {k:"Lakeside Orthopaedic Group", v:"€13,400 · Rory · quote QT-2207 unanswered"},
       {k:"Meadowbank Private Hospital", v:"€11,600 · Aileen · tender questions due 17 Nov"}]},
     {kind:"agent", text:"i can draft next week for each rep from this. it stays a draft until Graham or the rep approves it in the Weekly Planner."},
     {kind:"user", text:"do aileen first"},
     {kind:"agent", text:"drafted for w/c 23 Nov: Pinewood follow-up on Monday morning, Meadowbank tender on Tuesday, two account visits she hasn't made in a fortnight. waiting for approval."}
   ]},
  {id:"orders", name:"Order Flow Agent", shape:"low-dome", tint:"#241b2e", state:"working", role:"Finds incomplete orders, missing scans and dispatch bottlenecks before the courier does",
   when:"10:02", preview:"6 orders picking. 2 with issues.",
   thread:[
     {kind:"stamp", text:"Today 10:02"},
     {kind:"agent", text:"34 orders open. the bottleneck today is picking, not stock:", lines:[
       {k:"Picking", v:"6 orders, SO-1047 is the urgent one"},
       {k:"Packed, no courier", v:"SO-1025 to SO-1028"},
       {k:"Issues", v:"SO-1023 waiting on a hospital PO number, SO-1024 short one line"}]},
     {kind:"agent", text:"orders are taking about 39 minutes each to handle this week. most of that is re-keying lot numbers. scanning removes the re-keying; we will measure the difference after go-live rather than guess it."}
   ]},
  {id:"finance", name:"Finance Agent", shape:"offset-pebble", tint:"#191c1f", state:"waiting", role:"Reviews unpaid invoices, bank matches, margins and anomalies. Drafts, never posts",
   when:"08:30", preview:"12 invoices overdue, €23,800. 4 bank matches ready.",
   thread:[
     {kind:"stamp", text:"Today 08:30"},
     {kind:"agent", text:"receivables this morning (demo data):", lines:[
       {k:"Overdue", v:"12 invoices · €23,800"},
       {k:"Largest", v:"INV-6128 · Harbour · €8,750 · 21 days"},
       {k:"Bank", v:"14 lines in, 6 suggested matches"}]},
     {kind:"agent", text:"i've drafted a reminder for INV-6128 for Margaret to send. nothing goes to a customer from me."},
     {kind:"stamp", text:"Today 09:05"},
     {kind:"agent", text:"BILL-2034 from Aquila bills 14 anchors but PO-337 and GRN-0419 both say 12. that's €580 for goods we never received. suggest Margaret asks for a credit note and holds the difference. i haven't approved or posted anything."}
   ]},
  {id:"purchasing", name:"Purchasing Agent", shape:"wide-eyed", tint:"#1b2430", state:"thinking", role:"Suggests purchase orders and transfers from real stock needs and checks every bill against its PO",
   when:"09:05", preview:"5 lines below reorder point. PO-341 waiting on graham.",
   thread:[
     {kind:"stamp", text:"Today 09:05"},
     {kind:"agent", text:"five central lines are below their reorder point after open orders and stock on order. biggest gap is the 25 × 90 mm saw blades."},
     {kind:"agent", text:"PO-341 to Halcyon is waiting on Graham because it's over €5,000. PO-333 from Veritas is 16 days late on two tibial nails; supplier now says 24 Nov."},
     {kind:"user", text:"what about the anchors bill"},
     {kind:"agent", text:"three-way match fails on BILL-2034: ordered 12, received 12, billed 14. i've passed it to Margaret through the Finance Agent. the bill is held, not paid."}
   ]},
  {id:"quality", name:"Quality & Compliance Agent", shape:"precision-brow", tint:"#16241f", state:"attention", role:"Flags missing documents, traceability gaps and audit work that needs a person to review",
   when:"10:34", preview:"2 DoCs missing. CE certificate expires 8 Jan.",
   thread:[
     {kind:"stamp", text:"Today 10:34"},
     {kind:"agent", text:"three things for a person to look at (none is a regulatory decision i can make):", lines:[
       {k:"Documentation", v:"no declaration of conformity on file for 2 Nordfix SKUs"},
       {k:"Certificates", v:"Polaris consumables CE certificate expires 8 Jan"},
       {k:"Traceability", v:"GRN-0412 had two labels keyed by hand"}]},
     {kind:"agent", text:"the traceability SOP is overdue for review since 2 November. a simulated drill on HH-OR-204 lot L2603-204A would exercise it; it's an exercise, not a recall."}
   ]}
];

const KPI_DEFS = {
  revenue:{label:"Revenue · Nov to date", value:"€165,400", delta:"−5.2%", dir:"down", hint:"vs Oct daily pace · demo", hero:true},
  ebitda:{label:"EBITDA · Nov to date", value:"€25,700", delta:"15.5%", dir:"up", hint:"margin · demo"},
  margin:{label:"Gross margin", value:"38.8%", delta:"−0.1pt", dir:"down", hint:"vs October · demo"},
  orders:{label:"Open orders", value:"34", delta:"6 picking", dir:"up", hint:"live demo state"},
  units:{label:"Stock units", value:"1,240", delta:"420", dir:"up", hint:"held at hospitals"},
  overdue:{label:"Overdue invoices", value:"€23,800", delta:"12", dir:"down", hint:"invoices past due"},
  pipeline:{label:"Open pipeline", value:"€186,500", delta:"26", dir:"up", hint:"open opportunities"},
  followups:{label:"Overdue follow-ups", value:"7", delta:"of 26", dir:"down", hint:"opportunities"}
};

const ASPECT_DEFS = [
  {id:"sales", label:"Sales", color:"var(--accent)", owner:"NIAMH CRONIN", description:"Counter, trade accounts and quotes out the door.",
   kind:"columns", chartTitle:"Revenue by month", chartUnit:"EUR",
   chart:[["Sep",288,"€0k"],["Oct",301,"€0k"],["Nov",352,"€0k"],["Dec",376,"€0k"],["Jan",268,"€0k"],["Feb",294,"€0k"],["Mar",318,"€0k"],["Apr",341,"€0k"],["May",362,"€0k"],["Jun",384,"€0k"],["Jul",398,"€0k"],["Aug",413,"€0k"]],
   splitTitle:"Where it came from",
   split:[["Trade counter","€214.6k","72%",1],["Contract accounts","€156.8k","53%",0],["Online orders","€41.4k","18%",0]],
   tableCols:["Account","Revenue","Change","Owner"],
   table:[["Harbour Orthopaedic Clinic","€48,210","+12.4%","Aileen Cahalane"],["South Dublin Surgical Centre","€8,750","−18.2%","Margaret Duff"],["Liffey Surgical Clinic","€21,860","+4.1%","Aileen Cahalane"],["Eastgate Orthopaedics","€18,240","+9.6%","John Culkin"]],
   metrics:[["Revenue","€412,800","+6.2%","up","30 days",[.4,.55,.44,.62,.5,.7,.6,.78,1]],
     ["Orders","318","+22","up","30 days",[.5,.6,.44,.7,.55,.75,.62,.8,.9]],
     ["Average order","€1,298","+1.8%","up","vs last month",[.6,.58,.62,.6,.66,.64,.7,.68,.74]],
     ["Quotes won","41%","−3pt","down","conversion",[.7,.66,.7,.6,.62,.55,.58,.5,.48]]]},
  {id:"development", label:"Development", color:"#9fd6f0", owner:"TOM WALSH", description:"Modules shipped into the client build and what they contributed.",
   kind:"rows", rows:[["approval routing","412 runs",412],["overdue reminder","308 runs",308],["visit escalation","286 runs",286],["xero sync","198 runs",198],["briefing job","80 runs",80]], chartTitle:"Runs by automation", chartUnit:"RUNS · 30 DAYS",
   chart:[["Sep",620,"620"],["Oct",684,"684"],["Nov",712,"712"],["Dec",760,"760"],["Jan",802,"802"],["Feb",864,"864"],["Mar",918,"918"],["Apr",986,"986"],["May",1042,"1042"],["Jun",1128,"1128"],["Jul",1204,"1204"],["Aug",1284,"1284"]],
   splitTitle:"Runs by module",
   split:[["core","1,042","81%",1],["site-visits","198","15%",0],["ui-showcase","44","4%",0]],
   tableCols:["Module","Version","Contributions","State"],
   table:[["core","0.1.0","31 routes · 21 events","always installed"],["site-visits","1.0.0","1 entity · 2 tools","installed"],["ui-showcase","0.1.0","3 pages","installed"],["wholesale","n/a","6 entities · 9 tools","available"]],
   metrics:[["Modules live","3","+1","up","this quarter",[.2,.2,.4,.4,.4,.6,.6,.6,1]],
     ["Pulse tools","11","+2","up","registered",[.4,.44,.5,.5,.6,.6,.7,.8,.9]],
     ["Automation runs","1,284","+9%","up","30 days",[.5,.55,.6,.58,.66,.7,.72,.8,.86]],
     ["Failure rate","0.9%","−0.4pt","up","of all runs",[.8,.74,.7,.62,.6,.5,.44,.4,.32]]]},
  {id:"marketing", label:"Marketing", color:"#e6c78a", owner:"AOIFE NOLAN", description:"Reach, enquiries and what turned into an account.",
   kind:"funnel", funnel:[["Enquiries","184","n/a",184],["Quoted","96","52% of enquiries",96],["Won","39","41% of quotes",39],["Repeat order","12","31% of wins",12]], chartTitle:"Enquiry to repeat order", chartUnit:"CONVERSION",
   chart:[["Sep",96,"96"],["Oct",104,"104"],["Nov",88,"88"],["Dec",112,"112"],["Jan",124,"124"],["Feb",118,"118"],["Mar",136,"136"],["Apr",142,"142"],["May",151,"151"],["Jun",164,"164"],["Jul",172,"172"],["Aug",184,"184"]],
   splitTitle:"Where they came from",
   split:[["Referral","78","42%",1],["Search","61","33%",0],["Trade shows","29","16%",0],["Direct","16","9%",0]],
   tableCols:["Channel","Enquiries","Change","Cost each"],
   table:[["Referral","78","+18.2%","€0.00"],["Search","61","+9.4%","€24.60"],["Trade shows","29","−6.1%","€41.20"],["Direct","16","+2.0%","€0.00"]],
   metrics:[["Enquiries","184","+31","up","30 days",[.3,.4,.36,.5,.46,.6,.58,.7,.86]],
     ["New accounts","12","+4","up","opened",[.2,.3,.24,.4,.36,.5,.44,.6,.7]],
     ["Cost per enquiry","€18.40","−€2.10","up","blended",[.8,.76,.7,.66,.6,.56,.5,.46,.4]],
     ["Repeat rate","68%","+3pt","up","ordering again",[.5,.54,.58,.56,.62,.64,.66,.7,.74]]]},
  {id:"operations", label:"Operations", color:"#dcded6", owner:"JOHN CULKIN", description:"Stock, transfers, loan sets and the order queue.",
   kind:"stacked", legend:["Main stockroom","Harbour consignment site","Riverpark site"], stacked:[["Sep",[34,28,9]],["Oct",[36,30,9]],["Nov",[39,32,10]],["Dec",[37,31,10]],["Jan",[32,27,8]],["Feb",[35,29,9]],["Mar",[40,33,10]],["Apr",[43,35,11]],["May",[46,37,12]],["Jun",[49,39,12]],["Jul",[52,42,13]],["Aug",[64,48,14]]], chartTitle:"Jobs completed by month", chartUnit:"JOBS",
   chart:[["Sep",88,"88"],["Oct",94,"94"],["Nov",102,"102"],["Dec",96,"96"],["Jan",84,"84"],["Feb",91,"91"],["Mar",104,"104"],["Apr",112,"112"],["May",118,"118"],["Jun",121,"121"],["Jul",124,"124"],["Aug",126,"126"]],
   splitTitle:"By location",
   split:[["Main stockroom","64","51%",1],["Harbour consignment site","48","38%",0],["Riverpark site","14","11%",0]],
   tableCols:["Person","Jobs","On time","Location"],
   table:[["Rory Whelan","41","94%","Harbour"],["John Culkin","34","88%","Main stockroom"],["Aileen Cahalane","28","96%","Main stockroom"],["Unassigned","4","n/a","Harbour"]],
   metrics:[["Jobs completed","126","+4","up","30 days",[.5,.6,.5,.66,.6,.7,.66,.76,.84]],
     ["Overdue tasks","11","+3","down","past due",[.3,.36,.3,.44,.4,.5,.56,.7,.85]],
     ["Visits completed","38","+11%","up","30 days",[.4,.5,.6,.5,.66,.6,.72,.8,.9]],
     ["Scan coverage","86%","−2pt","down","lines scanned",[.8,.78,.8,.76,.78,.74,.76,.72,.7]]]},
  {id:"finance", label:"Finance", color:"#7fd8a4", owner:"AOIFE NOLAN", description:"Cash in, debt ageing and margin after cost.",
   kind:"area", chartTitle:"Cash collected by month", chartUnit:"EUR",
   chart:[["Sep",252,"€0k"],["Oct",268,"€0k"],["Nov",296,"€0k"],["Dec",318,"€0k"],["Jan",246,"€0k"],["Feb",264,"€0k"],["Mar",288,"€0k"],["Apr",306,"€0k"],["May",324,"€0k"],["Jun",342,"€0k"],["Jul",358,"€0k"],["Aug",368,"€0k"]],
   splitTitle:"Debt by age",
   split:[["0 to 30 days","€184.2k","61%",1],["31 to 60 days","€82.4k","27%",0],["61 to 90 days","€28.6k","9%",0],["90 days plus","€12.6k","4%",0]],
   tableCols:["Account","Balance","Change","Oldest"],
   table:[["South Dublin Surgical Centre","€8,750","+42.0%","74 days"],["Liffey Surgical Clinic","€9,240","+11.2%","63 days"],["Eastgate Orthopaedics","€3,560","−4.4%","61 days"],["Atlantic Sports Surgery","€1,180","−22.0%","8 days"]],
   metrics:[["Cash collected","€368,140","+4.1%","up","30 days",[.5,.56,.5,.62,.58,.68,.66,.74,.8]],
     ["Overdue debt","€41,200","+€8,410","down","60 days plus",[.3,.34,.4,.38,.46,.5,.6,.7,.84]],
     ["Gross margin","31.4%","−0.6pt","down","vs last month",[.7,.72,.7,.68,.68,.66,.64,.62,.6]],
     ["Days to pay","38","+6","down","weighted",[.4,.44,.42,.5,.52,.6,.62,.7,.76]]]},
  {id:"support", label:"Support", color:"#e2705c", owner:"NIAMH CRONIN", description:"Callbacks, warranty work and what came back twice.",
   kind:"dots", target:12, targetLabel:"Target: 12 callbacks a month or fewer", chartTitle:"Callbacks by month", chartUnit:"COUNT",
   chart:[["Sep",18,"18"],["Oct",16,"16"],["Nov",21,"21"],["Dec",19,"19"],["Jan",24,"24"],["Feb",22,"22"],["Mar",17,"17"],["Apr",15,"15"],["May",14,"14"],["Jun",12,"12"],["Jul",9,"9"],["Aug",7,"7"]],
   splitTitle:"By cause",
   split:[["Install fault","3","43%",1],["Part failure","2","29%",0],["User error","2","28%",0]],
   tableCols:["Site","Callbacks","First-visit fix","Cost"],
   table:[["Riverpark Day Surgery","2","50%","€840"],["Harbour Orthopaedic Clinic","2","100%","€410"],["Liffey Surgical Clinic","2","100%","€1,240"],["Westside Specialist Centre","1","100%","€650"]],
   metrics:[["Open callbacks","7","−2","up","live",[.6,.58,.54,.5,.48,.44,.4,.38,.34]],
     ["First-visit fix","82%","+4pt","up","of callbacks",[.5,.54,.56,.6,.6,.66,.7,.74,.8]],
     ["Warranty cost","€3,140","−€420","up","30 days",[.7,.66,.62,.6,.54,.5,.46,.44,.4]],
     ["Repeat faults","3","−1","up","same site",[.5,.5,.46,.4,.4,.36,.3,.3,.26]]]}
];

const FILTER_GROUPS = [
  {title:"AREA", items:["Sales","Development","Marketing","Operations","Finance","Support"]},
  {title:"SPINE", items:["Location","Team","Person","Organisation","Module"]},
  {title:"TIME", items:["This week","This month","This quarter","Year to date"]}
];

const OPS_DEFS = [
  {id:"o1", name:"Morning briefing", kind:"routine", owner:"Briefing Agent", ownerKind:"agent", initials:"BR",
   trigger:"Weekdays, 07:00", triggerKind:"schedule", next:"Tomorrow 07:00", last:"Delivered 07:02", status:"healthy", rate:100, on:true,
   what:"Reads stock, orders, sales and finance overnight and tells Graham the few things that need a person today.",
   why:"The answers were spread across the ERP, spreadsheets and people's heads.",
   saved:"6 hours a month (estimate, to be measured)",
   steps:[["Trigger","Every weekday at 07:00"],["Find","Overnight changes across stock, orders, sales and cash"],["Check","Drop anything already handled"],["Draft","Write the briefing with links"],["Send","Post to Home"]],
   runs:[["Today 07:00","22s","ok","1 briefing","€0.02"],["Yesterday 07:00","19s","ok","1 briefing","€0.02"],["Tue 07:00","24s","ok","1 briefing","€0.02"]]},
  {id:"o2", name:"Hospital stock watch", kind:"routine", owner:"Stock & Traceability Agent", ownerKind:"agent", initials:"ST",
   trigger:"Daily, 06:00", triggerKind:"schedule", next:"Tomorrow 06:00", last:"4 lines below par", status:"approval", rate:97, on:true,
   what:"Compares every consignment line with its par level and drafts the transfer that tops it up from the main stockroom.",
   why:"Sites ran short before anyone noticed, then needed urgent couriers.",
   saved:"5 hours a month (estimate, to be measured)",
   steps:[["Trigger","Every day at 06:00"],["Find","Consignment lines below par"],["Check","Central stock, first-expiring lot"],["Draft","Transfer request"],["Approval","Operations Director approves","gate"],["Update","Move stock and record the movement"]],
   runs:[["Today 06:00","31s","ok","4 lines flagged","€0.02"],["Yesterday 06:00","28s","ok","3 lines flagged","€0.02"]]},
  {id:"o3", name:"Overdue follow-up nudges", kind:"automation", owner:"Sales Agent", ownerKind:"agent", initials:"SA",
   trigger:"Weekdays, 08:15", triggerKind:"schedule", next:"Tomorrow 08:15", last:"7 overdue flagged", status:"healthy", rate:99, on:true,
   what:"Finds opportunities whose next step is overdue and puts a suggested follow-up on the owner's My Day.",
   why:"Opportunities went quiet for weeks between field visits.",
   saved:"8 hours a month (estimate, to be measured)",
   steps:[["Trigger","Every weekday at 08:15"],["Find","Open opportunities past their next-step date"],["Draft","Suggested follow-up per rep"],["Update","Show on My Day and the planner"]],
   runs:[["Today 08:15","6s","ok","7 flagged","€0.01"],["Yesterday 08:15","7s","ok","6 flagged","€0.01"]]},
  {id:"o4", name:"Order scan check", kind:"automation", owner:"Order Flow Agent", ownerKind:"agent", initials:"OF",
   trigger:"Hourly, 08:00 to 17:00", triggerKind:"schedule", next:"15:00", last:"SO-1047 at 3 of 5", status:"healthy", rate:98, on:true,
   what:"Checks every order due out today for unscanned lines and missing lot, serial or expiry before the courier cut-off.",
   why:"Orders were held at the door for a missing lot number.",
   saved:"4 hours a month (estimate, to be measured)",
   steps:[["Trigger","Every hour in working time"],["Find","Orders due out today"],["Check","Unscanned lines and missing identifiers"],["Send","Alert the order owner"]],
   runs:[["Today 14:00","3s","ok","1 at risk","€0.00"],["Today 13:00","3s","ok","1 at risk","€0.00"]]},
  {id:"o5", name:"Invoice reminder drafts", kind:"automation", owner:"Finance Agent", ownerKind:"agent", initials:"FA",
   trigger:"Daily, 08:30", triggerKind:"schedule", next:"Tomorrow 08:30", last:"12 overdue, 1 drafted", status:"approval", rate:95, on:true,
   what:"Drafts reminders for invoices past due. Margaret reviews and sends them; Pulse never contacts a customer itself.",
   why:"Chasing happened in bursts, so the oldest debt got the least attention.",
   saved:"5 hours a month (estimate, to be measured)",
   steps:[["Trigger","Every day at 08:30"],["Find","Invoices past due"],["Check","Exclude disputed invoices"],["Draft","Reminder in Hogan's tone"],["Approval","Margaret reviews and sends","gate"],["Update","Log the reminder"]],
   runs:[["Today 08:30","9s","ok","1 drafted","€0.01"],["Yesterday 08:30","8s","ok","2 drafted","€0.01"]]},
  {id:"o6", name:"Three-way bill match", kind:"automation", owner:"Purchasing Agent", ownerKind:"agent", initials:"PA",
   trigger:"When a supplier bill arrives", triggerKind:"event", next:"Event-based", last:"BILL-2034 mismatch", status:"approval", rate:96, on:true,
   what:"Matches each supplier bill to its purchase order and goods receipt, and holds any bill that does not match for a person.",
   why:"Over-billing was only spotted at month-end, if at all.",
   saved:"6 hours a month (estimate, to be measured)",
   steps:[["Trigger","A supplier bill is received"],["Find","Its purchase order and goods receipt"],["Check","Quantity and price"],["Approval","Margaret resolves mismatches","gate"],["Update","Mark matched or held"]],
   runs:[["Today 09:05","2s","partial","BILL-2034 held: billed 14, received 12","€0.00"],["Tue 11:20","2s","ok","BILL-2031 matched","€0.00"]]},
  {id:"o7", name:"ERP nightly read (demo)", kind:"automation", owner:"Ops Watchdog", ownerKind:"agent", initials:"OW",
   trigger:"Nightly, 02:00", triggerKind:"schedule", next:"Paused", last:"Connection not verified", status:"healthy", rate:0, on:false,
   what:"Would read orders, customers, products and stock movements from the current ERP. Paused until the connection is verified.",
   why:"Pulse sits above the ERP rather than replacing it.",
   saved:"0 hours (not running)",
   steps:[["Trigger","Every night at 02:00"],["Find","Changed records in the ERP"],["Update","Refresh Pulse records"]],
   runs:[["Not run","-","partial","paused: demo data in use","€0.00"]]},
  {id:"o8", name:"Friday team review pack", kind:"report", owner:"Sales Agent", ownerKind:"agent", initials:"SA",
   trigger:"Fridays, 15:00", triggerKind:"schedule", next:"Fri 15:00", last:"Sent to Graham", status:"healthy", rate:100, on:true,
   what:"Pulls the week's pipeline, missed commitments and next week's drafted plans into one page for Graham's Friday review.",
   why:"Graham wants to review the whole team on Friday and plan Monday to Friday.",
   saved:"4 hours a month (estimate, to be measured)",
   steps:[["Trigger","Every Friday at 15:00"],["Find","This week's activity and next week's drafts"],["Draft","The review pack"],["Send","Post to Graham's Home"]],
   runs:[["Fri 13 Nov 15:00","41s","ok","1 pack","€0.03"],["Fri 6 Nov 15:00","38s","ok","1 pack","€0.03"]]},
  {id:"o9", name:"Expiry and certificate watch", kind:"routine", owner:"Quality & Compliance Agent", ownerKind:"agent", initials:"QC",
   trigger:"Mondays, 07:30", triggerKind:"schedule", next:"Mon 07:30", last:"1 CE certificate in 60 days", status:"healthy", rate:100, on:true,
   what:"Lists lots expiring in the next 90 days and supplier certificates nearing expiry, for a person to act on.",
   why:"Short-dated stock was found at sites too late to swap.",
   saved:"3 hours a month (estimate, to be measured)",
   steps:[["Trigger","Every Monday at 07:30"],["Find","Lots and certificates near expiry"],["Send","Flag to Operations and Quality"]],
   runs:[["Mon 07:30","12s","ok","4 lots, 1 certificate","€0.01"]]},
  {id:"o10", name:"Rental return reminders", kind:"task", owner:"Ops Watchdog", ownerKind:"agent", initials:"OW",
   trigger:"Two days before a hire ends", triggerKind:"event", next:"Event-based", last:"RN-0204 due 20 Nov", status:"healthy", rate:100, on:true,
   what:"Reminds the team when a NICE1 hire is ending and queues cleaning and inspection for the returned unit.",
   why:"Units sat uncleaned between hires.",
   saved:"2 hours a month (estimate, to be measured)",
   steps:[["Trigger","Two days before hire end"],["Send","Reminder to John"],["Update","Queue cleaning and inspection"]],
   runs:[["Today 09:00","1s","ok","1 reminder","€0.00"]]},
  {id:"o11", name:"Month-end pack", kind:"report", owner:"Finance Agent", ownerKind:"agent", initials:"FA",
   trigger:"1st, 07:00", triggerKind:"schedule", next:"1 Dec 07:00", last:"Delivered 1 Nov", status:"healthy", rate:95, on:true,
   what:"Assembles revenue, cost of sales, gross margin, EBITDA and aged debt into one pack. Figures depend on the accounting integration.",
   why:"Graham wanted EBITDA and margins without waiting for the accountant.",
   saved:"8 hours a month (estimate, to be measured)",
   steps:[["Trigger","First of the month at 07:00"],["Find","Last month's figures"],["Check","Reconcile against the bank"],["Draft","The commentary"],["Send","Post to Graham and Margaret"]],
   runs:[["1 Nov 07:00","3m 42s","ok","1 pack","€0.09"],["1 Oct 07:00","3m 51s","ok","1 pack","€0.09"]]}
];

const OPS_FILTERS = [
  ["all","All"], ["routine","Agent routines"], ["automation","Automations"],
  ["report","Scheduled reports"], ["task","Recurring tasks"], ["approval","Needs approval"], ["failed","Failed"]
];

const WORK_SECTIONS = [
  {id:"tasks", label:"My Tasks", blurb:"Everything assigned to you or your team.", views:["All tasks","Due tasks","Review","Done"], filters:["Due date","Any status","Anyone","Any due date"]},
  {id:"approvals", label:"Approvals", blurb:"Requests and their steps. Every decision is written as the person who made it.", views:["Awaiting you","Awaiting others","Decided"], filters:["Raised date","Any value","Anyone"]},
  {id:"workflows", label:"Workflows", blurb:"Routines and automations: what runs on its own, who owns it, and where it waits for a person.", views:[], filters:[]},
  {id:"schedules", label:"Schedule", blurb:"When recurring work fires: briefings, stock watch, follow-up nudges and month-end.", views:[], filters:[]}
];

const WORK_TASKS = [
  {id:"w1", title:"Chase INV-6128 · South Dublin Surgical Centre", status:"In progress", priority:"High", who:"AN",
   due:"2d overdue", late:true, client:"South Dublin Surgical Centre", day:"Today", mins:"25 mins", view:"Due tasks"},
  {id:"w2", title:"Reassign the courier jobs off Harbour", status:"In progress", priority:"High", who:"MK",
   due:"Due today", late:false, client:"Harbour consignment site", day:"Today", mins:"50 mins", view:"Due tasks"},
  {id:"w3", title:"Approve purchase order PO-341", status:"Review", priority:"Medium", who:"MK",
   due:"Due 12:00", late:false, client:"Halcyon Orthopaedics", day:"Today", mins:"15 mins", view:"Review"},
  {id:"w4", title:"Sign off August counter stocktake", status:"Not started", priority:"Medium", who:"SB",
   due:"No due date", late:false, client:"Main stockroom", day:"Any day", mins:"Mins", view:"All tasks"},
  {id:"w5", title:"Harbour lease decision", status:"Not started", priority:"High", who:"MK",
   due:"Thursday", late:false, client:"Harbour consignment site", day:"Thu", mins:"1 hour", view:"All tasks"},
  {id:"w6", title:"VAT return · August", status:"Done", priority:"Medium", who:"AN",
   due:"Filed Friday", late:false, client:"Main stockroom", day:"Fri", mins:"2 hours", view:"Done", done:true}
];

const WORKFLOWS = [
  {name:"Overdue invoice reminder", state:"live", trigger:"schedule · daily 08:00",
   actions:[["notify.email","write"],["tasks.create","write"]], lastRun:"Today 08:00",
   result:"6 of 10 sent · partial", resultKind:"warn", runSummary:"11 ok · 3 partial",
   runs:["ok","ok","partial","ok","ok","ok","partial","ok","ok","ok","ok","ok","partial","partial"]},
  {name:"Approval routing over €10k", state:"live", trigger:"event · core.approval.created",
   actions:[["approvals.route","read"],["notify.inbox","write"]], lastRun:"Today 08:54",
   result:"ok", resultKind:"ok", runSummary:"14 ok",
   runs:["ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","ok"]},
  {name:"Unassigned visit escalation", state:"live", trigger:"event · site-visits.visit.created",
   actions:[["notify.inbox","write"]], lastRun:"Today 07:00",
   result:"ok", resultKind:"ok", runSummary:"9 ok · 1 failed",
   runs:["idle","idle","ok","ok","failed","ok","ok","ok","idle","ok","ok","ok","ok","ok"]},
  {name:"Xero invoice sync", state:"failing", trigger:"schedule · hourly",
   actions:[["xero.post","external"]], lastRun:"Today 02:14",
   result:"invalid_grant · dead-lettered", resultKind:"bad", runSummary:"4 failed",
   runs:["ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","failed","failed","failed","failed"]}
];

const SCHEDULES = [
  {id:"s1", name:"Morning briefing", cadence:"Every weekday · 07:00", next:"Tomorrow 07:00", owner:"Briefing Agent", on:true, day:1},
  {id:"s2", name:"Hospital stock watch", cadence:"Daily · 06:00", next:"Tomorrow 06:00", owner:"Stock & Traceability Agent", on:true, day:1},
  {id:"s3", name:"ERP nightly read (demo)", cadence:"Nightly · 02:00", next:"Paused", owner:"Ops Watchdog", on:false, day:0},
  {id:"s4", name:"Friday team review pack", cadence:"Fridays · 15:00", next:"Fri 15:00", owner:"Sales Agent", on:true, day:4},
  {id:"s5", name:"Month-end pack", cadence:"1st of the month · 07:00", next:"1 Dec 07:00", owner:"Finance Agent", on:true, day:0}
];

const WIDGET_DEFS = [["inbox","Action inbox"],["work","My work"],["activity","Activity"],["kpi","Today's numbers"],["visits","Site visits"]];
const WORK_WIDGETS = [
  {id:"queue", label:"My queue", value:"8", hint:"assigned to you", icon:"work", queue:"mine"},
  {id:"late", label:"Running late", value:"11", hint:"past their due date", icon:"health", queue:"overdue"},
  {id:"unassigned", label:"Unassigned", value:"1", hint:"nobody owns it yet", icon:"teams", queue:"unassigned"},
  {id:"week", label:"Next 7 days", value:"4", hint:"due this week", icon:"visits", queue:"upcoming"}
];
const PERSONALITIES = ["Straight-talking","Warm","Formal","Dry"];
const ANSWER_STYLES = ["Short answers","Show the working","Ask before acting"];
/* Every context source and every registered tool the agent could be granted —
   the builder shows the whole catalogue, grouped, rather than a sample. */
const CONTEXT_DEFS = [
  ["Accounts","records","Hospitals, clinics and their contacts"],
  ["People","records","Staff and external contacts"],
  ["Files","records","Agreements, certificates, SOPs"],
  ["Tasks","work","Queues, owners, due dates"],
  ["Stock & lots","work","Locations, par levels, lots, serials, expiry"],
  ["Approvals","work","What is waiting on a decision"],
  ["Orders","money","Sales and purchase orders"],
  ["Invoices","money","Issued, paid, past due"],
  ["Supplier bills","money","Matched, held, paid"],
  ["Activity log","system","Every event, agent and human"],
  ["Modules","system","What Hogan has switched on"],
  ["Insights","system","Saved metrics and trends"]
];
const CONTEXT_SOURCES = CONTEXT_DEFS.map(c => c[0]);
const SKILL_DEFS = [
  ["Search records","read"],["Summarise activity","read"],["Read invoices","read"],
  ["Read stock and lots","read"],["Check permissions","read"],
  ["Draft email","write"],["Create task","write"],["Update record","write"],
  ["Propose transfer","write"],["Raise approval","write"],
  ["Send email (a person sends)","external"],["Post to accounting (blocked)","external"],["Write to ERP (blocked)","external"]
];
/* The two questions the agent asks back once it knows the job. */
const TRAIN_PHASES = [
  ["Reading the whole ontology", "1,240 units · 132 products · 20 accounts"],
  ["Learning how Hogan words things", "organisation → account / hospital"],
  ["Studying medical-device distribution", "lots, serials, UDI, consignment"],
  ["Writing its own system prompt", "1,240 tokens"]
];
const BRIEF_QUESTIONS = [
  {title:"What should it cover?", sub:"Pick as many as you like. We can refine later.",
   options:[["Stock","Hospital par levels, lots and expiry"],["Orders","Picking, scans and dispatch"],
            ["Accounts","Hospitals that moved since yesterday"],["Money","Cash, overdue and anything at risk"],
            ["Something else","Tell me in the next message"]]},
  {title:"When should it land?", sub:"One is enough to start.",
   options:[["Every morning 07:30","Before the first theatre list"],["Weekdays 08:00","Monday to Friday only"],
            ["Only when something changes","Event-driven, no noise"],["On demand","When you ask for it"]]}
];
/* The words under a name, keyed to the same state the face lights with. */
const STATE_LABELS = {working:"working", thinking:"thinking", waiting:"waiting on you",
  complete:"up to date", attention:"needs you", idle:"idle"};

const FACE_SHAPES = [
  ["crown-pebble","Pebble"],["executive-capsule","Executive"],["shield","Shield"],
  ["glass-visor","Visor"],["control-cube","Control cube"],["low-dome","Low dome"],
  ["offset-pebble","Offset pebble"],["rim-capsule","Capsule"],["wide-eyed","Wide-eyed"],
  ["precision-brow","Precision brow"],["tall-unit","Tall unit"],["soft-asymmetric","Soft asymmetric"]
];
/* Shell colours only, deliberately desaturated so none of them reads as a
   state. Each is a pair: the deep shell for light themes and its pale partner
   for dark ones (the eyes take the other). The status light carries the state. */
const FACE_TINTS = [
  ["#191c1f","Graphite","#e3e6e8"],["#1b2430","Slate","#d3dde9"],["#241b2e","Aubergine","#ddd4ea"],
  ["#2a2118","Bronze","#eadccb"],["#16241f","Pine","#d1e4da"],["#2b1b1e","Oxblood","#eed5d7"]
];

/* ---- ontology graph: generation, Dijkstra traversal, canvas render ---- */
const CLUSTERS = [
  ["Hospitals",      "#4A9DA5", 0.00, 0.62, 46],
  ["People",         "#7FB8C9", 0.90, 0.70, 52],
  ["Products",       "#9d8cf5", 1.75, 0.66, 58],
  ["Lots",           "#f0c04b", 2.55, 0.72, 44],
  ["Invoices",       "#f0567f", 3.35, 0.60, 38],
  ["Movements",      "#5fe0a8", 4.15, 0.70, 40],
  ["Orders",         "#f0803a", 4.95, 0.64, 30],
  ["Suppliers",      "#6ad0f0", 5.65, 0.72, 34]
];

function mulberry(seed){
  return function(){
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* Hub-and-spoke clusters around a dense phyllotaxis core, in unit space
   (-1..1 on both axes) so the layout is resolution independent. */
const _hexCache = {};
function hexRGB(hex){
  if (_hexCache[hex]) return _hexCache[hex];
  const h = hex.replace("#", "");
  const v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  _hexCache[hex] = v;
  return v;
}


function buildGraph(){
  const rnd = mulberry(20260902);
  const nodes = [], edges = [], adj = [];
  const add = (x, y, z, r, cluster, kind) => {
    nodes.push({x, y, z, r, cluster, kind}); adj.push([]); return nodes.length - 1;
  };
  const link = (a, b) => {
    const dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y, dz = nodes[a].z - nodes[b].z;
    const w = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.004;
    const id = edges.length;
    edges.push({a, b, w});
    adj[a].push([b, w, id]); adj[b].push([a, w, id]);
  };

  // the core is a filled sphere on a Fibonacci lattice, not a disc
  const CORE = 880, coreIds = [];
  for (let i = 0; i < CORE; i++){
    const t = (i + 0.5) / CORE;
    const phi = Math.acos(1 - 2 * t);
    const theta = i * 2.39996;
    const shell = 0.16 + 0.28 * Math.pow(rnd(), 0.5);
    const grade = rnd();
    coreIds.push(add(
      Math.sin(phi) * Math.cos(theta) * shell * 1.04,
      Math.cos(phi) * shell * 0.96,
      Math.sin(phi) * Math.sin(theta) * shell,
      grade < 0.06 ? 3.4 + rnd() * 1.4 : grade < 0.3 ? 2.1 + rnd() * 0.7 : 1.0 + rnd() * 0.8, 0, "core"));
  }
  // lattice neighbours plus a mesh of chords, so the sphere reads as a volume
  for (let i = 1; i < coreIds.length; i++){
    link(coreIds[i], coreIds[i - 1]);
    if (i >= 13) link(coreIds[i], coreIds[i - 13]);
    if (i >= 21 && i % 2 === 0) link(coreIds[i], coreIds[i - 21]);
    if (i >= 34 && i % 3 === 0) link(coreIds[i], coreIds[i - 34]);
    if (i >= 55 && i % 4 === 0) link(coreIds[i], coreIds[i - 55]);
    if (i >= 89 && i % 5 === 0) link(coreIds[i], coreIds[i - 89]);
    if (i % 6 === 0) link(coreIds[i], coreIds[Math.floor(rnd() * coreIds.length)]);
  }

  // a mid shell between the nucleus and the lobes: the layer that makes it
  // read as a network rather than a ball with satellites
  const MID = 560, midIds = [];
  for (let i = 0; i < MID; i++){
    const t = (i + 0.5) / MID;
    const phi = Math.acos(1 - 2 * t), theta = i * 2.39996 + 0.7;
    const d = 0.52 + 0.16 * Math.pow(rnd(), 0.6);
    const g2 = rnd();
    midIds.push(add(
      Math.sin(phi) * Math.cos(theta) * d * 1.02,
      Math.cos(phi) * d * 0.96,
      Math.sin(phi) * Math.sin(theta) * d,
      g2 < 0.05 ? 2.6 + rnd() * 1.0 : g2 < 0.3 ? 1.6 + rnd() * 0.6 : 0.8 + rnd() * 0.7, 0, "core"));
  }
  for (let i = 0; i < midIds.length; i++){
    if (i >= 1) link(midIds[i], midIds[i - 1]);
    if (i >= 17) link(midIds[i], midIds[i - 17]);
    if (i >= 29 && i % 2 === 0) link(midIds[i], midIds[i - 29]);
    // radial spokes tying the shell to the nucleus
    if (i % 2 === 0) link(midIds[i], coreIds[Math.floor(rnd() * coreIds.length)]);
    if (i % 9 === 0) link(midIds[i], coreIds[Math.floor(rnd() * coreIds.length)]);
  }

  // clusters ride a sphere: each hub gets its own latitude as well as longitude
  const hubs = [], clusterLeaves = [];
  const onSphere = (lon, lat, d0) => { const d = d0 * 1.22;
    return [Math.cos(lat) * Math.cos(lon) * d * 1.02, Math.sin(lat) * d * 0.96, Math.cos(lat) * Math.sin(lon) * d]; };
  CLUSTERS.forEach((c, ci) => {
    const [, , ang, dist, leaves] = c;
    const lat = (ci % 2 ? 1 : -1) * (0.26 + rnd() * 0.5);
    const wob = 1.06 + rnd() * 0.16;
    const hp = onSphere(ang, lat, dist * wob);
    const hub = add(hp[0], hp[1], hp[2], 5.4, ci, "hub");
    hubs.push(hub);
    const mine = [];
    clusterLeaves.push(mine);
    for (let k = 0; k < 3; k++) link(hub, coreIds[Math.floor(rnd() * coreIds.length)]);
    for (let k = 0; k < 5; k++) link(hub, midIds[Math.floor(rnd() * midIds.length)]);

    const subs = 5 + Math.floor(rnd() * 4);
    const subIds = [];
    for (let s = 0; s < subs; s++){
      const sa = ang + (rnd() - 0.5) * 0.52, sl = lat + (rnd() - 0.5) * 0.3;
      const sd = dist + 0.08 + rnd() * 0.18;
      const sp = onSphere(sa, sl, sd);
      const sub = add(sp[0], sp[1], sp[2], 3.2, ci, "sub");
      subIds.push(sub);
      link(sub, hub);
      if (s > 0 && rnd() < 0.7) link(sub, subIds[s - 1]);
      const fan = Math.floor((leaves * 7.4) / subs);
      const spread = 0.17 + rnd() * 0.2;
      let prev = -1;
      for (let l = 0; l < fan; l++){
        const la = sa + (rnd() - 0.5) * spread * 2 + (rnd() - 0.5) * 0.06;
        const ll = sl + (rnd() - 0.5) * spread * 1.1;
        const ld = sd + 0.03 + Math.pow(rnd(), 0.8) * 0.17;
        const lp = onSphere(la, ll, ld);
        const lg = rnd();
        const leaf = add(lp[0], lp[1], lp[2],
          lg < 0.08 ? 2.8 + rnd() * 1.2 : lg < 0.34 ? 1.8 + rnd() * 0.6 : 1.0 + rnd() * 0.7, ci, "leaf");
        link(leaf, sub);
        mine.push(leaf);
        if (rnd() < 0.14) link(leaf, hub);
        if (prev >= 0 && rnd() < 0.34) link(leaf, prev);
        if (rnd() < 0.16) link(leaf, midIds[Math.floor(rnd() * midIds.length)]);
        prev = leaf;
      }
    }
  });
  // far satellites hanging off the outer leaves
  CLUSTERS.forEach((c, ci) => {
    const [, , ang, dist] = c;
    for (let s = 0; s < 7; s++){
      const sa = ang + (rnd() - 0.5) * 1.5, sl = (rnd() - 0.5) * 1.3;
      const sd = dist + 0.42 + rnd() * 0.22;
      const ap = onSphere(sa, sl, sd);
      const anchor = add(ap[0], ap[1], ap[2], 2.4, ci, "sub");
      link(anchor, hubs[ci]);
      const n = 14 + Math.floor(rnd() * 18);
      for (let l = 0; l < n; l++){
        const la = sa + (rnd() - 0.5) * 0.9, ll = sl + (rnd() - 0.5) * 0.7;
        const ld = sd + 0.02 + Math.pow(rnd(), 0.8) * 0.18;
        const p = onSphere(la, ll, ld);
        const leaf = add(p[0], p[1], p[2], 0.8 + rnd() * 0.9, ci, "leaf");
        link(leaf, anchor);
        clusterLeaves[ci].push(leaf);
      }
    }
  });

  // two hub rings and long chords across the sphere
  hubs.forEach((h, i) => {
    link(h, hubs[(i + 1) % hubs.length]);
    link(h, hubs[(i + 2) % hubs.length]);
    if (i % 3 === 0) link(h, hubs[(i + 4) % hubs.length]);
  });
  // neighbouring clusters share records, so their leaves cross-link
  for (let ci = 0; ci < clusterLeaves.length; ci++){
    const a = clusterLeaves[ci], b = clusterLeaves[(ci + 1) % clusterLeaves.length];
    const n = 26 + Math.floor(rnd() * 16);
    for (let k = 0; k < n; k++){
      link(a[Math.floor(rnd() * a.length)], b[Math.floor(rnd() * b.length)]);
    }
    // and a good number reach right across to the far side
    for (let k = 0; k < 12; k++){
      const far = clusterLeaves[(ci + 3) % clusterLeaves.length];
      link(a[Math.floor(rnd() * a.length)], far[Math.floor(rnd() * far.length)]);
    }
    for (let k = 0; k < 8; k++){
      const far = clusterLeaves[(ci + 4) % clusterLeaves.length];
      link(a[Math.floor(rnd() * a.length)], far[Math.floor(rnd() * far.length)]);
    }
  }

  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, minZ = 1e9, maxZ = -1e9;
  for (const n of nodes){
    if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
    if (n.z < minZ) minZ = n.z; if (n.z > maxZ) maxZ = n.z;
  }
  const bounds = {minX, maxX, minY, maxY, cx:(minX + maxX) / 2, cy:(minY + maxY) / 2,
    cz:(minZ + maxZ) / 2, w:maxX - minX, h:maxY - minY, d:maxZ - minZ,
    radius: Math.max(maxX - minX, maxY - minY, maxZ - minZ) / 2,
    reach: nodes.reduce((m, n) => Math.max(m, Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z)), 0)};
  return {nodes, edges, adj, hubs, coreIds, bounds};
}

export {
  INK,
  BODY,
  DIM,
  FAINT,
  LIME,
  GREEN,
  AMBER,
  RED,
  NEUTRAL,
  MONO,
  ICONS,
  REC_SECTIONS,
  CONTACTS,
  FILE_TREE,
  ONTO_NODES,
  ONTO_EDGES,
  REC_TEMPLATES,
  REC_TEMPLATE_CATS,
  PEOPLE,
  ROLE_LEVELS,
  PERM_KEYS,
  GRANT_DEFS,
  ROLE_SCOPES,
  DEFAULT_PERMS,
  INTEGRATIONS,
  BG_DEFS,
  THEMES,
  ADMIN_ICONS,
  ADMIN_CARDS,
  ADMIN_GROUPS,
  SRC_TINT,
  SRC_ABBR,
  DATA_EVENTS,
  PEOPLE_EVENTS,
  AI_EVENTS,
  STREAM_DEFS,
  NAV,
  ITEMS,
  ORDER,
  ANSWERS,
  synthesizeCustomArea,
  pickAnswer,
  ORGS,
  TEAMS,
  LOCATIONS,
  AGENT_DEFS,
  KPI_DEFS,
  ASPECT_DEFS,
  FILTER_GROUPS,
  OPS_DEFS,
  OPS_FILTERS,
  WORK_SECTIONS,
  WORK_TASKS,
  WORKFLOWS,
  SCHEDULES,
  WIDGET_DEFS,
  WORK_WIDGETS,
  PERSONALITIES,
  ANSWER_STYLES,
  CONTEXT_DEFS,
  CONTEXT_SOURCES,
  SKILL_DEFS,
  TRAIN_PHASES,
  BRIEF_QUESTIONS,
  STATE_LABELS,
  FACE_SHAPES,
  FACE_TINTS,
  CLUSTERS,
  mulberry,
  _hexCache,
  hexRGB,
  buildGraph
};
