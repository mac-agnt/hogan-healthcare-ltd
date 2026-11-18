/* Inventory · Hospital Stock: consignment stock held at each hospital site.
   Card view works on a tablet in a theatre store; a site opens its full breakdown. */

import { useMemo, type ReactNode } from "react";
import * as D from "../../data";
import { eur, num, rel } from "../../fmt";
import { approveTransfer, nav, openRecord, proposeTransfer, useHogan, useUi } from "../../store";
import { Avatar, Badge, Btn, Card, Chip, Empty, Grid, I, Icon, Kpi, Page, PageHeader, Person, RecLink, Row, Seg, Table, Timeline, label, type Col } from "../../ui";
import { CatPill, Expiry, ParBar, SkuCell, Stat, dd, toTop } from "./bits";
import { siteLows, siteStat, type SiteSku, type SiteStat } from "./model";

type View = "cards" | "table";

export default function HospitalStock() {
  const s = useHogan();
  const [view, setView] = useUi<View>("inventory.hospView", "cards");
  const [site, setSiteRaw] = useUi("inventory.site", "");
  const setSite = (id: string) => { setSiteRaw(id); toTop(); };
  const low = useMemo(() => siteLows(s), [s]);
  const stats = useMemo(() => D.SITES.map(l => siteStat(s, l, low)), [s, low]);
  const sel = stats.find(x => x.loc.id === site);
  const held = stats.reduce((a, x) => a + x.units, 0);
  const value = stats.reduce((a, x) => a + x.value, 0);

  if (sel) return <SiteDetail x={sel} stats={stats} onPick={setSite} />;

  const cols: Col<SiteStat>[] = [
    { key: "site", label: "Hospital site", w: "minmax(180px,1.8fr)", sort: r => r.loc.name, render: r => (
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.loc.name}</div>
        <div style={{ fontSize: 11.5, color: "var(--faint)" }}>{r.loc.area} · {r.loc.agreement}</div>
      </div>) },
    { key: "units", label: "Units", w: "0.55fr", align: "right", sort: r => r.units, render: r => <b style={{ fontWeight: 600, color: "var(--ink)" }}>{r.units}</b> },
    { key: "value", label: "Value at cost", w: "0.85fr", align: "right", sort: r => r.value, render: r => eur(r.value) },
    { key: "cats", label: "Categories (units)", w: "1.9fr", render: r => (
      <span title={r.cats.map(c => c.cat.short + " " + c.units).join(" · ")} style={{ display: "flex", gap: 10, whiteSpace: "nowrap", overflow: "hidden", fontSize: 12 }}>
        {r.cats.map(c => <span key={c.cat.id} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: 2, background: c.cat.color }} />{c.cat.short} <span style={{ color: "var(--faint)" }}>{c.units}</span></span>)}
      </span>) },
    { key: "low", label: "Low", title: "Products below par", w: "0.5fr", align: "right", sort: r => r.low.length, render: r => r.low.length ? <Badge tone="warn">{r.low.length}</Badge> : <span style={{ color: "var(--faint)" }}>0</span> },
    { key: "verify", label: "Verify", w: "0.6fr", align: "right", sort: r => r.verify.length, render: r => r.verify.length ? <Badge tone="info">{r.verify.length}</Badge> : <span style={{ color: "var(--faint)" }}>0</span> },
    { key: "used", label: "Used 30d", title: "Units used in the last 30 days", w: "0.7fr", align: "right", sort: r => r.usedUnits, render: r => r.usedUnits },
    { key: "repl", label: "Replenished", title: "Last replenished", w: "0.9fr", sort: r => r.lastRepl || "", render: r => <span title={rel(r.lastRepl || "")}>{dd(r.lastRepl, false)}</span> },
    { key: "pend", label: "Transfers", w: "0.7fr", align: "right", sort: r => r.pending.length, render: r => r.pending.length ? <Badge tone="warn">{r.pending.length} pending</Badge> : <span style={{ color: "var(--faint)" }}>None</span> },
  ];

  return (
    <Page>
      <PageHeader eyebrow="Inventory" title="Hospital Stock"
        sub={num(held) + " units worth " + eur(value) + " at cost sit on hospital shelves under consignment. Hogan owns them until the hospital reports use. Pick a site to see every line, lot and par level."}
        right={<Seg<View> value={view} onChange={setView} items={[["cards", "Cards"], ["table", "Table"]]} />} />

      {view === "cards" ? (
        <Grid min={252} gap={12} style={{ alignItems: "stretch" }}>
          {stats.map((x, i) => <SiteCard key={x.loc.id} x={x} i={i} onOpen={() => setSite(x.loc.id)} />)}
        </Grid>
      ) : (
        <Card flush pad={14} title="Consignment sites" sub="Click a site for its full stock breakdown.">
          <Table<SiteStat> cols={cols} rows={stats} rowKey={r => r.loc.id} onRow={r => setSite(r.loc.id)} minWidth={980} dense
            footer={<span>{stats.length} fictional demo sites · {num(held)} units · {eur(value)} at cost.</span>} />
        </Card>
      )}
    </Page>
  );
}

function SiteCard({ x, i, onOpen }: { x: SiteStat; i: number; onOpen: () => void }) {
  const atPar = x.skus.filter(k => k.par === undefined || k.qty >= k.par).length;
  const warn = x.low.length > 0;
  return (
    <Card onClick={onOpen} pad={16} tone={warn ? "warn" : undefined} style={{ animation: "fadeUp .4s var(--ease) both", animationDelay: i * 35 + "ms" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span style={{ width: 32, height: 32, flex: "none", borderRadius: 10, background: warn ? "var(--warn-soft)" : "var(--accent-soft)", color: warn ? "var(--warn)" : "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d={I.hospital} size={16} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-.2px", lineHeight: 1.25 }}>{x.loc.name}</div>
            <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{x.loc.area} · {x.loc.agreement}</div>
          </div>
          {x.account && <Avatar id={x.account.owner} size={24} title={"Account owner: " + (D.staffById(x.account.owner)?.name || "")} />}
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
          <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-1px", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{x.units}</span>
          <span style={{ fontSize: 12, color: "var(--dim)", paddingBottom: 2 }}>units</span>
          <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{eur(x.value)}</span>
        </div>
        <div>
          <div style={{ height: 6, borderRadius: 6, background: "var(--track)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: (atPar / Math.max(1, x.skus.length)) * 100 + "%", background: warn ? "var(--warn)" : "var(--accent)", borderRadius: 6, transformOrigin: "left", animation: "sweep .8s var(--ease) both" }} />
          </div>
          <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 5 }}>{atPar} of {x.skus.length} products at or above par</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "10px 8px" }}>
          <Stat k="Below par" v={x.low.length} tone={x.low.length ? "warn" : undefined} />
          <Stat k="To verify" v={x.verify.length} tone={x.verify.length ? "info" : undefined} />
          <Stat k="Used · 30d" v={x.usedUnits} />
          <Stat k="Replenished" v={dd(x.lastRepl, false)} />
          <Stat k="Pending" v={x.pending.length ? x.pending.length + " TR" : "None"} tone={x.pending.length ? "warn" : undefined} />
          <Stat k="Lines" v={x.lines.length} />
        </div>

        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {x.cats.map(c => <CatPill key={c.cat.id} cat={c.cat.id} n={c.units} />)}
        </div>

        {(x.low.length > 0 || x.verify.length > 0) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
            {x.low.map(lo => <LowLine key={lo.line.id} sku={lo.line.sku} qty={lo.line.qty} par={lo.line.min || 0} suggested={lo.suggested} to={x.loc.id} pendingId={lo.pending?.id} />)}
            {x.verify.map(l => (
              <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <Badge tone="info">Verify</Badge>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11.5 }}>{l.sku}</span>
                <span style={{ color: "var(--dim)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.qty} on system</span>
              </div>
            ))}
          </div>
        )}

        <Btn full kind="secondary" icon={I.arrow} style={{ marginTop: "auto" }} onClick={e => { e.stopPropagation(); onOpen(); }}>View stock</Btn>
      </div>
    </Card>
  );
}

/** One below-par line with its replenishment action (used on cards and in the detail view). */
function LowLine({ sku, qty, par, suggested, to, pendingId }: { sku: string; qty: number; par: number; suggested: number; to: D.LocId; pendingId?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, flexWrap: "wrap" }}>
      <Badge tone="warn">{qty} / par {par}</Badge>
      <span onClick={e => e.stopPropagation()}><RecLink type="product" id={sku} style={{ fontFamily: "var(--mono)", fontSize: 11.5 }} /></span>
      <span style={{ flex: 1 }} />
      {pendingId
        ? <span onClick={e => e.stopPropagation()} style={{ fontSize: 11.5, color: "var(--warn)" }}><RecLink type="transfer" id={pendingId} /> awaiting John</span>
        : <Btn size="sm" kind="accent" icon={I.route} onClick={e => { e.stopPropagation(); proposeTransfer({ sku, to, qty: suggested, by: "GH" }); }}>Replenish {suggested}</Btn>}
    </div>
  );
}

/* ── Site detail ────────────────────────────────────────────────────────── */

function SiteDetail({ x, stats, onPick }: { x: SiteStat; stats: SiteStat[]; onPick: (id: string) => void }) {
  const s = useHogan();
  const rows = x.skus;
  const transfersIn = s.transfers.filter(t => t.to === x.loc.id);
  const owner = x.account ? D.staffById(x.account.owner) : undefined;
  const firstLot = (r: SiteSku) => r.sku + "|" + r.lines[0].lot;

  const action = (r: SiteSku): ReactNode => {
    const lo = r.low;
    if (lo) {
      if (lo.pending) return (
        <Row gap={6} wrap>
          <RecLink type="transfer" id={lo.pending.id} style={{ fontSize: 12 }} />
          <Btn size="sm" kind="primary" icon={I.check} onClick={e => { e.stopPropagation(); approveTransfer(lo.pending!.id, "JC"); }}>Approve as John Culkin</Btn>
        </Row>
      );
      return <Btn size="sm" kind="accent" icon={I.route} onClick={e => { e.stopPropagation(); proposeTransfer({ sku: r.sku, to: x.loc.id, qty: lo.suggested, by: "GH" }); }}>Replenish {lo.suggested}</Btn>;
    }
    if (r.status === "Verify") return <Btn size="sm" kind="secondary" icon={I.layers} onClick={e => { e.stopPropagation(); nav("Inventory", "counts", { "inventory.countLoc": x.loc.id }); }}>Resolve in counts</Btn>;
    return <span style={{ fontSize: 12, color: "var(--faint)" }}>No action</span>;
  };
  const lots = (r: SiteSku) => (
    <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {r.lines.map(l => (
        <span key={l.id} style={{ fontSize: 12 }}>
          <RecLink type="lot" id={l.sku + "|" + l.lot} style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{l.serial || l.lot}</RecLink>
          {r.lines.length > 1 && <span style={{ color: "var(--faint)" }}> · {l.qty}</span>}
        </span>
      ))}
    </span>
  );
  const onHand = (r: SiteSku) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <ParBar qty={r.qty} par={r.par} width={90} />
      <span style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums", color: r.status === "Below par" ? "var(--warn)" : "var(--ink)" }}>
        <b style={{ fontWeight: 600 }}>{r.qty}</b><span style={{ color: "var(--faint)" }}> / {r.par ?? "n/a"}</span>
      </span>
    </div>
  );

  const cols: Col<SiteSku>[] = [
    { key: "p", label: "Product", w: "minmax(200px,2.2fr)", sort: r => r.p?.name || "", render: r => <SkuCell p={r.p} link /> },
    { key: "lot", label: "Lot", w: "1fr", sort: r => r.lines[0].lot, render: r => lots(r) },
    { key: "exp", label: "Expiry", w: "1fr", sort: r => r.nearest || "9999", render: r => <span style={{ fontSize: 12.5 }}><Expiry d={r.nearest} /></span> },
    { key: "par", label: "On hand vs par", w: "1.4fr", sort: r => r.qty - (r.par || 0), render: r => onHand(r) },
    { key: "st", label: "Status", w: "0.8fr", sort: r => r.status, render: r => skuBadge(r) },
    { key: "act", label: "Action", w: "minmax(150px,1.5fr)", render: r => action(r) },
  ];

  return (
    <Page>
      <PageHeader eyebrow="Inventory · Hospital Stock" title={x.loc.name}
        sub={x.loc.area + " · consignment agreement " + x.loc.agreement + ". Stock on this shelf is company-owned until the hospital reports use."}
        right={<>
          <Btn kind="ghost" icon={I.back} onClick={() => onPick("")}>All sites</Btn>
          <Btn icon={I.layers} onClick={() => nav("Inventory", "counts", { "inventory.countLoc": x.loc.id })}>Count this site</Btn>
          <Btn kind="primary" icon={I.external} onClick={() => openRecord("location", x.loc.id)}>Site record</Btn>
        </>} />

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {stats.map(o => <Chip key={o.loc.id} active={o.loc.id === x.loc.id} onClick={() => onPick(o.loc.id)} count={o.low.length ? o.low.length + " low" : o.units}>{o.loc.short}</Chip>)}
      </div>

      <Grid min={140} gap={12}>
        <Kpi label="Units held" value={x.units} sub={x.skus.length + " products · " + x.lines.length + " lots"} />
        <Kpi label="Value at cost" value={eur(x.value)} sub="Company-owned, on consignment" />
        <Kpi label="Below par" value={x.low.length} tone={x.low.length ? "warn" : "ok"} sub={x.low.length ? x.low.map(l => l.line.sku).join(" · ") : "Every product at par"} />
        <Kpi label="To verify" value={x.verify.length} tone={x.verify.length ? "warn" : undefined} sub={x.verify.length ? "Count or usage to confirm" : "Nothing to verify"} />
        <Kpi label="Used · last 30 days" value={x.usedUnits} sub={x.used.length + " usage records"} />
        <Kpi label="Last replenished" value={dd(x.lastRepl, false)} sub={x.lastRepl ? rel(x.lastRepl) : ""} />
      </Grid>

      <Card flush pad={14} title={"Stock on the shelf · " + x.skus.length + " products"} sub="Every product with its lots, expiry and par level. Below-par products can be topped up from the main stockroom; John Culkin approves every transfer.">
        <div className="hhinv-wide">
          <Table<SiteSku> cols={cols} rows={rows} rowKey={r => r.sku} dense minWidth={820} onRow={r => openRecord("lot", firstLot(r))}
            highlight={r => r.status === "Below par"} />
        </div>
        <div className="hhinv-narrow" style={{ padding: "0 12px 12px" }}>
          {rows.map(r => (
            <div key={r.sku} onClick={() => openRecord("lot", firstLot(r))} className="ix11"
              style={{ padding: "12px 4px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8, cursor: "pointer" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}><SkuCell p={r.p} /></div>
                {skuBadge(r)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--dim)", flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--mono)" }}>{r.lines.map(l => l.serial || l.lot).join(", ")}</span>
                <Expiry d={r.nearest} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {onHand(r)}
                <span style={{ flex: 1 }} />
                <span onClick={e => e.stopPropagation()}>{action(r)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Grid min={320} gap={14}>
        <Card title="Usage reported · last 30 days" sub="By date and site only. No patient data is held in Pulse."
          right={<Badge>{x.usedUnits} units</Badge>}>
          {x.used.length ? (
            <Timeline dense items={x.used.slice(0, 8).map(m => ({
              when: dd(m.date) + " · " + m.time + " · " + m.ref + (m.finRef ? " · " + m.finRef : ""),
              title: <span>{m.qty} × {D.productBySku(m.sku)?.name}</span>,
              sub: <span style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{m.sku} · lot {m.lot}</span>,
              tone: "info" as const, icon: I.hospital, onClick: () => openRecord("movement", m.id),
            }))} />
          ) : <Empty title="No usage in the last 30 days" sub="Nothing has been reported used at this site this month." icon={I.hospital} />}
        </Card>
        <Card title="Transfers to this site" sub="Requests raised in Pulse and their approval state."
          right={owner ? <Person id={owner.id} sub="Account owner" size={24} /> : undefined}>
          {transfersIn.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {transfersIn.map(t => (
                <div key={t.id} onClick={() => openRecord("transfer", t.id)} className="ix11"
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", border: "1px solid var(--border)", borderRadius: 12, cursor: "pointer", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--accent)" }}>{t.id}</span>
                  <span style={{ fontSize: 12.5, flex: 1, minWidth: 140 }}>{t.qty} × {t.sku}{t.lot ? " · lot " + t.lot : ""}</span>
                  <Badge tone={t.status === "Completed" ? "ok" : t.status === "Rejected" ? "bad" : "warn"}>{t.status}</Badge>
                  <span style={{ fontSize: 11.5, color: "var(--faint)" }}>{dd(t.completed || t.created, false)}</span>
                </div>
              ))}
            </div>
          ) : <Empty title="No open transfer requests" sub="Requests raised from Replenishment appear here with their approval state." icon={I.route} />}
          <div style={{ ...label, fontSize: 9, marginTop: 14 }}>Last replenished</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>{dd(x.lastRepl)} <span style={{ color: "var(--faint)" }}>· {x.lastRepl ? rel(x.lastRepl) : ""}</span></div>
        </Card>
      </Grid>
    </Page>
  );
}

function skuBadge(r: SiteSku): ReactNode {
  if (r.status === "Below par") return <Badge tone="warn">Below par</Badge>;
  if (r.status === "Verify") return <Badge tone="info" title={r.lines.find(l => l.status === "Verify")?.note}>Verify</Badge>;
  if (r.status === "Quarantine") return <Badge tone="bad">Quarantine</Badge>;
  return <Badge tone="ok">OK</Badge>;
}
