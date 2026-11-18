/* GS1 / UDI helpers for the scanner simulation.

   Barcodes are shown in GS1 human-readable form, for example
   (01)09994020400045(17)310831(10)L2609-204B
   (01) = GTIN (also the UDI-DI), (17) = expiry YYMMDD, (10) = lot, (21) = serial.
   The 999 company prefix is not a real manufacturer: these are demo identifiers. */

import { PRODUCTS, productBySku, type Product } from "./data";

export type Gs1 = { raw: string; gtin?: string; expiry?: string; lot?: string; serial?: string; sku?: string; ok: boolean; error?: string };

export function buildGs1(p: { gtin: string; expiry?: string; lot?: string; serial?: string }): string {
  let s = "(01)" + p.gtin;
  if (p.expiry) s += "(17)" + p.expiry.slice(2, 4) + p.expiry.slice(5, 7) + p.expiry.slice(8, 10);
  if (p.lot) s += "(10)" + p.lot;
  if (p.serial) s += "(21)" + p.serial;
  return s;
}

export function parseGs1(input: string): Gs1 {
  const raw = (input || "").trim();
  if (!raw) return { raw, ok: false, error: "Nothing scanned" };
  // A bare internal code also identifies the product (no lot or serial).
  const bare = raw.toUpperCase();
  if (/^HH-[A-Z]{2}-\d{3}$/.test(bare)) return { raw, sku: bare, gtin: productBySku(bare)?.gtin, ok: !!productBySku(bare), error: productBySku(bare) ? undefined : "Unknown product code" };
  const out: Gs1 = { raw, ok: false };
  const re = /\((\d{2})\)([^(]+)/g;
  let m: RegExpExecArray | null, any = false;
  while ((m = re.exec(raw))) {
    any = true;
    const [, ai, val] = m;
    if (ai === "01") out.gtin = val.trim();
    else if (ai === "17") { const v = val.trim(); out.expiry = "20" + v.slice(0, 2) + "-" + v.slice(2, 4) + "-" + v.slice(4, 6); }
    else if (ai === "10") out.lot = val.trim();
    else if (ai === "21") out.serial = val.trim();
  }
  if (!any) return { raw, ok: false, error: "Not a GS1 barcode. Try a sample, or an HH- product code." };
  const p = PRODUCTS.find(x => x.gtin === out.gtin);
  if (!p) return { ...out, ok: false, error: "GTIN not in the product master" };
  out.sku = p.sku;
  out.ok = true;
  return out;
}

export function productFor(g: Gs1): Product | undefined {
  return g.sku ? productBySku(g.sku) : undefined;
}

/** Describe the parsed elements for display: [label, value, AI]. */
export function describe(g: Gs1): [string, string, string][] {
  const rows: [string, string, string][] = [];
  if (g.gtin) rows.push(["GTIN / UDI-DI", g.gtin, "(01)"]);
  if (g.expiry) rows.push(["Expiry", g.expiry, "(17)"]);
  if (g.lot) rows.push(["Lot / batch", g.lot, "(10)"]);
  if (g.serial) rows.push(["Serial", g.serial, "(21)"]);
  return rows;
}
