/* ─────────────────────────────────────────────────────────────────────────────
   Hogan Healthcare OS: shared UI kit.

   Small, theme-aware building blocks for every module page. Everything is
   styled with the Pulse theme tokens (var(--surface), var(--accent), …) so the
   pages inherit the Harbour/Hogan glass look in dark and light themes.
   Hover states reuse the classes in styles/interactions.css:
     ix11 row hover · ixm/ixz subtle button hover · ixp primary hover · ix15 accent-faint hover
   ───────────────────────────────────────────────────────────────────────────── */

import { Fragment, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { STAFF } from "./data";
import { openRecord } from "./store";

export type Tone = "neutral" | "accent" | "ok" | "warn" | "bad" | "info";

/* ── Icons (24×24 stroke paths, same family as the Pulse rail) ──────────── */

export const I = {
  search: "m21 21-4.3-4.3 M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0",
  plus: "M12 5v14 M5 12h14",
  check: "M5 12.5l4.2 4.2L19 7",
  x: "M6 6l12 12 M18 6 6 18",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  back: "M19 12H5 M11 18l-6-6 6-6",
  chevron: "m9 6 6 6-6 6",
  down: "m6 9 6 6 6-6",
  external: "M14 4h6v6 M20 4l-9 9 M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  scan: "M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8 M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8 M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16 M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16 M7 8v8 M10 8v8 M13 8v8 M16.5 8v8",
  box: "M12 3 4 7v10l8 4 8-4V7l-8-4Z M4 7l8 4 8-4 M12 11v10",
  truck: "M3 6.5h11v9H3z M14 9.5h3.6l3.4 3.4v2.6h-7 M7 18.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z M17.5 18.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z",
  alert: "M12 3.5 2.8 19.5h18.4L12 3.5Z M12 10v4 M12 17h.01",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 11v5 M12 8h.01",
  euro: "M17.5 6.6A6.6 6.6 0 0 0 7 12a6.6 6.6 0 0 0 10.5 5.4 M4.5 10.2h8 M4.5 13.8h8",
  user: "M12 12.5a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z M5 20.2c.9-3.1 3.6-4.9 7-4.9s6.1 1.8 7 4.9",
  users: "M9 12a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 12Z M16.5 12.5a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z M2.6 19.6c.8-2.8 3.2-4.4 6.4-4.4s5.6 1.6 6.4 4.4 M17 15.4c2.2.4 3.7 1.8 4.3 4.2",
  calendar: "M8 4v3 M16 4v3 M4.5 9.5h15 M6.4 6h11.2A1.9 1.9 0 0 1 19.5 8v10a1.9 1.9 0 0 1-1.9 1.9H6.4A1.9 1.9 0 0 1 4.5 18V8A1.9 1.9 0 0 1 6.4 6Z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7.6V12l3 1.8",
  pin: "M12 21s6.5-5.6 6.5-11a6.5 6.5 0 1 0-13 0C5.5 15.4 12 21 12 21Z M12 12.8a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z",
  shield: "M12 3.6 19.5 6v6.1c0 4-3.1 6.9-7.5 8.3-4.4-1.4-7.5-4.3-7.5-8.3V6L12 3.6Z M9.2 12.2l2 2 3.6-3.7",
  doc: "M6.4 3.6h7.4l4.2 4.2v12.6H6.4V3.6Z M13.4 3.8v4.2h4.2 M9 12.4h6 M9 16h4",
  link: "M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1 M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1",
  spark: "M12 3v4 M12 17v4 M3 12h4 M17 12h4 M6 6l2.5 2.5 M15.5 15.5 18 18 M6 18l2.5-2.5 M15.5 8.5 18 6",
  agent: "M2 12h4l2.5-6 3.5 12 3-8 2 2h5",
  refresh: "M20 11a8 8 0 0 0-14.6-4.4 M4 4v3.6h3.6 M4 13a8 8 0 0 0 14.6 4.4 M20 20v-3.6h-3.6",
  filter: "M4 5.5h16 M7 12h10 M10 18.5h4",
  download: "M12 4v11 M7 10.5l5 5 5-5 M5 20h14",
  layers: "M12 3 3 8l9 5 9-5-9-5Z M3 13l9 5 9-5 M3 17.5l9 5 9-5",
  route: "M6 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z M18 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z M8.5 16.5h6a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H15",
  hospital: "M4.5 20V7.5L12 4l7.5 3.5V20 M3 20h18 M12 8.5v5 M9.5 11h5 M9.5 20v-3.5h5V20",
  thermo: "M10 14.5V5a2 2 0 1 1 4 0v9.5a3.5 3.5 0 1 1-4 0Z M12 9v6",
  lock: "M6.5 10.5h11a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19v-7a1.5 1.5 0 0 1 1.5-1.5Z M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3",
  phone: "M5 4h3.5l1.5 4-2 1.5a10 10 0 0 0 5 5l1.5-2 4 1.5V18a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2Z",
  mail: "M4 7.2 12 13 20 7.2 M4 7.2v10.6h16V7.2 M4 7.2 8.5 4h7L20 7.2",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z M12 12h.01",
  trend: "M3 17l6-6 4 4 8-8 M15 7h6v6",
  snow: "M12 3v18 M4.2 7.5l15.6 9 M4.2 16.5l15.6-9 M9.5 4.5 12 7l2.5-2.5 M9.5 19.5 12 17l2.5 2.5",
  grip: "M9 6h.01 M15 6h.01 M9 12h.01 M15 12h.01 M9 18h.01 M15 18h.01",
  edit: "M4 20h4L19 9a2.4 2.4 0 0 0-3.4-3.4L4.6 16.6V20Z",
  dots: "M5 12h.01 M12 12h.01 M19 12h.01",
};

export function Icon({ d, size = 15, stroke = 1.8, style, color = "currentColor" }: { d: string; size?: number; stroke?: number; style?: CSSProperties; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", ...style }}>
      <path d={d} />
    </svg>
  );
}

/* ── Tones ──────────────────────────────────────────────────────────────── */

export const TONE: Record<Tone, { fg: string; bg: string; line: string }> = {
  neutral: { fg: "var(--body)", bg: "var(--surface-2)", line: "var(--border)" },
  accent: { fg: "var(--accent)", bg: "var(--accent-soft)", line: "var(--accent-line)" },
  ok: { fg: "var(--ok)", bg: "var(--ok-soft)", line: "var(--ok-soft)" },
  warn: { fg: "var(--warn)", bg: "var(--warn-soft)", line: "var(--warn-soft)" },
  bad: { fg: "var(--bad)", bg: "var(--bad-soft)", line: "var(--bad-soft)" },
  info: { fg: "var(--info, #7FB8C9)", bg: "var(--info-soft, rgba(127,184,201,.14))", line: "var(--info-soft, rgba(127,184,201,.14))" },
};

/** Maps the status words used across the dataset to a tone. */
export function statusTone(s: string): Tone {
  const k = (s || "").toLowerCase();
  if (/\b(overdue|exceptions?|discrepanc(y|ies)|variances?|missing|failed|issues?|rejected|expired|quarantined?|no matching|high)\b/.test(k)) return "bad";
  if (/\b(awaiting|waiting|pending|review|verify|requested|unmatched|suggested match|expiring|picking|due|draft|reserved|enquiry|part received|part|inspection|decontamination|at risk|medium|in progress|open)\b/.test(k)) return "warn";
  if (/\b(done|paid|completed|delivered|matched|passed|current|available|approved|received|restocked|closed|won|ready|on hire|inspected|confirmed|sent|healthy|dispatched|packed|issued)\b/.test(k)) return "ok";
  if (/(lost|low|not started|planned)/.test(k)) return "neutral";
  return "neutral";
}

/* ── Layout ─────────────────────────────────────────────────────────────── */

export function Page({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="hh-page" style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 16, padding: "20px 28px 56px", minWidth: 0, animation: "pageIn .5s var(--ease) both", ...style }}>
      {children}
    </div>
  );
}

export function PageHeader({ title, sub, eyebrow, right, demo = true }: { title: ReactNode; sub?: ReactNode; eyebrow?: ReactNode; right?: ReactNode; demo?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap", paddingBottom: 2 }}>
      <div style={{ flex: "1 1 320px", minWidth: 0 }}>
        {(eyebrow || demo) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
            {eyebrow && <span style={label}>{eyebrow}</span>}
            {demo && <DemoBadge />}
          </div>
        )}
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: "-.6px", lineHeight: 1.15, color: "var(--ink)" }}>{title}</h1>
        {sub && <div style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.5, color: "var(--dim)", maxWidth: "80ch" }}>{sub}</div>}
      </div>
      {right && <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{right}</div>}
    </div>
  );
}

/** Uppercase micro-label style (mono, tracked). */
export const label: CSSProperties = { fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--faint)" };

export function Card({ title, sub, right, children, pad = 18, style, bodyStyle, onClick, tone, flush, id }: {
  title?: ReactNode; sub?: ReactNode; right?: ReactNode; children?: ReactNode; pad?: number; style?: CSSProperties; bodyStyle?: CSSProperties;
  onClick?: () => void; tone?: Tone; flush?: boolean; id?: string;
}) {
  const t = tone ? TONE[tone] : null;
  return (
    <section id={id} onClick={onClick} className={onClick ? "ixz" : undefined}
      style={{ position: "relative", minWidth: 0, display: "flex", flexDirection: "column", background: "var(--surface)", border: "1px solid " + (t ? t.line : "var(--border)"),
        borderRadius: "var(--card-r,18px)", boxShadow: "var(--card-shadow,none)", overflow: "hidden", cursor: onClick ? "pointer" : undefined,
        transition: "border-color .2s var(--ease)", ...style }}>
      {(title || right) && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: pad + "px " + pad + "px " + (flush ? 12 : 0) + "px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {title && <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-.2px", color: "var(--ink)" }}>{title}</div>}
            {sub && <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 3, lineHeight: 1.45 }}>{sub}</div>}
          </div>
          {right && <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 6 }}>{right}</div>}
        </div>
      )}
      <div style={{ padding: flush ? 0 : (title || right ? "12px " : pad + "px ") + pad + "px " + pad + "px", minWidth: 0, flex: 1, ...bodyStyle }}>{children}</div>
    </section>
  );
}

export function Grid({ cols, min, gap = 14, children, style }: { cols?: string; min?: number; gap?: number; children: ReactNode; style?: CSSProperties }) {
  return <div style={{ display: "grid", gridTemplateColumns: min ? "repeat(auto-fit,minmax(min(" + min + "px,100%),1fr))" : cols || "1fr", gap, minWidth: 0, alignItems: "start", ...style }}>{children}</div>;
}

export function Row({ children, gap = 8, align = "center", justify, wrap, style }: { children: ReactNode; gap?: number; align?: CSSProperties["alignItems"]; justify?: CSSProperties["justifyContent"]; wrap?: boolean; style?: CSSProperties }) {
  return <div style={{ display: "flex", alignItems: align, justifyContent: justify, gap, flexWrap: wrap ? "wrap" : undefined, minWidth: 0, ...style }}>{children}</div>;
}

export function Section({ title, sub, right, children, style }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0, ...style }}>
      <Row gap={10} align="flex-end">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.2px" }}>{title}</div>
          {sub && <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 3 }}>{sub}</div>}
        </div>
        {right}
      </Row>
      {children}
    </div>
  );
}

export function Divider({ style }: { style?: CSSProperties }) {
  return <div style={{ height: 1, background: "var(--border)", ...style }} />;
}

/* ── Small pieces ───────────────────────────────────────────────────────── */

export function Badge({ children, tone = "neutral", dot, style, title }: { children: ReactNode; tone?: Tone; dot?: boolean; style?: CSSProperties; title?: string }) {
  const t = TONE[tone];
  return (
    <span title={title} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 22, padding: "0 9px", borderRadius: "var(--chip-r,8px)", background: t.bg, color: t.fg,
      fontSize: 11.5, fontWeight: 500, whiteSpace: "nowrap", flex: "none", lineHeight: 1, ...style }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 3, background: t.fg }} />}
      {children}
    </span>
  );
}

export function Status({ s, style }: { s: string; style?: CSSProperties }) {
  return <Badge tone={statusTone(s)} style={style}>{s}</Badge>;
}

export function DemoBadge({ text = "Demo data" }: { text?: string }) {
  return (
    <span title="Fictional demonstration data. Not actual Hogan Healthcare figures." style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 19, padding: "0 8px",
      borderRadius: 999, border: "1px dashed var(--border-strong)", fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)", whiteSpace: "nowrap" }}>
      {text}
    </span>
  );
}

export function Btn({ children, kind = "secondary", size = "md", icon, onClick, disabled, title, style, full, type }: {
  children?: ReactNode; kind?: "primary" | "secondary" | "ghost" | "danger" | "accent"; size?: "sm" | "md" | "lg"; icon?: string;
  onClick?: (e: React.MouseEvent) => void; disabled?: boolean; title?: string; style?: CSSProperties; full?: boolean; type?: "button" | "submit";
}) {
  const h = size === "sm" ? 28 : size === "lg" ? 42 : 34;
  const base: CSSProperties = { height: h, padding: children ? (size === "sm" ? "0 11px" : "0 15px") : 0, width: children ? (full ? "100%" : undefined) : h,
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: "var(--cta-r,10px)", fontSize: size === "sm" ? 12 : 13,
    fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer", whiteSpace: "nowrap", flex: "none", opacity: disabled ? 0.45 : 1,
    transition: "background .2s var(--ease),border-color .2s var(--ease),color .2s var(--ease),transform .18s var(--ease)" };
  const kinds: Record<string, CSSProperties> = {
    primary: { background: "var(--accent-fill,var(--accent))", color: "var(--on-accent)", border: "0", boxShadow: "var(--accent-glow,none)" },
    accent: { background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--accent-line)" },
    secondary: { background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--border)" },
    ghost: { background: "none", color: "var(--dim)", border: "1px solid transparent" },
    danger: { background: "var(--bad-soft)", color: "var(--bad)", border: "1px solid var(--bad-soft)" },
  };
  return (
    <button type={type || "button"} title={title} disabled={disabled} onClick={disabled ? undefined : onClick}
      className={disabled ? undefined : kind === "primary" ? "ixp ixq" : kind === "ghost" ? "ixl" : "ixm ixq"}
      style={{ ...base, ...kinds[kind], ...style }}>
      {icon && <Icon d={icon} size={size === "sm" ? 13 : 14} />}
      {children}
    </button>
  );
}

/** In-page segmented control. */
export function Seg<T extends string>({ items, value, onChange, size = "md" }: { items: [T, ReactNode, (number | string)?][]; value: T; onChange: (v: T) => void; size?: "sm" | "md" }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 2, padding: 3, background: "var(--surface-faint)", border: "1px solid var(--border)", borderRadius: "var(--r-ctl,10px)", flexWrap: "wrap" }}>
      {items.map(([v, lbl, count]) => {
        const on = v === value;
        return (
          <button key={v} onClick={() => onChange(v)} className={on ? undefined : "ix3"}
            style={{ height: size === "sm" ? 26 : 30, padding: "0 12px", border: 0, borderRadius: "var(--r-ctl,8px)", cursor: "pointer", fontSize: size === "sm" ? 12 : 12.5, whiteSpace: "nowrap",
              display: "inline-flex", alignItems: "center", gap: 6, background: on ? "var(--pill-bg)" : "none", color: on ? "var(--pill-ink)" : "var(--dim)", fontWeight: on ? 600 : 500,
              boxShadow: on ? "0 1px 3px rgba(0,0,0,.25)" : "none", transition: "background .2s var(--ease),color .2s var(--ease)" }}>
            {lbl}
            {count !== undefined && count !== "" && <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, opacity: 0.7 }}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Chip({ active, onClick, children, count }: { active?: boolean; onClick?: () => void; children: ReactNode; count?: number | string }) {
  return (
    <button onClick={onClick} className={active ? undefined : "ixa"}
      style={{ height: 28, padding: "0 11px", display: "inline-flex", alignItems: "center", gap: 6, borderRadius: "var(--r-ctl,9px)", cursor: "pointer", fontSize: 12, whiteSpace: "nowrap",
        background: active ? "var(--accent-faint)" : "var(--surface-2)", border: "1px solid " + (active ? "var(--accent-line)" : "var(--border)"), color: active ? "var(--ink)" : "var(--body)",
        transition: "border-color .2s var(--ease),color .2s var(--ease)" }}>
      {children}
      {count !== undefined && <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: active ? "var(--accent)" : "var(--faint)" }}>{count}</span>}
    </button>
  );
}

export function SearchBox({ value, onChange, placeholder = "Search", style, autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; style?: CSSProperties; autoFocus?: boolean }) {
  return (
    <label className="ix17" style={{ display: "flex", alignItems: "center", gap: 8, height: 34, padding: "0 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-ctl,10px)", minWidth: 180, ...style }}>
      <Icon d={I.search} size={14} color="var(--faint)" />
      <input autoFocus={autoFocus} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: "none", fontSize: 13, color: "var(--ink)" }} />
      {value && <button onClick={() => onChange("")} title="Clear" style={{ border: 0, background: "none", color: "var(--faint)", cursor: "pointer", padding: 0, display: "flex" }}><Icon d={I.x} size={12} /></button>}
    </label>
  );
}

export function SelectBox<T extends string>({ value, onChange, options, style, title }: { value: T; onChange: (v: T) => void; options: [T, string][]; style?: CSSProperties; title?: string }) {
  return (
    <select title={title} value={value} onChange={e => onChange(e.target.value as T)}
      style={{ height: 34, padding: "0 30px 0 12px", background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--border)", borderRadius: "var(--r-ctl,10px)", fontSize: 13,
        appearance: "none", cursor: "pointer", backgroundImage: "linear-gradient(45deg,transparent 50%,var(--dim) 50%),linear-gradient(135deg,var(--dim) 50%,transparent 50%)",
        backgroundPosition: "calc(100% - 15px) 15px,calc(100% - 10px) 15px", backgroundSize: "5px 5px,5px 5px", backgroundRepeat: "no-repeat", ...style }}>
      {options.map(([v, l]) => <option key={v} value={v} style={{ background: "var(--overlay)", color: "var(--ink)" }}>{l}</option>)}
    </select>
  );
}

export function TextInput({ value, onChange, placeholder, style, type = "text", onEnter }: { value: string | number; onChange: (v: string) => void; placeholder?: string; style?: CSSProperties; type?: string; onEnter?: () => void }) {
  return (
    <input className="ix1g" type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && onEnter) onEnter(); }}
      style={{ height: 34, padding: "0 12px", background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--border)", borderRadius: "var(--r-ctl,10px)", fontSize: 13, outline: 0, minWidth: 0, ...style }} />
  );
}

export function Toggle({ on, onChange, title }: { on: boolean; onChange: (v: boolean) => void; title?: string }) {
  return (
    <button title={title} onClick={() => onChange(!on)} style={{ position: "relative", width: 36, height: 21, flex: "none", border: 0, borderRadius: 999, cursor: "pointer",
      background: on ? "var(--accent)" : "var(--track)", transition: "background .2s var(--ease)" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 18 : 3, width: 15, height: 15, borderRadius: 999, background: on ? "var(--on-accent)" : "var(--dim)", transition: "left .2s var(--ease)" }} />
    </button>
  );
}

export function Progress({ value, max = 100, tone = "accent", h = 6, style, track = true }: { value: number; max?: number; tone?: Tone; h?: number; style?: CSSProperties; track?: boolean }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return (
    <div style={{ height: h, borderRadius: h, background: track ? "var(--track)" : "transparent", overflow: "hidden", minWidth: 24, ...style }}>
      <div style={{ width: pct + "%", height: "100%", borderRadius: h, background: tone === "accent" ? "var(--accent)" : TONE[tone].fg, transition: "width .6s var(--ease)" }} />
    </div>
  );
}

export function Avatar({ id, size = 26, title }: { id: string; size?: number; title?: string }) {
  const s = STAFF.find(x => x.id === id);
  const txt = s ? s.id : (id || "?").split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const isAgent = id.startsWith("agent");
  return (
    <span title={title || s?.name || id} style={{ width: size, height: size, flex: "none", borderRadius: isAgent ? "50%" : Math.round(size * 0.32), display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: isAgent ? "var(--accent-soft)" : s?.color || "var(--surface-2)", color: isAgent ? "var(--accent)" : s ? "#0c1a22" : "var(--body)", fontSize: Math.round(size * 0.36), fontWeight: 650, letterSpacing: ".02em" }}>
      {isAgent ? <Icon d={I.agent} size={Math.round(size * 0.55)} /> : txt}
    </span>
  );
}

export function Person({ id, sub, size = 26 }: { id: string; sub?: ReactNode; size?: number }) {
  const s = STAFF.find(x => x.id === id);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9, minWidth: 0 }}>
      <Avatar id={id} size={size} />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {s?.name || id}{s?.fictional && <span title="Fictional representative for the demo" style={{ marginLeft: 6, fontSize: 10, color: "var(--faint)" }}>(fictional)</span>}
        </span>
        {sub !== undefined ? <span style={{ display: "block", fontSize: 11.5, color: "var(--faint)" }}>{sub}</span> : s ? <span style={{ display: "block", fontSize: 11.5, color: "var(--faint)" }}>{s.role}</span> : null}
      </span>
    </span>
  );
}

/** A clickable record reference that opens the slide-out record drawer. */
export function RecLink({ type, id, children, style }: { type: string; id: string; children?: ReactNode; style?: CSSProperties }) {
  return (
    <button onClick={e => { e.stopPropagation(); openRecord(type, id); }} className="ix3"
      style={{ border: 0, background: "none", padding: 0, cursor: "pointer", color: "var(--accent)", fontSize: "inherit", fontFamily: "inherit", textAlign: "left", textDecoration: "underline", textDecorationColor: "var(--accent-line)", textUnderlineOffset: 3, ...style }}>
      {children ?? id}
    </button>
  );
}

/** Label/value tiles. `cols` fixes the column count; `min` instead fits as many columns of at least that width as there is room for. */
export function KV({ items, cols = 2, min, style }: { items: [ReactNode, ReactNode][]; cols?: number; min?: number; style?: CSSProperties }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: min ? "repeat(auto-fit,minmax(min(" + min + "px,100%),1fr))" : "repeat(" + cols + ",minmax(0,1fr))", gap: 8, ...style }}>
      {items.map(([k, v], i) => (
        <div key={i} style={{ padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm,10px)", minWidth: 0 }}>
          <div style={{ ...label, fontSize: 9 }}>{k}</div>
          <div style={{ marginTop: 4, fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis" }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

export function Kpi({ label: lbl, value, sub, delta, tone, onClick, spark, style, demo }: {
  label: ReactNode; value: ReactNode; sub?: ReactNode; delta?: { v: string; good?: boolean }; tone?: Tone; onClick?: () => void; spark?: ReactNode; style?: CSSProperties; demo?: boolean;
}) {
  return (
    <div onClick={onClick} className={onClick ? "ixx" : undefined}
      style={{ position: "relative", minWidth: 0, padding: "14px 16px", background: "var(--surface)", border: "1px solid " + (tone ? TONE[tone].line : "var(--border)"), borderRadius: "var(--r-md,16px)",
        cursor: onClick ? "pointer" : undefined, transition: "transform .2s var(--ease),border-color .2s var(--ease)", display: "flex", flexDirection: "column", gap: 6, ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ ...label, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lbl}</span>
        {demo && <span title="Fictional demonstration figure" style={{ fontFamily: "var(--mono)", fontSize: 8.5, letterSpacing: ".08em", color: "var(--faint)", border: "1px dashed var(--border-strong)", borderRadius: 999, padding: "1px 6px" }}>DEMO</span>}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
        <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-.6px", color: tone && tone !== "neutral" ? TONE[tone].fg : "var(--ink)", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{value}</span>
        {spark && <span style={{ marginLeft: "auto" }}>{spark}</span>}
      </div>
      {(sub || delta) && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--dim)", minWidth: 0 }}>
          {delta && <span style={{ color: delta.good === undefined ? "var(--body)" : delta.good ? "var(--ok)" : "var(--bad)", fontWeight: 500 }}>{delta.v}</span>}
          {sub && <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</span>}
        </div>
      )}
    </div>
  );
}

export function Notice({ tone = "info", title, children, icon, right, style }: { tone?: Tone; title?: ReactNode; children?: ReactNode; icon?: string; right?: ReactNode; style?: CSSProperties }) {
  const t = TONE[tone];
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "12px 14px", background: t.bg, border: "1px solid " + t.line, borderRadius: "var(--r-md,14px)", ...style }}>
      <span style={{ color: t.fg, marginTop: 1 }}><Icon d={icon || (tone === "bad" || tone === "warn" ? I.alert : I.info)} size={16} /></span>
      <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.55, color: "var(--body)" }}>
        {title && <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 2, fontSize: 13 }}>{title}</div>}
        {children}
      </div>
      {right}
    </div>
  );
}

export function Empty({ title, sub, action, icon }: { title: ReactNode; sub?: ReactNode; action?: ReactNode; icon?: string }) {
  return (
    <div style={{ padding: "36px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <span style={{ width: 38, height: 38, borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--dim)" }}>
        <Icon d={icon || I.check} size={17} />
      </span>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{title}</div>
      {sub && <div style={{ fontSize: 12.5, color: "var(--dim)", maxWidth: 420, lineHeight: 1.5 }}>{sub}</div>}
      {action}
    </div>
  );
}

export function Timeline({ items, dense }: { items: { when: ReactNode; title: ReactNode; sub?: ReactNode; tone?: Tone; tag?: ReactNode; onClick?: () => void; icon?: string }[]; dense?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {items.map((it, i) => {
        const t = TONE[it.tone || "accent"];
        return (
          <div key={i} onClick={it.onClick} className={it.onClick ? "ix11" : undefined}
            style={{ display: "flex", gap: 12, padding: dense ? "6px 6px" : "8px 8px", borderRadius: "var(--r-sm,10px)", cursor: it.onClick ? "pointer" : undefined }}>
            <div style={{ flex: "none", width: 22, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ width: 22, height: 22, borderRadius: 8, background: t.bg, color: t.fg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {it.icon ? <Icon d={it.icon} size={12} stroke={2} /> : <span style={{ width: 6, height: 6, borderRadius: 3, background: t.fg }} />}
              </span>
              {i < items.length - 1 && <span style={{ flex: 1, width: 1.5, minHeight: 14, background: "var(--border)", marginTop: 4 }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingBottom: dense ? 4 : 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{it.title}</span>
                {it.tag}
              </div>
              {it.sub && <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3, lineHeight: 1.5 }}>{it.sub}</div>}
              <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--faint)", marginTop: 4 }}>{it.when}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Steps({ steps, onPick }: { steps: { label: ReactNode; done?: boolean; active?: boolean }[]; onPick?: (i: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {steps.map((s, i) => (
        <Fragment key={i}>
          {i > 0 && <span style={{ width: 18, height: 1.5, background: s.done || s.active ? "var(--accent-line)" : "var(--border)" }} />}
          <button onClick={onPick ? () => onPick(i) : undefined}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 32, padding: "0 12px 0 6px", borderRadius: 999, cursor: onPick ? "pointer" : "default", fontSize: 12.5,
              background: s.active ? "var(--accent-soft)" : "var(--surface-2)", border: "1px solid " + (s.active ? "var(--accent-line)" : "var(--border)"), color: s.active ? "var(--ink)" : s.done ? "var(--body)" : "var(--dim)" }}>
            <span style={{ width: 20, height: 20, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600,
              background: s.done ? "var(--accent)" : s.active ? "var(--accent-line)" : "var(--track)", color: s.done ? "var(--on-accent)" : "var(--ink)" }}>
              {s.done ? <Icon d={I.check} size={11} stroke={2.6} /> : i + 1}
            </span>
            {s.label}
          </button>
        </Fragment>
      ))}
    </div>
  );
}

/* ── Table ──────────────────────────────────────────────────────────────── */

export type Col<T> = {
  key: string; label: ReactNode; w?: string; align?: "left" | "right" | "center";
  render?: (r: T, i: number) => ReactNode; mono?: boolean; sort?: (r: T) => number | string; title?: string;
};

/**
 * Dense, sortable data table. Columns are a CSS grid template, so it fills the
 * available width. Click a header with a `sort` function to sort.
 */
export function Table<T>({ cols, rows, onRow, rowKey, empty, maxHeight, dense, highlight, footer, initialSort, style, minWidth }: {
  cols: Col<T>[]; rows: T[]; onRow?: (r: T) => void; rowKey?: (r: T, i: number) => string; empty?: ReactNode; maxHeight?: number | string; dense?: boolean;
  highlight?: (r: T) => boolean; footer?: ReactNode; initialSort?: { key: string; dir: 1 | -1 }; style?: CSSProperties; minWidth?: number;
}) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(initialSort || null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const c = cols.find(x => x.key === sort.key);
    if (!c?.sort) return rows;
    return rows.slice().sort((a, b) => { const x = c.sort!(a), y = c.sort!(b); return (x < y ? -1 : x > y ? 1 : 0) * sort.dir; });
  }, [rows, sort, cols]);
  const tpl = cols.map(c => c.w || "1fr").join(" ");
  const padX = dense ? 12 : 16;
  return (
    <div style={{ minWidth: 0, overflowX: "auto", ...style }}>
      <div style={{ minWidth: minWidth || 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: tpl, background: "var(--surface-faint)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 1 }}>
          {cols.map(c => (
            <div key={c.key} title={c.title} onClick={c.sort ? () => setSort(s => s && s.key === c.key ? { key: c.key, dir: (s.dir * -1) as 1 | -1 } : { key: c.key, dir: -1 }) : undefined}
              style={{ ...label, fontSize: 9.5, padding: "9px " + padX + "px", textAlign: c.align || "left", cursor: c.sort ? "pointer" : undefined, userSelect: "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {c.label}{sort?.key === c.key ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
            </div>
          ))}
        </div>
        <div style={{ maxHeight, overflowY: maxHeight ? "auto" : undefined }}>
          {sorted.length === 0 && (empty ?? <Empty title="Nothing here" sub="No records match the current filters." icon={I.search} />)}
          {sorted.map((r, i) => (
            <div key={rowKey ? rowKey(r, i) : i} onClick={onRow ? () => onRow(r) : undefined} className={onRow ? "ix11" : undefined}
              style={{ display: "grid", gridTemplateColumns: tpl, alignItems: "center", borderBottom: "1px solid var(--border)", cursor: onRow ? "pointer" : undefined,
                background: highlight && highlight(r) ? "var(--accent-faint)" : undefined, boxShadow: highlight && highlight(r) ? "inset 2px 0 0 var(--accent)" : undefined, transition: "background .15s var(--ease)" }}>
              {cols.map(c => (
                <div key={c.key} style={{ padding: (dense ? "7px " : "10px ") + padX + "px", minWidth: 0, fontSize: 13, color: "var(--body)", textAlign: c.align || "left",
                  fontFamily: c.mono ? "var(--mono)" : undefined, fontVariantNumeric: "tabular-nums", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: c.render ? undefined : "nowrap" }}>
                  {c.render ? c.render(r, i) : String((r as any)[c.key] ?? "")}
                </div>
              ))}
            </div>
          ))}
        </div>
        {footer && <div style={{ padding: "10px " + padX + "px", fontSize: 12, color: "var(--faint)", background: "var(--surface-faint)" }}>{footer}</div>}
      </div>
    </div>
  );
}

/** Case-insensitive match of a query against any of the given fields. */
export function match(q: string, ...fields: (string | number | undefined)[]): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return fields.some(f => f !== undefined && String(f).toLowerCase().includes(s));
}

/* ── Record drawer pieces (for registered detail views) ─────────────────── */

/** Standard header block for a record detail view inside the drawer. */
export function RecordHead({ kind, title, sub, status, right }: { kind: string; title: ReactNode; sub?: ReactNode; status?: string; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={label}>{kind}</span>
          {status && <Status s={status} />}
        </div>
        <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-.5px", marginTop: 7, lineHeight: 1.25 }}>{title}</div>
        {sub && <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 5, lineHeight: 1.5 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

export function RecordSection({ title, children, right }: { title: ReactNode; children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ ...label, flex: 1 }}>{title}</span>
        {right}
      </div>
      {children}
    </div>
  );
}
