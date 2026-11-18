/* Small building blocks shared by the Inventory and Compliance pages. */

import type { CSSProperties, ReactNode } from "react";
import * as D from "../../data";
import { date, daysUntil } from "../../fmt";
import { useHogan } from "../../store";
import { Badge, I, Icon, RecLink, TONE, label, type Tone } from "../../ui";
import { refInfo, whereName, type Flag, type RowStatus } from "./model";

/** Layout helpers that need a media query (rendered once by the module entry). */
export const INV_CSS = `
.hhinv-flow{display:grid;grid-template-columns:minmax(190px,250px) minmax(36px,1fr) minmax(250px,1.7fr);align-items:center}
.hhinv-narrow{display:none}
.hhinv-modes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
@media (max-width:520px){.hhinv-modes{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:720px){
  .hhinv-flow{grid-template-columns:1fr;gap:12px}
  .hhinv-flow-svg{display:none}
  .hhinv-wide{display:none}
  .hhinv-narrow{display:block}
}`;

/** Scroll the main page area back to the top (used when an in-page view changes). */
export function toTop() {
  const el = document.querySelector("[data-scroll-main]");
  if (el) el.scrollTop = 0;
}

/** Notes written by store actions carry ISO dates; show them as "19 Nov 2026". */
export function prettyNote(n?: string): string {
  return (n || "").replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, m => date(m));
}

/** True when a field holds an ISO date (the dataset uses placeholders such as "n/a" for "not on file"). */
export function isDate(x?: string): x is string {
  return !!x && /^\d{4}-\d{2}-\d{2}/.test(x);
}
/** True when a free-text field is empty or a "not on file" placeholder. */
export function isBlank(x?: string): boolean {
  return !x || /^(n\/a|na|none|—|-)$/i.test(x.trim());
}

/** Safe date: never shows a placeholder or an invalid date. */
export function dd(x?: string, withYear = true): string {
  if (!isDate(x)) return "Not recorded";
  return date(x, withYear);
}

export const FLAG_TONE: Record<RowStatus, Tone> = { OK: "ok", Low: "warn", Expiring: "warn", Verify: "info", Quarantine: "bad" };

export function FlagBadge({ f, style }: { f: RowStatus; style?: CSSProperties }) {
  return <Badge tone={FLAG_TONE[f]} style={style}>{f}</Badge>;
}

/** Primary status badge, with a quiet "+n" when a SKU carries more than one flag. */
export function FlagCell({ flags }: { flags: Flag[] }) {
  if (!flags.length) return <FlagBadge f="OK" />;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }} title={flags.join(" · ")}>
      <FlagBadge f={flags[0]} />
      {flags.length > 1 && <span style={{ fontSize: 11, color: "var(--faint)" }}>+{flags.length - 1}</span>}
    </span>
  );
}

export const MOVE_TONE: Record<D.MoveType, Tone> = {
  Receipt: "ok", Transfer: "accent", Consumption: "info", Dispatch: "neutral", Return: "warn", "Count adjustment": "warn", Pick: "neutral",
};
export const MOVE_ICON: Record<D.MoveType, string> = {
  Receipt: I.download, Transfer: I.route, Consumption: I.hospital, Dispatch: I.truck, Return: I.refresh, "Count adjustment": I.layers, Pick: I.box,
};
export const MOVE_LABEL: Record<D.MoveType, string> = {
  Receipt: "Received", Transfer: "Transferred", Consumption: "Used at hospital", Dispatch: "Dispatched", Return: "Returned", "Count adjustment": "Count adjustment", Pick: "Picked",
};

export function MoveTag({ type }: { type: D.MoveType }) {
  return (
    <Badge tone={MOVE_TONE[type]} style={{ gap: 5 }}>
      <Icon d={MOVE_ICON[type]} size={11} stroke={2} />
      {type === "Consumption" ? "Usage" : type}
    </Badge>
  );
}

/** A movement reference. Links when the record exists in the demo; otherwise shows it as a reference only. */
export function Ref({ id, style }: { id?: string; style?: CSSProperties }) {
  const s = useHogan();
  if (!id) return null;
  const r = refInfo(s, id);
  if (r.type && r.exists) return <RecLink type={r.type} id={id} style={{ fontFamily: "var(--mono)", fontSize: 12, ...style }} />;
  return (
    <span title="Reference only: the source record is held outside Pulse in this demo (system not connected)."
      style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--body)", borderBottom: "1px dotted var(--border-strong)", ...style }}>
      {id}
    </span>
  );
}

/** A movement end point: links locations and suppliers, plain text otherwise. */
export function Where({ x, long }: { x: string; long?: boolean }) {
  if (D.locById(x)) return <RecLink type="location" id={x}>{whereName(x, long)}</RecLink>;
  if (D.supplierById(x)) return <RecLink type="supplier" id={x}>{whereName(x)}</RecLink>;
  return <span>{x}</span>;
}

/** Product name with the internal SKU underneath. */
export function SkuCell({ p, sub, link }: { p?: D.Product; sub?: ReactNode; link?: boolean }) {
  if (!p) return null;
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 13, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {link ? <RecLink type="product" id={p.sku} style={{ color: "var(--ink)", textDecorationColor: "var(--border-strong)" }}>{p.name}</RecLink> : p.name}
      </div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--faint)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {p.sku}{sub ? <span style={{ fontFamily: "var(--ui)" }}> · {sub}</span> : null}
      </div>
    </div>
  );
}

/** Quantity against a par level: a short bar with a par marker. Static widths, no layout animation. */
export function ParBar({ qty, par, width = 120, after }: { qty: number; par?: number; width?: number; after?: number }) {
  const top = Math.max(qty, after ?? 0, par || 0, 1) * 1.25;
  const pct = (n: number) => Math.min(100, (n / top) * 100);
  const below = par !== undefined && qty < par;
  return (
    <div style={{ position: "relative", width, maxWidth: "100%", height: 8, borderRadius: 8, background: "var(--track)" }}>
      {after !== undefined && after > qty && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: pct(after) + "%", borderRadius: 8, background: "var(--accent-line)" }} />}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: pct(after !== undefined && after < qty ? after : qty) + "%", borderRadius: 8, background: below ? "var(--warn)" : "var(--accent)" }} />
      {par !== undefined && <div title={"Par level " + par} style={{ position: "absolute", top: -3, bottom: -3, left: "calc(" + pct(par) + "% - 1px)", width: 2, borderRadius: 2, background: "var(--ink)", opacity: 0.7 }} />}
    </div>
  );
}

/** − n + stepper for quantities. */
export function Stepper({ value, onChange, min = 1, max = 999 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  const btn: CSSProperties = { width: 30, height: 30, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--ink)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--r-ctl,10px)" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <button className="ixm" style={{ ...btn, opacity: value <= min ? 0.4 : 1 }} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} title="Less">
        <Icon d="M6 12h12" size={13} stroke={2.2} />
      </button>
      <span style={{ minWidth: 30, textAlign: "center", fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{value}</span>
      <button className="ixm" style={{ ...btn, opacity: value >= max ? 0.4 : 1 }} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} title="More">
        <Icon d={I.plus} size={13} stroke={2.2} />
      </button>
    </span>
  );
}

/** Compact label/value pair for dense cards. */
export function Stat({ k, v, tone, sub, style }: { k: ReactNode; v: ReactNode; tone?: Tone; sub?: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ minWidth: 0, ...style }}>
      <div style={{ ...label, fontSize: 9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k}</div>
      <div style={{ marginTop: 4, fontSize: 15, fontWeight: 600, letterSpacing: "-.2px", color: tone && tone !== "neutral" ? TONE[tone].fg : "var(--ink)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
    </div>
  );
}

/** Expiry with urgency colouring. */
export function Expiry({ d, window = 90 }: { d?: string; window?: number }) {
  if (!d) return <span style={{ color: "var(--faint)" }}>No expiry</span>;
  const n = daysUntil(d);
  const tone = n < 0 ? "var(--bad)" : n <= 45 ? "var(--bad)" : n <= window ? "var(--warn)" : "var(--body)";
  return (
    <span style={{ color: tone, whiteSpace: "nowrap" }} title={n < 0 ? "Expired" : n + " days left"}>
      {dd(d)}{n <= window && <span style={{ fontSize: 11, marginLeft: 6, opacity: 0.85 }}>{n < 0 ? "expired" : n + "d"}</span>}
    </span>
  );
}

/** Thin pill used for categories. */
export function CatPill({ cat, n }: { cat: D.CatId; n?: ReactNode }) {
  const c = D.catById(cat);
  if (!c) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 22, padding: "0 9px", borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--border)", fontSize: 11.5, color: "var(--body)", whiteSpace: "nowrap" }}>
      <span style={{ width: 7, height: 7, borderRadius: 2, background: c.color }} />
      {c.short}
      {n !== undefined && <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--faint)" }}>{n}</span>}
    </span>
  );
}

/** Small "Exercise only" style ribbon for simulated content. */
export function SimRibbon({ children }: { children: ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 22, padding: "0 10px", borderRadius: 999, border: "1px dashed var(--warn)", color: "var(--warn)", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}
