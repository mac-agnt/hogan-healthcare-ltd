/* Compliance module: device register, UDI and lot trace, quality documents,
   exceptions and the audit history. A design reference for a medical-device
   distributor's operational traceability: not certified, validated or
   regulator-approved. Registers the "doc" and "qx" drawers. */

import { registerRecordView } from "../store";
import { INV_CSS } from "./inventory/bits";
import Register from "./compliance/Register";
import UdiTrace from "./compliance/UdiTrace";
import Docs from "./compliance/Docs";
import Exceptions from "./compliance/Exceptions";
import Audit from "./compliance/Audit";
import { DocRecord, QxRecord } from "./compliance/records";

registerRecordView("doc", DocRecord, "Document");
registerRecordView("qx", QxRecord, "Exception");

export default function Compliance({ tab }: { tab: string }) {
  const page = (() => {
    switch (tab) {
      case "udi": return <UdiTrace />;
      case "docs": return <Docs />;
      case "exceptions": return <Exceptions />;
      case "audit": return <Audit />;
      default: return <Register />;
    }
  })();
  return (
    <>
      <style>{INV_CSS}</style>
      {page}
    </>
  );
}
