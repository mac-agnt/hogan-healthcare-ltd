/* NICE1 rentals: pricing, availability and small module-local actions.
   Customers are anonymised references only. No patient or health details. */

import * as D from "../../data";
import { approveExtension, confirmBooking, decideApproval, getState, log, nextId, patch, toast, type HState } from "../../store";
import { TODAY, addDays, date, daysBetween } from "../../fmt";

/* ── Published pricing (reference only, not a guaranteed rate) ──────────── */

export type Pkg = D.RentalBooking["pkg"];
export const PACKAGES: Pkg[] = ["System only", "System + therapy wrap"];
export const PRICE_SYSTEM = D.RENTAL_PRICING[0].v;
export const PRICE_WRAP = D.RENTAL_PRICING[1].v;
export const PRICE_WEEK = D.RENTAL_PRICING[2].v;
export const basePrice = (pkg: Pkg) => (pkg === "System only" ? PRICE_SYSTEM : PRICE_WRAP);
/** Initial two weeks at the package rate, then the published weekly rate. */
export const priceFor = (pkg: Pkg, weeks: number) => basePrice(pkg) + Math.max(0, weeks - 2) * PRICE_WEEK;
export const weeksOf = (b: { start: string; end: string }) => Math.max(1, Math.round(daysBetween(b.start, b.end) / 7));

/* ── Fleet and bookings ─────────────────────────────────────────────────── */

export const LIVE: D.BookingStatus[] = ["Reserved", "Dispatched", "On hire"];
export const FLEET = D.RENTAL_ASSETS.length;
export const assetOf = (id: string | undefined, s: HState) => (id ? s.assets.find(a => a.id === id) : undefined);
export const bookingOf = (id: string | undefined, s: HState) => (id ? s.bookings.find(b => b.id === id) : undefined);
export function liveBooking(assetId: string, s: HState): D.RentalBooking | undefined {
  const a = assetOf(assetId, s);
  const byRef = a?.booking ? bookingOf(a.booking, s) : undefined;
  if (byRef && LIVE.includes(byRef.status)) return byRef;
  return s.bookings.find(b => b.asset === assetId && LIVE.includes(b.status));
}
export const overlaps = (b: { start: string; end: string }, start: string, end: string) => b.start <= end && start <= b.end;
/** Units that can take a booking for these dates: available now and with no live booking that overlaps. */
export function freeUnits(start: string, end: string, s: HState, except?: string): D.RentalAsset[] {
  return s.assets.filter(a => a.status === "Available" && !s.bookings.some(b => b.asset === a.id && b.id !== except && LIVE.includes(b.status) && overlaps(b, start, end)));
}
/** When each unit is next free, for availability views. */
export function freeFrom(a: D.RentalAsset, s: HState): string {
  if (a.status === "Available") return TODAY;
  const b = liveBooking(a.id, s);
  if (a.status === "Inspection") return addDays(TODAY, 1);
  return b ? addDays(b.end, 1) : TODAY;
}
export const customerKind = (b: D.RentalBooking) => b.customer.split(" · ")[0];
export const customerRef = (b: D.RentalBooking) => b.customer.split(" · ref ")[1] || b.customer;

export const BOOKING_TONE: Record<D.BookingStatus, "ok" | "warn" | "accent" | "neutral" | "info"> = {
  Enquiry: "warn", Reserved: "warn", Dispatched: "info", "On hire": "accent", Returned: "warn", Completed: "neutral",
};
export const ASSET_TONE: Record<D.RentalAssetStatus, "ok" | "warn" | "accent" | "neutral"> = {
  "On hire": "accent", Reserved: "warn", Available: "ok", Inspection: "warn",
};
export const DAYS_YTD = daysBetween("2026-01-01", TODAY) + 1;
export const utilisation = (a: D.RentalAsset) => Math.round((a.hireDaysYtd / DAYS_YTD) * 100);

const SEED_STEPS = (D.RENTAL_BOOKINGS.find(b => b.steps)?.steps || []).map(x => x.k);
export function defaultSteps(pkg: Pkg, unitClean: boolean) {
  return SEED_STEPS.filter(k => pkg === "System + therapy wrap" || !/wrap/i.test(k)).map((k, i) => ({ k, done: i === 0 && unitClean }));
}

/* ── Actions (module-local; the store covers dispatch, returns and inspections) ── */

/** Confirm an enquiry: set package, length and delivery, then reserve a free unit. */
export function confirmEnquiry(bookingId: string, assetId: string, pkg: Pkg, weeks: number, delivery: string) {
  const b = bookingOf(bookingId, getState());
  if (!b) return;
  patch(s => ({ bookings: s.bookings.map(x => x.id === bookingId ? { ...x, pkg, price: priceFor(pkg, weeks), end: addDays(x.start, weeks * 7), delivery } : x) }));
  confirmBooking(bookingId, assetId);
  const unit = assetOf(assetId, getState());
  patch(s => ({ bookings: s.bookings.map(x => x.id === bookingId ? { ...x, steps: defaultSteps(pkg, !!unit?.cleaned) } : x) }));
}

export function approveExt(bookingId: string) {
  const ap = getState().approvals.find(a => a.ref.type === "booking" && a.ref.id === bookingId && a.status === "Awaiting");
  if (ap) decideApproval(ap.id, true, "JC");
  else approveExtension(bookingId);
}
export function declineExt(bookingId: string) {
  const s0 = getState();
  const b = bookingOf(bookingId, s0);
  if (!b?.extension) return;
  const ap = s0.approvals.find(a => a.ref.type === "booking" && a.ref.id === bookingId && a.status === "Awaiting");
  if (ap) decideApproval(ap.id, false, "JC");
  patch(s => ({
    bookings: s.bookings.map(x => x.id === bookingId ? { ...x, extension: undefined } : x),
    tasks: s.tasks.map(t => t.related?.id === bookingId && t.status !== "Done" ? { ...t, status: "Done" } : t),
  }));
  log({ stream: "people", actor: "John Culkin", title: "Declined extension on " + bookingId, note: "Unit " + (b.asset || "") + " due back " + date(b.end, false) + " as booked.", status: "completed", ref: bookingId, refType: "booking" });
  if (!ap) toast("Extension declined. " + (b.asset || bookingId) + " due back " + date(b.end, false) + ".", "info");
}

export function markDelivered(bookingId: string) {
  const b = bookingOf(bookingId, getState());
  if (!b) return;
  patch(s => ({ bookings: s.bookings.map(x => x.id === bookingId ? { ...x, status: "On hire" } : x) }));
  log({ stream: "people", actor: "John Culkin", title: "Delivery confirmed for " + bookingId, note: (b.asset || "") + " · " + b.delivery + " · hire runs to " + date(b.end, false), status: "completed", ref: bookingId, refType: "booking" });
  toast(bookingId + " delivered. Hire runs to " + date(b.end, false) + ".");
}

export function setDelivery(bookingId: string, delivery: string) {
  patch(s => ({ bookings: s.bookings.map(x => x.id === bookingId ? { ...x, delivery } : x) }));
}

export const CUSTOMER_KINDS = ["Private customer", "Physiotherapy clinic", "Sports club", "Enquiry via nice1.ie"] as const;
export type CustomerKind = typeof CUSTOMER_KINDS[number];
const REF_PREFIX: Record<CustomerKind, string> = { "Private customer": "P-", "Physiotherapy clinic": "C-", "Sports club": "C-", "Enquiry via nice1.ie": "E-" };

/** Log a phone or email enquiry by hand (online booking from nice1.ie is not connected). */
export function logEnquiry(p: { kind: CustomerKind; pkg: Pkg; start: string; weeks: number; delivery: string; referral?: string }): string {
  const s = getState();
  const id = nextId("RN-0", s.bookings, 3, 210);
  const prefix = REF_PREFIX[p.kind];
  const nums = s.bookings.map(b => customerRef(b)).filter(r => r.startsWith(prefix)).map(r => Number(r.slice(2)) || 0);
  const ref = prefix + String((nums.length ? Math.max(...nums) : 1000) + 1).padStart(4, "0");
  const b: D.RentalBooking = { id, customer: p.kind + " · ref " + ref, referral: p.referral, pkg: p.pkg, price: priceFor(p.pkg, p.weeks), start: p.start, end: addDays(p.start, p.weeks * 7), status: "Enquiry", delivery: p.delivery };
  patch(st => ({ bookings: [b, ...st.bookings] }));
  log({ stream: "people", actor: "John Culkin", title: "Logged rental enquiry " + id, note: p.pkg + " · " + p.weeks + " weeks from " + date(p.start, false) + " · logged by hand", status: "completed", ref: id, refType: "booking" });
  toast(id + " logged as an enquiry. Confirm it onto a free unit when ready.");
  return id;
}

/* ── Revenue: what makes up November to date ────────────────────────────── */

export const MONTH_START = "2026-11-01";
export const NOV_BOOKED = D.RENTAL_MONTHLY[D.RENTAL_MONTHLY.length - 1].v;

export type RevLine = { booking: D.RentalBooking; date: string; when: string; amount: number; basis: string };
/** Hire fees are invoiced on the start date; extension weeks when approved during a hire. */
export function novemberLines(s: HState): RevLine[] {
  const out: RevLine[] = [];
  for (const b of s.bookings) {
    if (b.status === "Enquiry") continue;
    const ext = b.extension?.state === "Approved" ? b.extension : undefined;
    const fee = ext ? ext.fee : 0;
    if (b.start >= MONTH_START && b.start <= TODAY) out.push({ booking: b, date: b.start, when: date(b.start, false), amount: b.price - fee, basis: "Hire fee · " + b.pkg });
    if (ext && b.end >= MONTH_START && b.start <= TODAY) {
      const wk = addDays(b.end, -7 * ext.weeks);
      out.push({ booking: b, date: wk <= TODAY ? wk : TODAY, when: wk <= TODAY ? date(wk, false) : "On approval", amount: fee, basis: "Extension · " + ext.weeks + " week" + (ext.weeks === 1 ? "" : "s") + " from " + date(wk, false) });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
/** Booked or enquired but not yet invoiced. */
export function forwardLines(s: HState): RevLine[] {
  const out: RevLine[] = [];
  for (const b of s.bookings) {
    if ((b.status === "Reserved" || b.status === "Enquiry" || b.status === "Dispatched") && b.start > TODAY)
      out.push({ booking: b, date: b.start, when: date(b.start, false), amount: b.price, basis: b.status === "Enquiry" ? "Enquiry, not yet confirmed" : "Booked · invoiced on the start date" });
    if (b.extension?.state === "Requested") out.push({ booking: b, date: b.end, when: date(b.end, false), amount: b.extension.fee, basis: "Extension requested, awaiting approval" });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
