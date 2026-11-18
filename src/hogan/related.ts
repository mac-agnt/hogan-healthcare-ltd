/* The record graph behind Records → Explorer: for any record, what it is and
   everything it connects to. Pure functions over live demo state. */

import * as D from "./data";
import * as S from "./store";
import { date, eur } from "./fmt";

export type Ref = { type: string; id: string };
export type Node = Ref & { title: string; sub?: string; known: boolean };
export type Group = { label: string; items: Node[] };

const resolvers: Record<string, (id: string, s: S.HState) => { title: string; sub?: string } | null> = {
  account: id => { const a = D.accountById(id); return a ? { title: a.name, sub: a.type + " · " + a.region } : null; },
  location: id => { const l = D.locById(id); return l ? { title: l.name, sub: l.kind === "central" ? "Main stockroom" : "Consignment site" } : null; },
  product: id => { const p = D.productBySku(id); return p ? { title: p.sku + " · " + p.name, sub: D.catById(p.cat)?.short } : null; },
  lot: id => { const [sku, lot] = id.split("|"); return { title: "Lot " + lot, sub: sku }; },
  order: (id, s) => { const o = s.orders.find(x => x.id === id); return o ? { title: o.id + " · " + (D.accountById(o.account)?.name || ""), sub: o.status + " · " + eur(D.orderValue(o)) } : null; },
  transfer: (id, s) => { const t = s.transfers.find(x => x.id === id); return t ? { title: t.id + " · " + t.qty + " × " + t.sku, sub: (D.locById(t.from)?.short || t.from) + " → " + (D.locById(t.to)?.short || t.to) + " · " + t.status } : null; },
  movement: (id, s) => { const m = s.movements.find(x => x.id === id); return m ? { title: m.type + " · " + m.qty + " × " + m.sku, sub: date(m.date) + " · " + m.ref } : null; },
  po: (id, s) => { const p = s.pos.find(x => x.id === id); return p ? { title: p.id + " · " + (D.supplierById(p.supplier)?.name || ""), sub: p.status + " · " + eur(D.poValue(p)) } : null; },
  bill: (id, s) => { const b = s.bills.find(x => x.id === id); return b ? { title: b.id + " · " + (D.supplierById(b.supplier)?.name || ""), sub: b.status + " · " + eur(b.amount) } : null; },
  invoice: (id, s) => { const i = s.invoices.find(x => x.id === id); return i ? { title: i.id + " · " + (D.accountById(i.account)?.name || ""), sub: i.status + " · " + eur(i.amount) } : null; },
  supplier: id => { const p = D.supplierById(id); return p ? { title: p.name, sub: p.tier } : null; },
  opp: (id, s) => { const o = s.opps.find(x => x.id === id); return o ? { title: o.id + " · " + o.title, sub: o.stage + " · " + eur(o.value) } : null; },
  staff: id => { const p = D.staffById(id); return p ? { title: p.name, sub: p.role } : null; },
  booking: (id, s) => { const b = s.bookings.find(x => x.id === id); return b ? { title: b.id + " · " + b.pkg, sub: b.status + " · " + eur(b.price) } : null; },
  rental: (id, s) => { const a = s.assets.find(x => x.id === id); return a ? { title: "NICE1 " + a.id, sub: a.status } : null; },
  grn: (id, s) => { const g = s.grns.find(x => x.id === id); return g ? { title: g.id, sub: g.po + " · " + g.status } : null; },
  doc: id => { const d = D.QUALITY_DOCS.find(x => x.id === id); return d ? { title: d.title, sub: d.kind + " · " + d.status } : null; },
  task: (id, s) => { const t = s.tasks.find(x => x.id === id); return t ? { title: t.title, sub: t.status } : null; },
  loanset: (id, s) => { const l = s.loanSets.find(x => x.id === id); return l ? { title: l.id + " · " + l.name, sub: l.status } : null; },
};

export function node(type: string, id: string, s: S.HState = S.getState()): Node {
  const r = resolvers[type]?.(id, s);
  return { type, id, title: r?.title || id, sub: r ? r.sub : "History from the current ERP (detail not loaded in the demo)", known: !!r };
}

/** Types a reference string points at, by prefix. */
export function refType(ref: string): string | null {
  if (/^SO-/.test(ref)) return "order";
  if (/^TR-/.test(ref)) return "transfer";
  if (/^PO-/.test(ref)) return "po";
  if (/^INV-/.test(ref)) return "invoice";
  if (/^BILL-/.test(ref)) return "bill";
  if (/^GRN-/.test(ref)) return "grn";
  return null;
}
const place = (x: string): Ref | null => D.locById(x) ? { type: "location", id: x } : D.supplierById(x) ? { type: "supplier", id: x } : D.ACCOUNTS.find(a => a.name === x) ? { type: "account", id: D.ACCOUNTS.find(a => a.name === x)!.id } : null;

export function relations(r: Ref, s: S.HState = S.getState()): Group[] {
  const g: Group[] = [];
  const add = (label: string, refs: (Ref & { sub?: string })[]) => {
    const seen = new Set<string>();
    const items = refs.filter(x => { const k = x.type + x.id; if (seen.has(k)) return false; seen.add(k); return true; })
      .map(x => { const n = node(x.type, x.id, s); return x.sub ? { ...n, sub: x.sub } : n; });
    if (items.length) g.push({ label, items });
  };
  switch (r.type) {
    case "account": {
      const a = D.accountById(r.id)!;
      if (a.locId) add("Consignment site", [{ type: "location", id: a.locId }]);
      add("Owner", [{ type: "staff", id: a.owner }]);
      add("Orders", s.orders.filter(o => o.account === r.id).slice(-8).reverse().map(o => ({ type: "order", id: o.id })));
      add("Opportunities", s.opps.filter(o => o.account === r.id).map(o => ({ type: "opp", id: o.id })));
      add("Invoices", s.invoices.filter(i => i.account === r.id && i.status !== "Paid").map(i => ({ type: "invoice", id: i.id })));
      break;
    }
    case "location": {
      const lines = s.stock.filter(l => l.loc === r.id && l.qty > 0).sort((a, b) => b.qty - a.qty);
      const acc = D.accountForLoc(r.id);
      if (acc) add("Account", [{ type: "account", id: acc.id }]);
      add("Stock held here", lines.map(l => ({ type: "product", id: l.sku, sub: l.qty + " on hand" + (l.min !== undefined ? " · par " + l.min : "") + " · lot " + l.lot })));
      add("Transfers", s.transfers.filter(t => t.to === r.id || t.from === r.id).map(t => ({ type: "transfer", id: t.id })));
      break;
    }
    case "product": {
      const ps = S.productStock(r.id, s);
      add("Held at", Object.entries(ps.byLoc).map(([loc, q]) => ({ type: "location", id: loc, sub: q + " units" })));
      add("Lots and serials", ps.lines.map(l => ({ type: "lot", id: l.sku + "|" + l.lot, sub: (l.serial ? "Serial " + l.serial + " · " : "") + l.qty + " at " + (D.locById(l.loc)?.short || l.loc) + (l.expiry ? " · exp " + l.expiry : "") })));
      const p = D.productBySku(r.id)!;
      add("Supplier", [{ type: "supplier", id: p.supplier }]);
      add("Open orders", s.orders.filter(o => D.OPEN_STATUSES.includes(o.status) && o.lines.some(l => l.sku === r.id)).map(o => ({ type: "order", id: o.id })));
      add("Transfers", s.transfers.filter(t => t.sku === r.id).map(t => ({ type: "transfer", id: t.id })));
      break;
    }
    case "lot": {
      const [sku, lot] = r.id.split("|");
      add("Product", [{ type: "product", id: sku }]);
      add("Held now", s.stock.filter(l => l.sku === sku && l.lot === lot && l.qty > 0).map(l => ({ type: "location", id: l.loc, sub: l.qty + " units" })));
      add("Movement history", S.traceLot(sku, lot, s).map(m => ({ type: "movement", id: m.id, sub: date(m.date) + " · " + (D.locById(m.from)?.short || D.supplierById(m.from)?.name || m.from) + " → " + (D.locById(m.to)?.short || m.to) + " · " + m.ref })));
      break;
    }
    case "movement": {
      const m = s.movements.find(x => x.id === r.id);
      if (!m) break;
      add("Product and lot", [{ type: "product", id: m.sku }, { type: "lot", id: m.sku + "|" + m.lot }]);
      add("From and to", [place(m.from), place(m.to)].filter(Boolean) as Ref[]);
      const t = refType(m.ref);
      const refs: Ref[] = [];
      if (t) refs.push({ type: t, id: m.ref });
      if (m.finRef && refType(m.finRef)) refs.push({ type: refType(m.finRef)!, id: m.finRef });
      add("Order and financial record", refs);
      break;
    }
    case "transfer": {
      const t = s.transfers.find(x => x.id === r.id);
      if (!t) break;
      add("Product", [{ type: "product", id: t.sku }]);
      if (t.lot) add("Lot", [{ type: "lot", id: t.sku + "|" + t.lot }]);
      add("From and to", [{ type: "location", id: t.from }, { type: "location", id: t.to }]);
      add("Movements", s.movements.filter(m => m.ref === t.id).map(m => ({ type: "movement", id: m.id })));
      break;
    }
    case "order": {
      const o = s.orders.find(x => x.id === r.id);
      if (!o) break;
      add("Account", [{ type: "account", id: o.account }]);
      add("Products", o.lines.map(l => ({ type: "product", id: l.sku, sub: l.qty + " × " + eur(l.price) + (l.lot ? " · lot " + l.lot : "") })));
      add("Lots", o.lines.filter(l => l.lot).map(l => ({ type: "lot", id: l.sku + "|" + l.lot })));
      add("Movements", s.movements.filter(m => m.ref === o.id).map(m => ({ type: "movement", id: m.id })));
      add("Invoice", s.movements.filter(m => m.ref === o.id && m.finRef).map(m => ({ type: "invoice", id: m.finRef! })));
      add("Owner", [{ type: "staff", id: o.owner }]);
      break;
    }
    case "supplier": {
      add("Products", D.PRODUCTS.filter(p => p.supplier === r.id).slice(0, 12).map(p => ({ type: "product", id: p.sku })));
      add("Purchase orders", s.pos.filter(p => p.supplier === r.id).map(p => ({ type: "po", id: p.id })));
      add("Bills", s.bills.filter(b => b.supplier === r.id).map(b => ({ type: "bill", id: b.id })));
      break;
    }
    case "po": {
      const p = s.pos.find(x => x.id === r.id);
      if (!p) break;
      add("Supplier", [{ type: "supplier", id: p.supplier }]);
      add("Products", p.lines.map(l => ({ type: "product", id: l.sku, sub: l.received + "/" + l.qty + " received" })));
      add("Receipts", s.grns.filter(gr => gr.po === p.id).map(gr => ({ type: "grn", id: gr.id })));
      add("Bills", s.bills.filter(b => b.po === p.id).map(b => ({ type: "bill", id: b.id })));
      break;
    }
    case "bill": {
      const b = s.bills.find(x => x.id === r.id);
      if (!b) break;
      add("Supplier", [{ type: "supplier", id: b.supplier }]);
      if (b.po) add("Purchase order", [{ type: "po", id: b.po }]);
      if (b.grn) add("Goods receipt", [{ type: "grn", id: b.grn }]);
      add("Tasks", s.tasks.filter(t => t.related?.id === b.id).map(t => ({ type: "task", id: t.id })));
      break;
    }
    case "invoice": {
      const i = s.invoices.find(x => x.id === r.id);
      if (!i) break;
      add("Account", [{ type: "account", id: i.account }]);
      add("Tasks", s.tasks.filter(t => t.related?.id === i.id).map(t => ({ type: "task", id: t.id })));
      break;
    }
    case "opp": {
      const o = s.opps.find(x => x.id === r.id);
      if (!o) break;
      add("Account", [{ type: "account", id: o.account }]);
      add("Owner", [{ type: "staff", id: o.owner }]);
      add("Planned activity", s.activities.filter(a => a.opp === o.id).map(a => ({ type: "staff", id: a.rep, sub: a.date + " " + a.time + " · " + a.title + " · " + a.status })));
      break;
    }
    case "staff": {
      add("Accounts owned", D.ACCOUNTS.filter(a => a.owner === r.id).map(a => ({ type: "account", id: a.id })));
      add("Open opportunities", s.opps.filter(o => o.owner === r.id).map(o => ({ type: "opp", id: o.id })));
      add("Open tasks", s.tasks.filter(t => t.owner === r.id && t.status !== "Done").map(t => ({ type: "task", id: t.id })));
      break;
    }
    case "booking": {
      const b = s.bookings.find(x => x.id === r.id);
      if (b?.asset) add("Device", [{ type: "rental", id: b.asset }]);
      break;
    }
    case "rental": {
      add("Bookings", s.bookings.filter(b => b.asset === r.id).map(b => ({ type: "booking", id: b.id })));
      break;
    }
  }
  return g;
}

export const ENTITY_TYPES: { type: string; label: string; list: (s: S.HState) => Ref[] }[] = [
  { type: "account", label: "Hospitals & accounts", list: () => D.ACCOUNTS.map(a => ({ type: "account", id: a.id })) },
  { type: "location", label: "Stock locations", list: () => D.LOCATIONS.map(l => ({ type: "location", id: l.id })) },
  { type: "product", label: "Products", list: () => D.PRODUCTS.map(p => ({ type: "product", id: p.sku })) },
  { type: "order", label: "Sales orders", list: s => s.orders.slice().reverse().map(o => ({ type: "order", id: o.id })) },
  { type: "transfer", label: "Transfers", list: s => s.transfers.map(t => ({ type: "transfer", id: t.id })) },
  { type: "po", label: "Purchase orders", list: s => s.pos.map(p => ({ type: "po", id: p.id })) },
  { type: "supplier", label: "Suppliers", list: () => D.SUPPLIERS.map(p => ({ type: "supplier", id: p.id })) },
  { type: "invoice", label: "Invoices", list: s => s.invoices.filter(i => i.status !== "Paid").map(i => ({ type: "invoice", id: i.id })) },
  { type: "bill", label: "Supplier bills", list: s => s.bills.map(b => ({ type: "bill", id: b.id })) },
  { type: "opp", label: "Opportunities", list: s => s.opps.map(o => ({ type: "opp", id: o.id })) },
  { type: "staff", label: "Employees", list: () => D.STAFF.map(p => ({ type: "staff", id: p.id })) },
  { type: "rental", label: "Rental devices", list: s => s.assets.map(a => ({ type: "rental", id: a.id })) },
];
