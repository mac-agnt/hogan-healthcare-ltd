/* Global Hogan layers mounted by AppShell: the module page router, the
   slide-out record drawer and the toast stack. */

import { useEffect, type ComponentType } from "react";
import * as D from "./data";
import { backRecord, closeRecord, recordView, tabOf, useHogan } from "./store";
import * as Store from "./store";

/* Dev aid: the whole store API on window.__hh for console checks during the demo build. */
if (typeof window !== "undefined") (window as unknown as { __hh: typeof Store }).__hh = Store;
import { Btn, I, Icon, KV, RecordHead, label } from "./ui";
import Sales from "./modules/Sales";
import Orders from "./modules/Orders";
import Inventory from "./modules/Inventory";
import Purchasing from "./modules/Purchasing";
import Finance from "./modules/Finance";
import Compliance from "./modules/Compliance";
import Rentals from "./modules/Rentals";

const MODULES: Record<string, ComponentType<{ tab: string }>> = { Sales, Orders, Inventory, Purchasing, Finance, Compliance, Rentals };

/** Renders the active business-operations module for the current page and tab. */
export function HoganPage({ page }: { page: string }) {
  const s = useHogan();
  const M = MODULES[page];
  if (!M) return null;
  const tab = tabOf(page, s);
  return <M key={page + ":" + tab} tab={tab} />;
}

/* Fallback detail view for a record type no module has registered. */
function GenericRecord({ type, id }: { type: string; id: string }) {
  const s = useHogan();
  const pools: Record<string, any[]> = {
    task: s.tasks, approval: s.approvals, staff: D.STAFF, supplier: D.SUPPLIERS, account: D.ACCOUNTS, product: D.PRODUCTS, order: s.orders, po: s.pos,
    bill: s.bills, invoice: s.invoices, booking: s.bookings, rental: s.assets, loanset: s.loanSets, return: s.returns, doc: D.QUALITY_DOCS, qx: s.qx,
    transfer: s.transfers, opp: s.opps, quote: D.QUOTES, grn: s.grns, bank: s.bank, location: D.LOCATIONS, movement: s.movements,
  };
  const rec = (pools[type] || []).find((r: any) => (r.id ?? r.sku) === id);
  if (!rec) return (
    <div>
      <RecordHead kind={type} title={id} sub="History from the current ERP. In this demo only the story records carry full detail; this one is shown by reference." />
    </div>
  );
  const items = Object.entries(rec).filter(([, v]) => v !== undefined && typeof v !== "object").slice(0, 16)
    .map(([k, v]) => [k.replace(/([A-Z])/g, " $1"), String(v)] as [string, string]);
  return (
    <div>
      <RecordHead kind={type} title={rec.title || rec.name || id} status={rec.status} />
      <KV items={items} style={{ marginTop: 18 }} />
    </div>
  );
}

/** Slide-out record panel with a back stack, so records can be followed link to link. */
export function RecordDrawerHost() {
  const s = useHogan();
  const top = s.drawer[s.drawer.length - 1];
  useEffect(() => {
    if (!top) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") closeRecord(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [top]);
  if (!top) return null;
  const reg = recordView(top.type);
  const View = reg?.view;
  const trail = s.drawer.slice(-4);
  return (
    <div onClick={closeRecord} style={{ position: "fixed", inset: 0, zIndex: 80, background: "var(--scrim)", backdropFilter: "blur(5px)", display: "flex", justifyContent: "flex-end", animation: "scrimIn .2s var(--ease) both" }}>
      <aside onClick={e => e.stopPropagation()} data-theme-inherit
        style={{ width: "min(640px,100%)", height: "100%", display: "flex", flexDirection: "column", background: "var(--overlay)", borderLeft: "1px solid var(--border)", backdropFilter: "blur(22px)",
          boxShadow: "-30px 0 80px rgba(0,0,0,.45)", animation: "slideInRight .32s var(--ease) both", color: "var(--ink)" }}>
        <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 8, padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          {s.drawer.length > 1 && <Btn kind="ghost" size="sm" icon={I.back} onClick={backRecord} title="Back">Back</Btn>}
          <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
            {trail.map((r, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                {i > 0 && <Icon d={I.chevron} size={11} color="var(--faint)" />}
                <span style={{ ...label, fontSize: 9.5, color: i === trail.length - 1 ? "var(--ink)" : "var(--faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {(recordView(r.type)?.label || r.type)} {r.id.split("|").pop()}
                </span>
              </span>
            ))}
          </div>
          <button onClick={closeRecord} className="ixm" title="Close (Esc)" style={{ width: 30, height: 30, border: "1px solid var(--border)", borderRadius: "var(--r-ctl,10px)", background: "none", color: "var(--dim)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d={I.x} size={12} stroke={2.4} />
          </button>
        </div>
        <div key={top.type + top.id + s.drawer.length} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 22px 32px", animation: "fadeUp .25s var(--ease) both" }}>
          {View ? <View id={top.id} /> : <GenericRecord type={top.type} id={top.id} />}
        </div>
      </aside>
    </div>
  );
}

export function ToastHost() {
  const s = useHogan();
  if (!s.toasts.length) return null;
  return (
    <div style={{ position: "fixed", left: "50%", bottom: 22, transform: "translateX(-50%)", zIndex: 95, display: "flex", flexDirection: "column", gap: 8, alignItems: "center", pointerEvents: "none" }}>
      {s.toasts.map(t => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "var(--tooltip)", color: "var(--tooltip-ink)", border: "1px solid var(--border-strong)",
          borderRadius: 999, boxShadow: "0 18px 44px rgba(0,0,0,.4)", fontSize: 13, animation: "notifCard .5s cubic-bezier(.16,1,.28,1) both", maxWidth: "min(620px,92vw)" }}>
          <span style={{ width: 20, height: 20, borderRadius: 999, flex: "none", display: "flex", alignItems: "center", justifyContent: "center",
            background: t.kind === "warn" ? "var(--warn-soft)" : t.kind === "info" ? "var(--accent-soft)" : "var(--ok-soft)", color: t.kind === "warn" ? "var(--warn)" : t.kind === "info" ? "var(--accent)" : "var(--ok)" }}>
            <Icon d={t.kind === "warn" ? I.alert : t.kind === "info" ? I.info : I.check} size={11} stroke={2.4} />
          </span>
          {t.text}
        </div>
      ))}
    </div>
  );
}
