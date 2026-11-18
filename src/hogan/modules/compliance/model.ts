/* Compliance: document control and register derivations.
   QUALITY_DOCS is static demo data; review decisions made in the demo are kept
   as overrides in the UI state (key DOC_KEY) and logged as human decisions. */

import * as D from "../../data";

export type DocStatus = D.QualityDoc["status"];
export type DocOverride = { status?: DocStatus; reviewed?: string; nextReview?: string; version?: string; requested?: string };
export type DocState = Record<string, DocOverride>;
export type DocView = D.QualityDoc & { requested?: string };
export const DOC_KEY = "compliance.docState";

export function docView(doc: D.QualityDoc, st: DocState): DocView {
  return { ...doc, ...(st[doc.id] || {}) };
}
export function allDocs(st: DocState): DocView[] {
  return D.QUALITY_DOCS.map(d => docView(d, st));
}

/* Which devices each supplier document covers (demo document map). */
const COVER: Record<string, (p: D.Product) => boolean> = {
  "QD-008": p => p.supplier === "HAL",
  "QD-009": p => p.supplier === "POL",
  "QD-010": p => p.sku === "HH-OR-239",
  "QD-011": p => p.sku === "HH-OR-233",
  "QD-012": p => p.supplier === "VER" && p.cat === "OR",
  "QD-013": p => p.supplier === "AQU",
  "QD-014": p => p.supplier === "ART",
  "QD-015": p => p.supplier === "CEL",
  "QD-018": p => p.supplier === "CON" && p.cat === "SM",
};

export function docProducts(docId: string): D.Product[] {
  const f = COVER[docId];
  return f ? D.PRODUCTS.filter(f) : [];
}
export function docsForProduct(sku: string, st: DocState): DocView[] {
  const p = D.productBySku(sku);
  if (!p) return [];
  return D.QUALITY_DOCS.filter(d => COVER[d.id]?.(p)).map(d => docView(d, st));
}

export const DOC_RANK: Record<DocStatus, number> = { Missing: 0, Expiring: 1, "Review due": 2, Draft: 3, Current: 4 };
export type DevDocStatus = DocStatus | "Pack reference";

/** Worst status across the documents covering a device. "Pack reference" when only the supplier pack reference is held. */
export function productDocStatus(sku: string, st: DocState): { status: DevDocStatus; docs: DocView[] } {
  const docs = docsForProduct(sku, st);
  if (!docs.length) return { status: "Pack reference", docs };
  const worst = docs.slice().sort((a, b) => DOC_RANK[a.status] - DOC_RANK[b.status])[0];
  return { status: worst.status, docs };
}

export const DOC_TONE: Record<DevDocStatus, "ok" | "warn" | "bad" | "neutral" | "info"> = {
  Current: "ok", "Review due": "warn", Draft: "info", Missing: "bad", Expiring: "warn", "Pack reference": "neutral",
};

/** Open quality exceptions that concern a device (directly, or through a document that covers it). */
export function qxForProduct(sku: string, qx: D.QualityException[]): D.QualityException[] {
  return qx.filter(q => q.status !== "Closed" && (q.ref === sku || q.detail.includes(sku) || (q.refType === "doc" && docProducts(q.ref).some(p => p.sku === sku))));
}

/* Demo permission model. Approval routing mirrors how approvals are raised in
   this demo: transfers and rental extensions to John Culkin, purchase orders,
   credit notes and discounts to Graham Hogan. */
export const PERMISSIONS: { k: string; who: D.StaffId[]; note: string; sensitive: boolean }[] = [
  { k: "Approve stock transfers", who: ["JC"], note: "Every transfer between locations waits for John.", sensitive: true },
  { k: "Approve purchase orders over €5,000", who: ["GH"], note: "Below the threshold, Sales Administration can send.", sensitive: true },
  { k: "Approve credit notes and discounts", who: ["GH"], note: "Raised by sales or orders, decided by the MD.", sensitive: true },
  { k: "Close quality exceptions", who: ["JC", "GH"], note: "A named person closes every exception.", sensitive: true },
  { k: "Mark quality documents reviewed", who: ["JC", "GH"], note: "Recorded with name and time.", sensitive: true },
  { k: "Approve rental extensions", who: ["JC"], note: "NICE1 hire changes.", sensitive: false },
  { k: "Record scans and stock movements", who: ["JC", "SO", "AC", "RW", "CB", "ET"], note: "Receipts, picks, transfers, usage, returns, counts.", sensitive: false },
  { k: "Send reminders and match bank lines", who: ["MD"], note: "Finance admin. Nothing is posted from Pulse.", sensitive: false },
];
