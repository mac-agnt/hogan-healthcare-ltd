/* Shared layout pieces for the Orders and Purchasing modules.
   Responsive behaviour uses container queries on the page body (.hk-cq), so
   the layout reacts to the space the module actually has, not the window. */

import type { CSSProperties, ReactNode } from "react";
import { Line } from "../../charts";
import { Avatar, I, Icon, TONE, label, type Tone } from "../../ui";

const CSS = `
.hk-cq{container-type:inline-size}
.hk-split{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:14px;align-items:start}
.hk-side{display:grid;grid-template-columns:288px minmax(0,1fr);gap:14px;align-items:start}
.hk-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:start}
.hk-three{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;align-items:start}
.hk-wide{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:14px;align-items:start}
.hk-lanes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-items:start}
.hk-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.hk-kpis6{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}
.hk-sticky{position:sticky;top:12px}
.hk-scroll{overflow-y:auto;scrollbar-width:thin}
.hk-noaxis svg text{display:none}
.hk-cq input[type=date]{color-scheme:dark}
[data-theme="light"] .hk-cq input[type=date]{color-scheme:light}
@container (max-width:1180px){.hk-kpis6{grid-template-columns:repeat(3,minmax(0,1fr))}}
@container (max-width:1100px){.hk-three{grid-template-columns:repeat(2,minmax(0,1fr))}.hk-three>.hk-span-md{grid-column:1/-1}}
@container (max-width:980px){.hk-split,.hk-wide{grid-template-columns:minmax(0,1fr)}.hk-sticky{position:static}.hk-lanes{grid-template-columns:repeat(2,minmax(0,1fr))}}
@container (max-width:860px){.hk-side{grid-template-columns:minmax(0,1fr)}.hk-side>.hk-first-sm{order:-1}.hk-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
@container (max-width:760px){.hk-two,.hk-three{grid-template-columns:minmax(0,1fr)}.hk-three>.hk-span-md{grid-column:auto}.hk-kpis6{grid-template-columns:repeat(2,minmax(0,1fr))}}
@container (max-width:620px){.hk-lanes{grid-template-columns:minmax(0,1fr)}.hk-hide-sm{display:none !important}}
`;

export function KitStyle() {
  return <style>{CSS}</style>;
}

/** Page body: a vertical stack that is also the container-query root. */
export function Stack({ children, gap = 16, style }: { children: ReactNode; gap?: number; style?: CSSProperties }) {
  return <div className="hk-cq" style={{ display: "flex", flexDirection: "column", gap, minWidth: 0, ...style }}>{children}</div>;
}

export type Stage = { key: string; label: ReactNode; count: number; sub?: ReactNode; tone?: Tone };

/** A row of flow stages with counts. Click a stage to filter; click again to clear. */
export function FlowStrip({ stages, active, onPick, arrows = true, min = 132 }: { stages: Stage[]; active?: string; onPick?: (k: string) => void; arrows?: boolean; min?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(" + min + "px,100%),1fr))", gap: 8 }}>
      {stages.map((st, i) => {
        const on = !!active && active === st.key;
        const t = st.tone ? TONE[st.tone] : null;
        const Tag = onPick ? "button" : "div";
        return (
          <Tag key={st.key} onClick={onPick ? () => onPick(on ? "" : st.key) : undefined} className={onPick ? "ixx" : undefined} title={onPick ? (on ? "Show all" : "Filter by " + (typeof st.label === "string" ? st.label.toLowerCase() : "this stage")) : undefined}
            style={{ position: "relative", textAlign: "left", padding: "12px 14px 11px", borderRadius: "var(--r-md,14px)", border: "1px solid " + (on ? "var(--accent-line)" : t && st.count ? t.line : "var(--border)"),
              background: on ? "var(--accent-faint)" : "var(--surface)", cursor: onPick ? "pointer" : "default", color: "var(--ink)", minWidth: 0, transition: "transform .2s var(--ease),border-color .2s var(--ease)",
              boxShadow: on ? "inset 0 -2px 0 var(--accent)" : undefined }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ ...label, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: on ? "var(--accent)" : "var(--faint)" }}>{st.label}</span>
              {arrows && i < stages.length - 1 && <Icon d={I.chevron} size={12} color="var(--faint)" />}
            </div>
            <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-.6px", marginTop: 6, lineHeight: 1.1, color: t && st.count ? t.fg : "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{st.count}</div>
            {st.sub !== undefined && <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{st.sub}</div>}
          </Tag>
        );
      })}
    </div>
  );
}

/** Round pass / fail / pending marker for checklists. */
export function CheckMark({ ok, size = 20 }: { ok: boolean | null; size?: number }) {
  const tone: Tone = ok === true ? "ok" : ok === false ? "bad" : "warn";
  const t = TONE[tone];
  return (
    <span style={{ width: size, height: size, flex: "none", borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center", background: t.bg, color: t.fg }}>
      <Icon d={ok === true ? I.check : ok === false ? I.x : I.clock} size={Math.round(size * 0.55)} stroke={2.4} />
    </span>
  );
}

/** Label over value, compact. */
export function MiniStat({ k, v, sub, tone, style }: { k: ReactNode; v: ReactNode; sub?: ReactNode; tone?: Tone; style?: CSSProperties }) {
  return (
    <div style={{ minWidth: 0, ...style }}>
      <div style={{ ...label, fontSize: 9 }}>{k}</div>
      <div style={{ marginTop: 4, fontSize: 15, fontWeight: 600, letterSpacing: "-.2px", color: tone ? TONE[tone].fg : "var(--ink)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/** An agent's suggestion. Agents propose; the buttons on the right are human decisions. */
export function AgentLine({ agent, when, children, right, tone = "accent" }: { agent: string; when?: ReactNode; children: ReactNode; right?: ReactNode; tone?: Tone }) {
  const t = TONE[tone];
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "11px 13px", borderRadius: "var(--r-md,14px)", background: t.bg, border: "1px solid " + t.line, flexWrap: "wrap" }}>
      <Avatar id="agent" size={26} title={agent} />
      <div style={{ flex: "1 1 260px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{agent}</span>
          {when && <span style={{ ...label, fontSize: 9 }}>{when}</span>}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.55, marginTop: 3 }}>{children}</div>
      </div>
      {right && <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>{right}</div>}
    </div>
  );
}

/** Number stepper for quantities. */
export function Stepper({ value, min = 1, max, onChange }: { value: number; min?: number; max?: number; onChange: (v: number) => void }) {
  const btn: CSSProperties = { width: 28, height: 28, border: 0, background: "none", color: "var(--dim)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 999 };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--border)", borderRadius: "var(--r-ctl,10px)", background: "var(--surface-2)", height: 30, flex: "none" }}>
      <button className="ix3" title="One less" style={{ ...btn, opacity: value <= min ? 0.35 : 1 }} onClick={() => onChange(Math.max(min, value - 1))}><Icon d="M6 12h12" size={13} stroke={2.2} /></button>
      <span style={{ minWidth: 26, textAlign: "center", fontSize: 13, fontWeight: 600, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
      <button className="ix3" title="One more" style={{ ...btn, opacity: max !== undefined && value >= max ? 0.35 : 1 }} onClick={() => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)}><Icon d={I.plus} size={13} stroke={2.2} /></button>
    </span>
  );
}

/** Thin labelled row used in lists (left content, right content). */
export function ListRow({ children, right, onClick, style }: { children: ReactNode; right?: ReactNode; onClick?: () => void; style?: CSSProperties }) {
  return (
    <div onClick={onClick} className={onClick ? "ix11" : undefined}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: "var(--r-sm,10px)", cursor: onClick ? "pointer" : undefined, minWidth: 0, ...style }}>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      {right && <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 6 }} onClick={e => e.stopPropagation()}>{right}</div>}
    </div>
  );
}

/** Line chart for narrow cards: the chart's own axis is hidden and a sparse axis (first, every few, last) is drawn below.
    The hover read-out keeps the full label for every point. */
export function NarrowLine({ labels, every = 4, ...rest }: { labels: string[]; every?: number } & Omit<Parameters<typeof Line>[0], "labels">) {
  const n = labels.length;
  const show = labels.map((_, i) => i).filter(i => i === n - 1 || (i % every === 0 && n - 1 - i >= every / 2));
  return (
    <div>
      <div className="hk-noaxis"><Line labels={labels} {...rest} /></div>
      <div style={{ position: "relative", height: 14, margin: "-18px 8px 0" }}>
        {show.map(i => (
          <span key={i} style={{ position: "absolute", left: (i / Math.max(1, n - 1)) * 100 + "%", transform: i === 0 ? "none" : i === n - 1 ? "translateX(-100%)" : "translateX(-50%)",
            fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)", whiteSpace: "nowrap" }}>{labels[i]}</span>
        ))}
      </div>
    </div>
  );
}

/** Compact step track for narrow cards: one bar per step with its label underneath. */
export function MiniSteps({ steps }: { steps: { label: ReactNode; done?: boolean; active?: boolean }[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(" + steps.length + ",minmax(0,1fr))", gap: 4 }}>
      {steps.map((st, i) => (
        <div key={i} style={{ minWidth: 0 }}>
          <div style={{ height: 4, borderRadius: 4, background: st.done ? "var(--accent)" : st.active ? "var(--accent-line)" : "var(--track)", transition: "background .4s var(--ease)" }} />
          <div style={{ fontSize: 10.5, marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: st.active ? "var(--ink)" : st.done ? "var(--body)" : "var(--faint)", fontWeight: st.active ? 600 : 400 }}>{st.label}</div>
        </div>
      ))}
    </div>
  );
}

/** Key/value tiles (same look as the kit's KV) that reflow from three columns down to one on narrow screens. */
export function KVGrid({ items, min = 160, style }: { items: [ReactNode, ReactNode][]; min?: number; style?: CSSProperties }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(" + min + "px,100%),1fr))", gap: 8, ...style }}>
      {items.map(([k, v], i) => (
        <div key={i} style={{ padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm,10px)", minWidth: 0 }}>
          <div style={{ ...label, fontSize: 9 }}>{k}</div>
          <div style={{ marginTop: 4, fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis" }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

/** Two-line text block with ellipsis. */
export function Two({ a, b, mono }: { a: ReactNode; b?: ReactNode; mono?: boolean }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 13, color: "var(--ink)", fontFamily: mono ? "var(--mono)" : undefined, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a}</div>
      {b !== undefined && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b}</div>}
    </div>
  );
}
