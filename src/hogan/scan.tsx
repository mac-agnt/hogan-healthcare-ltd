/* Scanner simulation: a barcode input, a "Simulate scan" action and the
   decoded GS1/UDI read-out. Pages decide what the scan does (receive, pick,
   transfer, use, return, count) through onScan. */

import { useState, type ReactNode } from "react";
import { describe, parseGs1, type Gs1 } from "./gs1";
import { productBySku } from "./data";
import { Badge, Btn, I, Icon, label } from "./ui";

export type ScanResult = Gs1;

export function ScanPanel({ onScan, simulate, samples = [], placeholder = "Scan or paste a barcode, e.g. (01)…(10)…", hint, compact, extra }: {
  /** Called with every successfully decoded scan. Return a string to show as an error instead. */
  onScan: (g: Gs1) => string | void;
  /** Returns the barcode the "Simulate scan" button should use. */
  simulate?: () => string | undefined;
  samples?: { label: string; code: string }[];
  placeholder?: string;
  hint?: ReactNode;
  compact?: boolean;
  extra?: ReactNode;
}) {
  const [code, setCode] = useState("");
  const [last, setLast] = useState<Gs1 | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [beam, setBeam] = useState(0);

  const run = (raw: string) => {
    const g = parseGs1(raw);
    setBeam(b => b + 1);
    setLast(g);
    if (!g.ok) { setErr(g.error || "Could not read that barcode"); return; }
    const res = onScan(g);
    setErr(typeof res === "string" ? res : null);
    setCode("");
  };
  const sim = () => {
    const c = simulate?.() || (samples.length ? samples[Math.floor(Math.random() * samples.length)].code : undefined);
    if (c) { setCode(c); setTimeout(() => run(c), 260); }
  };
  const p = last?.sku ? productBySku(last.sku) : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ position: "relative", padding: compact ? 12 : 16, borderRadius: "var(--r-md,16px)", background: "linear-gradient(180deg,var(--surface-2),var(--surface))", border: "1px solid var(--border)", overflow: "hidden" }}>
        <span key={beam} style={{ position: "absolute", left: 0, right: 0, top: 0, height: 2, background: "linear-gradient(90deg,transparent,var(--accent),transparent)", boxShadow: "0 0 18px var(--accent)",
          animation: beam ? "scanBeam 0.9s var(--ease) both" : "none", opacity: beam ? 1 : 0 }} />
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <Icon d={I.scan} size={17} />
          </span>
          <input className="ix1g" value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && code.trim()) run(code); }} placeholder={placeholder}
            style={{ flex: "1 1 220px", minWidth: 0, height: 38, padding: "0 12px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--r-ctl,10px)", outline: 0, color: "var(--ink)",
              fontFamily: "var(--mono)", fontSize: 12.5 }} />
          <Btn kind="secondary" onClick={() => code.trim() && run(code)} disabled={!code.trim()}>Scan</Btn>
          <Btn kind="primary" icon={I.scan} onClick={sim}>Simulate scan</Btn>
        </div>
        {hint && <div style={{ marginTop: 9, fontSize: 12, color: "var(--dim)" }}>{hint}</div>}
        {samples.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, alignItems: "center" }}>
            <span style={{ ...label, fontSize: 9 }}>Sample barcodes</span>
            {samples.map(s => (
              <button key={s.code} onClick={() => { setCode(s.code); run(s.code); }} className="ixa" title={s.code}
                style={{ height: 24, padding: "0 9px", borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--body)", fontSize: 11, cursor: "pointer" }}>
                {s.label}
              </button>
            ))}
          </div>
        )}
        {extra}
      </div>

      {last && (
        <div style={{ padding: compact ? 12 : 14, borderRadius: "var(--r-md,16px)", border: "1px solid " + (err ? "var(--bad-soft)" : "var(--accent-line)"), background: err ? "var(--bad-soft)" : "var(--accent-faint)", animation: "popIn .25s var(--ease) both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Badge tone={err ? "bad" : "ok"}>{err ? "Not accepted" : "Decoded"}</Badge>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)", wordBreak: "break-all", flex: 1, minWidth: 0 }}>{last.raw}</span>
          </div>
          {p && <div style={{ marginTop: 9, fontSize: 14, fontWeight: 600 }}>{p.sku} · {p.name}</div>}
          {err && <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--bad)" }}>{err}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8, marginTop: 10 }}>
            {describe(last).map(([k, v, ai]) => (
              <div key={k} style={{ padding: "8px 10px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, minWidth: 0 }}>
                <div style={{ ...label, fontSize: 8.5 }}>{ai} {k}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 12, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis" }}>{v}</div>
              </div>
            ))}
          </div>
          {last.gtin && <div style={{ marginTop: 8, fontSize: 11, color: "var(--faint)" }}>Demo identifier: company prefix 999 is not a real manufacturer GTIN.</div>}
        </div>
      )}
    </div>
  );
}
