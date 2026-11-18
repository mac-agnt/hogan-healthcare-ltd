/* Lightweight SVG charts for Hogan Healthcare OS. No dependencies.
   Colours are CSS colours or theme variables (e.g. "var(--accent)"). */

import { useState, type CSSProperties, type ReactNode } from "react";

const axis: CSSProperties = { fontFamily: "var(--mono)", fontSize: 10, fill: "var(--faint)" } as CSSProperties;

export function Legend({ items, style }: { items: { label: ReactNode; color: string; dashed?: boolean }[]; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", fontSize: 11.5, color: "var(--dim)", ...style }}>
      {items.map((it, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: it.dashed ? 0 : 10, borderRadius: 3, background: it.dashed ? "none" : it.color, borderTop: it.dashed ? "2px dashed " + it.color : undefined }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/** Vertical bar chart. */
export function Bars({ data, height = 170, fmt = (n: number) => String(n), highlight, onBar, color = "var(--accent)", showValues = true }: {
  data: { label: string; value: number; color?: string; note?: string }[]; height?: number; fmt?: (n: number) => string; highlight?: number;
  onBar?: (i: number) => void; color?: string; showValues?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div style={{ position: "relative", height, display: "flex", alignItems: "flex-end", gap: 6, paddingTop: 18 }}>
      {data.map((d, i) => {
        const h = Math.max(2, (d.value / max) * (height - 40));
        const on = hover === i || highlight === i;
        return (
          <div key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={onBar ? () => onBar(i) : undefined}
            style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: onBar ? "pointer" : undefined }}>
            {showValues && <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: on ? "var(--ink)" : "var(--faint)", whiteSpace: "nowrap", opacity: on || data.length <= 8 ? 1 : 0, transition: "opacity .15s" }}>{fmt(d.value)}</span>}
            <div title={d.label + ": " + fmt(d.value) + (d.note ? " · " + d.note : "")}
              style={{ width: "100%", maxWidth: 44, height: h, borderRadius: "6px 6px 3px 3px", background: d.color || color, opacity: hover !== null && !on ? 0.55 : 1,
                transformOrigin: "bottom", animation: "growBar .7s var(--ease) both", animationDelay: i * 30 + "ms", transition: "opacity .15s" }} />
            <span style={{ fontSize: 10.5, color: on ? "var(--ink)" : "var(--dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Horizontal bars, one per row, with label and value. */
export function HBars({ data, fmt = (n: number) => String(n), max, onRow, barH = 8 }: {
  data: { label: ReactNode; value: number; color?: string; right?: ReactNode; sub?: ReactNode }[]; fmt?: (n: number) => string; max?: number; onRow?: (i: number) => void; barH?: number;
}) {
  const m = max || Math.max(1, ...data.map(d => d.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((d, i) => (
        <div key={i} onClick={onRow ? () => onRow(i) : undefined} className={onRow ? "ix11" : undefined} style={{ cursor: onRow ? "pointer" : undefined, borderRadius: 8, padding: onRow ? "4px 6px" : 0, margin: onRow ? "-4px -6px" : 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 5 }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "var(--body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label}</span>
            {d.sub && <span style={{ fontSize: 11, color: "var(--faint)" }}>{d.sub}</span>}
            <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{d.right ?? fmt(d.value)}</span>
          </div>
          <div style={{ height: barH, borderRadius: barH, background: "var(--track)", overflow: "hidden" }}>
            <div style={{ width: Math.max(1.5, (d.value / m) * 100) + "%", height: "100%", borderRadius: barH, background: d.color || "var(--accent)", transformOrigin: "left", animation: "sweep .8s var(--ease) both", animationDelay: i * 40 + "ms" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Line / area chart with hover read-out. */
export function Line({ labels, series, height = 190, fmt = (n: number) => String(n), yMin, area = true, markLast, maxLabels = 12 }: {
  labels: string[]; series: { name: string; values: number[]; color: string; dashed?: boolean }[]; height?: number; fmt?: (n: number) => string; yMin?: number; area?: boolean; markLast?: boolean;
  /** Most x-axis labels to draw; pass a small number (e.g. 4) for narrow cards. The first and last always show. */
  maxLabels?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = height, padL = 8, padR = 8, padT = 14, padB = 24;
  const all = series.flatMap(s => s.values);
  const lo = yMin !== undefined ? yMin : Math.min(...all) * 0.9;
  const hi = Math.max(...all) * 1.04;
  const x = (i: number) => padL + (i * (W - padL - padR)) / Math.max(1, labels.length - 1);
  const y = (v: number) => padT + (1 - (v - lo) / Math.max(1e-9, hi - lo)) * (H - padT - padB);
  const id = "g" + Math.abs(series.map(s => s.name).join("").split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7));
  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={"0 0 " + W + " " + H} preserveAspectRatio="none" style={{ width: "100%", height, display: "block", overflow: "visible" }}
        onMouseLeave={() => setHover(null)}
        onMouseMove={e => { const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; setHover(Math.max(0, Math.min(labels.length - 1, Math.round(((px - padL) / (W - padL - padR)) * (labels.length - 1))))); }}>
        <defs>
          {series.map((s, si) => (
            <linearGradient key={si} id={id + si} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" style={{ stopColor: s.color, stopOpacity: 0.28 }} />
              <stop offset="100%" style={{ stopColor: s.color, stopOpacity: 0 }} />
            </linearGradient>
          ))}
        </defs>
        {[0.25, 0.5, 0.75].map(f => <line key={f} x1={padL} x2={W - padR} y1={padT + f * (H - padT - padB)} y2={padT + f * (H - padT - padB)} style={{ stroke: "var(--border)", strokeDasharray: "3 4" }} />)}
        {series.map((s, si) => {
          const pts = s.values.map((v, i) => x(i) + "," + y(v)).join(" ");
          return (
            <g key={si}>
              {area && si === 0 && <polygon points={x(0) + "," + (H - padB) + " " + pts + " " + x(s.values.length - 1) + "," + (H - padB)} style={{ fill: "url(#" + id + si + ")" }} />}
              <polyline points={pts} style={{ fill: "none", stroke: s.color, strokeWidth: 2.2, strokeLinejoin: "round", strokeLinecap: "round", strokeDasharray: s.dashed ? "5 5" : undefined }} vectorEffect="non-scaling-stroke" />
              {markLast && <circle cx={x(s.values.length - 1)} cy={y(s.values[s.values.length - 1])} r={4} style={{ fill: s.color }} />}
            </g>
          );
        })}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB} style={{ stroke: "var(--border-strong)" }} vectorEffect="non-scaling-stroke" />}
        {hover !== null && series.map((s, si) => <circle key={si} cx={x(hover)} cy={y(s.values[hover])} r={4.5} style={{ fill: "var(--bg)", stroke: s.color, strokeWidth: 2 }} vectorEffect="non-scaling-stroke" />)}
        {labels.map((l, i) => (labels.length <= maxLabels || i === labels.length - 1 || (i % Math.ceil(labels.length / maxLabels) === 0 && labels.length - 1 - i >= Math.ceil(labels.length / maxLabels) / 2)) && (
          <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"} style={axis}>{l}</text>
        ))}
      </svg>
      {hover !== null && (
        <div style={{ position: "absolute", top: 0, left: Math.min(78, Math.max(4, (x(hover) / W) * 100)) + "%", transform: "translateX(-50%)", padding: "7px 10px", background: "var(--tooltip)", color: "var(--tooltip-ink)",
          border: "1px solid var(--border)", borderRadius: 10, fontSize: 11.5, pointerEvents: "none", whiteSpace: "nowrap", boxShadow: "0 10px 28px rgba(0,0,0,.35)", zIndex: 2 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, opacity: 0.7, marginBottom: 3 }}>{labels[hover]}</div>
          {series.map((s, si) => <div key={si} style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: 2, background: s.color }} />{s.name}: <b style={{ fontWeight: 600 }}>{fmt(s.values[hover])}</b></div>)}
        </div>
      )}
    </div>
  );
}

/** Donut with an optional centre label. */
export function Donut({ data, size = 140, thickness = 16, center, onSlice }: { data: { label: string; value: number; color: string }[]; size?: number; thickness?: number; center?: ReactNode; onSlice?: (i: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const r = (size - thickness) / 2, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} style={{ fill: "none", stroke: "var(--track)", strokeWidth: thickness }} />
        {data.map((d, i) => {
          const len = (d.value / total) * c;
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={onSlice ? () => onSlice(i) : undefined}
              style={{ fill: "none", stroke: d.color, strokeWidth: hover === i ? thickness + 4 : thickness, strokeDasharray: Math.max(0, len - 1.5) + " " + (c - Math.max(0, len - 1.5)),
                strokeDashoffset: -acc, cursor: onSlice ? "pointer" : "default", transition: "stroke-width .15s" }}>
              <title>{d.label + ": " + d.value}</title>
            </circle>
          );
          acc += len;
          return el;
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", pointerEvents: "none" }}>
        {hover !== null ? (<><div style={{ fontSize: 16, fontWeight: 600 }}>{Math.round((data[hover].value / total) * 100)}%</div><div style={{ fontSize: 10.5, color: "var(--dim)", maxWidth: size - thickness * 2 - 8 }}>{data[hover].label}</div></>) : center}
      </div>
    </div>
  );
}

/** Tiny trend line. */
export function Spark({ values, color = "var(--accent)", w = 88, h = 26, area = true }: { values: number[]; color?: string; w?: number; h?: number; area?: boolean }) {
  const lo = Math.min(...values), hi = Math.max(...values);
  const x = (i: number) => (i * w) / Math.max(1, values.length - 1);
  const y = (v: number) => 2 + (1 - (v - lo) / Math.max(1e-9, hi - lo)) * (h - 4);
  const pts = values.map((v, i) => x(i) + "," + y(v)).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      {area && <polygon points={"0," + h + " " + pts + " " + w + "," + h} style={{ fill: color, opacity: 0.12 }} />}
      <polyline points={pts} style={{ fill: "none", stroke: color, strokeWidth: 1.8, strokeLinejoin: "round", strokeLinecap: "round" }} />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={2.6} style={{ fill: color }} />
    </svg>
  );
}

/** Stacked vertical bars. */
export function StackBars({ labels, series, height = 180, fmt = (n: number) => String(n) }: { labels: string[]; series: { name: string; values: number[]; color: string }[]; height?: number; fmt?: (n: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const totals = labels.map((_, i) => series.reduce((a, s) => a + (s.values[i] || 0), 0));
  const max = Math.max(1, ...totals);
  return (
    <div>
      <div style={{ height, display: "flex", alignItems: "flex-end", gap: 6 }}>
        {labels.map((l, i) => (
          <div key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} title={l + ": " + series.map(s => s.name + " " + fmt(s.values[i])).join(" · ")}
            style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: hover === i ? "var(--ink)" : "var(--faint)" }}>{fmt(totals[i])}</span>
            <div style={{ width: "100%", maxWidth: 40, height: (totals[i] / max) * (height - 34), display: "flex", flexDirection: "column-reverse", borderRadius: "6px 6px 3px 3px", overflow: "hidden",
              opacity: hover !== null && hover !== i ? 0.55 : 1, transformOrigin: "bottom", animation: "growBar .7s var(--ease) both", animationDelay: i * 30 + "ms" }}>
              {series.map((s, si) => <div key={si} style={{ height: ((s.values[i] || 0) / Math.max(1, totals[i])) * 100 + "%", background: s.color }} />)}
            </div>
            <span style={{ fontSize: 10.5, color: "var(--dim)", whiteSpace: "nowrap" }}>{l}</span>
          </div>
        ))}
      </div>
      <Legend style={{ marginTop: 10 }} items={series.map(s => ({ label: s.name, color: s.color }))} />
    </div>
  );
}

/** Single horizontal stacked bar (composition of a whole). */
export function SplitBar({ parts, height = 12 }: { parts: { label: string; value: number; color: string }[]; height?: number }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <div>
      <div style={{ display: "flex", height, borderRadius: height, overflow: "hidden", background: "var(--track)", gap: 2 }}>
        {parts.map((p, i) => <div key={i} title={p.label + ": " + p.value} style={{ width: (p.value / total) * 100 + "%", background: p.color, transformOrigin: "left", animation: "sweep .8s var(--ease) both" }} />)}
      </div>
      <Legend style={{ marginTop: 9 }} items={parts.map(p => ({ label: p.label + " · " + Math.round((p.value / total) * 100) + "%", color: p.color }))} />
    </div>
  );
}
