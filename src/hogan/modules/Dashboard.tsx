/* Dashboard module: the management pages under the Pulse KPI band.
   Tabs: exec · sales · inventory · finance · ops (see MODULE_TABS in store.ts). */

import Exec from "./dashboard/Exec";
import SalesPerf from "./dashboard/SalesPerf";
import InventoryPerf from "./dashboard/InventoryPerf";
import FinanceMargins from "./dashboard/FinanceMargins";
import OpsTrends from "./dashboard/OpsTrends";

export default function Dashboard({ tab }: { tab: string }) {
  switch (tab) {
    case "sales": return <SalesPerf />;
    case "inventory": return <InventoryPerf />;
    case "finance": return <FinanceMargins />;
    case "ops": return <OpsTrends />;
    default: return <Exec />;
  }
}
