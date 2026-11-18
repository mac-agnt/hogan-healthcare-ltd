/* Shared building blocks for the Dashboard and Finance modules: responsive
   layout rows, source tags for integration-dependent figures, a P&L bridge
   and compact stat/list rows. Theme tokens only; motion is transform/opacity. */

import type { CSSProperties, ReactNode } from "react";
import { Btn, I, Icon, TONE, label, type Tone } from "../../ui";
import { eur, eurK } from "../../fmt";

/* ── Layout ─────────────────────────────────────────────────────────────── */

const CSS = `
.hk{container-type:inline-size;display:flex;flex-direction:column;gap:16px;min-width:0}
.hk-row{display:grid;gap:14px;align-items:start;min-width:0}
.hk-row.st{align-items:stretch}
.hk-21{grid-template-columns:minmax(0,1.7fr) minmax(0,1fr)}
.hk-12{grid-template-columns:minmax(0,1fr) minmax(0,1.7fr)}
.hk-11{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
.hk-3{grid-template-columns:repeat(3,minmax(0,1fr))}
.hk-side{grid-template-columns:minmax(0,1fr) minmax(340px,380px)}
.hk-kpis{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(165px,100%),1fr));min-width:0}
.hk-list>*+*{border-top:1px solid var(--border)}
.hk-scroll{overflow-x:auto;min-width:0}
@container (max-width: 1020px){.hk-3{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}
@container (max-width: 900px){.hk-21,.hk-12,.hk-side{grid-template-columns:minmax(0,1fr)}}
@container (max-width: 720px){.hk-11,.hk-3{grid-template-columns:minmax(0,1fr)}.hk-hide-s{display:none !important}}
@container (max-width: 520px){.hk-kpis{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.hk-kpis>*{padding:12px 13px !important}.hk-src-t{display:none}}
`;

/** Page body wrapper: a size container so rows collapse with the space actually available. */
export function Kit({ children }: { children: ReactNode }) {
  return <div className="hk"><style>{CSS}</style>{children}</div>;
}

export function Split({ k = "21", children, stretch, style }: { k?: "21" | "12" | "11" | "3" | "side"; children: ReactNode; stretch?: boolean; style?: CSSProperties }) {
  return <div className={"hk-row hk-" + k + (stretch ? " st" : "")} style={style}>{children}</div>;
}

export function Kpis({ children }: { children: ReactNode }) {
  return <div className="hk-kpis">{children}</div>;
}

/* ── Source tags ────────────────────────────────────────────────────────── */

export type SrcKind = "accounts" | "erp" | "bank" | "illustrative" | "live";
const SRC: Record<SrcKind, { text: string; tip: string }> = {
  accounts: { text: "Xero / ERP ledger · not verified", tip: "In production this figure would come from Xero or the current ERP general ledger. That connection is not yet verified: this is fictional demonstration data." },
  erp: { text: "Current ERP · not verified", tip: "In production this would be read from the current ERP or Xero. Connection not yet verified: fictional demonstration data." },
  bank: { text: "Bank feed · not verified", tip: "In production this would arrive from the bank feed. The bank feed is not yet verified: fictional demonstration data." },
  illustrative: { text: "Illustrative", tip: "Illustrative projection or history built for the demo. Not a forecast and not actual performance." },
  live: { text: "Live demo records", tip: "Calculated from the demo records in Pulse, so it changes as you work through the demo. Fictional data." },
};

/** Marks a figure that depends on an integration (or is illustrative). */
export function Src({ k, style }: { k: SrcKind; style?: CSSProperties }) {
  const s = SRC[k];
  return (
    <span title={s.tip} style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 19, padding: "0 8px", borderRadius: 999, border: "1px dashed var(--border-strong)",
      fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--faint)", whiteSpace: "nowrap", flex: "none", ...style }}>
      <Icon d={k === "live" ? I.refresh : k === "illustrative" ? I.trend : I.link} size={10} stroke={2} />
      <span className="hk-src-t">{s.text}</span>
    </span>
  );
}

/* ── Stats and rows ─────────────────────────────────────────────────────── */

/** Compact figure for use inside cards (Kpi is for page-level rows). */
export function Stat({ label: l, value, sub, tone, onClick, style, big }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: Tone; onClick?: () => void; style?: CSSProperties; big?: boolean }) {
  return (
    <div onClick={onClick} className={onClick ? "ixx" : undefined}
      style={{ minWidth: 0, padding: "11px 13px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm,11px)", cursor: onClick ? "pointer" : undefined,
        transition: "transform .2s var(--ease),border-color .2s var(--ease)", ...style }}>
      <div style={{ ...label, fontSize: 9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l}</div>
      <div style={{ fontSize: big ? 24 : 19, fontWeight: 600, letterSpacing: big ? "-.6px" : "-.4px", marginTop: 5, lineHeight: 1.1, color: tone && tone !== "neutral" ? TONE[tone].fg : "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 4, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  );
}

/** A list row with a tone marker, text and actions on the right. */
export function ItemRow({ tone = "neutral", icon, title, sub, meta, right, onClick, done, style }: {
  tone?: Tone; icon?: string; title: ReactNode; sub?: ReactNode; meta?: ReactNode; right?: ReactNode; onClick?: () => void; done?: boolean; style?: CSSProperties;
}) {
  const t = TONE[done ? "ok" : tone];
  return (
    <div onClick={onClick} className={onClick ? "ix11" : undefined}
      style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "11px 4px", cursor: onClick ? "pointer" : undefined, opacity: done ? 0.62 : 1, borderRadius: 8, transition: "background .15s var(--ease)", ...style }}>
      <span style={{ flex: "none", width: 26, height: 26, borderRadius: 9, background: t.bg, color: t.fg, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
        <Icon d={done ? I.check : icon || (tone === "bad" || tone === "warn" ? I.alert : I.info)} size={13} stroke={2} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)", lineHeight: 1.35, textDecoration: done ? "line-through" : undefined, textDecorationColor: "var(--faint)" }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3, lineHeight: 1.45 }}>{sub}</div>}
        {meta && <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 6 }}>{meta}</div>}
      </div>
      {right && <div onClick={e => e.stopPropagation()} style={{ flex: "none", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>{right}</div>}
    </div>
  );
}

/** One labelled figure on a line, clickable. */
export function Fig({ label: l, value, sub, onClick, tone }: { label: ReactNode; value: ReactNode; sub?: ReactNode; onClick?: () => void; tone?: "warn" | "bad" | "ok" }) {
  return (
    <div onClick={onClick} className={onClick ? "ix11" : undefined} style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "8px 6px", margin: "0 -6px", borderRadius: 8, cursor: onClick ? "pointer" : undefined }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: "var(--body)" }}>{l}</div>
        {sub && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: tone ? "var(--" + tone + ")" : "var(--ink)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{value}</div>
      {onClick && <span style={{ color: "var(--faint)", alignSelf: "center" }}><Icon d={I.chevron} size={11} stroke={2.2} /></span>}
    </div>
  );
}

/** Small "go to" link button. */
export function Go({ children, onClick, title }: { children: ReactNode; onClick: () => void; title?: string }) {
  return <Btn kind="ghost" size="sm" onClick={onClick} title={title} style={{ paddingRight: 6 }}>{children}<Icon d={I.arrow} size={12} /></Btn>;
}

/** Plain-text line that shows a calculation adding up, with a tick. */
export function Reconciles({ ok, children, style }: { ok: boolean; children: ReactNode; style?: CSSProperties }) {
  return (
    <div title={ok ? "These figures add up from their parts." : "These figures do not add up: check the source data."}
      style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11.5, color: "var(--dim)", lineHeight: 1.5, fontVariantNumeric: "tabular-nums", ...style }}>
      <span style={{ flex: "none", marginTop: 1, width: 16, height: 16, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: ok ? "var(--ok-soft)" : "var(--bad-soft)", color: ok ? "var(--ok)" : "var(--bad)" }}>
        <Icon d={ok ? I.check : I.x} size={10} stroke={2.6} />
      </span>
      <span style={{ minWidth: 0 }}>{children}</span>
    </div>
  );
}

/** Days badge. "age" (days overdue or quiet): amber from 1, red past 30. "due" (days until due): red if past, amber within a week. */
export function DaysBadge({ days, suffix = "d", mode = "age" }: { days: number; suffix?: string; mode?: "age" | "due" }) {
  const tone: Tone = mode === "due" ? (days < 0 ? "bad" : days <= 7 ? "warn" : "neutral") : days > 30 ? "bad" : days > 0 ? "warn" : "neutral";
  return <span style={{ display: "inline-flex", alignItems: "center", height: 21, padding: "0 8px", borderRadius: 999, background: TONE[tone].bg, color: TONE[tone].fg, fontSize: 11.5, fontWeight: 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{days}{suffix}</span>;
}

export function Money({ v, tone, bold, k }: { v: number; tone?: Tone; bold?: boolean; k?: boolean }) {
  return <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: bold ? 600 : undefined, color: tone ? TONE[tone].fg : undefined, whiteSpace: "nowrap" }}>{k ? eurK(v) : eur(v)}</span>;
}

/** Thin inline proportion bar without a filled track. */
export function Meter({ value, max, color = "var(--accent)", w = 70, h = 5 }: { value: number; max: number; color?: string; w?: number | string; h?: number }) {
  return (
    <span style={{ display: "inline-block", width: w, height: h, verticalAlign: "middle", position: "relative", overflow: "hidden", borderRadius: h }}>
      <span style={{ position: "absolute", inset: 0, background: color, borderRadius: h, transformOrigin: "left", transform: "scaleX(" + Math.max(0.02, Math.min(1, value / (max || 1))) + ")", transition: "transform .5s var(--ease)" }} />
    </span>
  );
}

/* ── P&L bridge (waterfall) ─────────────────────────────────────────────── */

export type Step = { label: string; value: number; total?: boolean; color: string; sub?: string };

/** Revenue to EBITDA bridge. Totals stand on the axis; costs hang from the running total. */
export function Waterfall({ steps, height = 190 }: { steps: Step[]; height?: number }) {
  let run = 0;
  const bars = steps.map(st => {
    const from = st.total ? 0 : run;
    const to = st.total ? st.value : run + st.value;
    run = st.total ? st.value : to;
    return { ...st, lo: Math.min(from, to), hi: Math.max(from, to), level: run };
  });
  const max = Math.max(1, ...bars.map(b => b.hi));
  const H = height - 42;
  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 8, height, minWidth: 0 }}>
      {bars.map((b, i) => (
        <div key={i} title={b.label + ": " + eur(b.value)} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ position: "relative", width: "100%", height: H + 18 }}>
            <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: (b.hi / max) * H + 4, fontSize: 11.5, fontWeight: b.total ? 600 : 500, color: b.total ? "var(--ink)" : "var(--dim)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
              {eur(b.value)}
            </div>
            <div style={{ position: "absolute", left: "14%", right: "14%", bottom: (b.lo / max) * H, height: Math.max(2, ((b.hi - b.lo) / max) * H), background: b.color, borderRadius: 5,
              transformOrigin: b.total ? "bottom" : "top", animation: "growBar .7s var(--ease) both", animationDelay: i * 70 + "ms", opacity: b.total ? 1 : 0.9 }} />
            {i < bars.length - 1 && (
              <div style={{ position: "absolute", left: "86%", width: "calc(28% + 8px)", bottom: (b.level / max) * H, borderTop: "1px dashed var(--border-strong)" }} />
            )}
          </div>
          <div style={{ fontSize: 11, color: b.total ? "var(--body)" : "var(--dim)", marginTop: 6, textAlign: "center", lineHeight: 1.25, fontWeight: b.total ? 500 : 400 }}>{b.label}</div>
          {b.sub && <div style={{ fontSize: 10.5, color: "var(--faint)", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{b.sub}</div>}
        </div>
      ))}
    </div>
  );
}

/** Column header style for hand-built tables. */
export const th: CSSProperties = { ...label, fontSize: 9.5, padding: "9px 12px", whiteSpace: "nowrap" };
export const td: CSSProperties = { padding: "9px 12px", fontSize: 13, color: "var(--body)", fontVariantNumeric: "tabular-nums", borderTop: "1px solid var(--border)", verticalAlign: "middle" };
