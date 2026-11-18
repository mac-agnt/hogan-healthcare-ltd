/* Sales module: My Day, Pipeline, Accounts, Follow-ups, Weekly Planner, Team Performance.
   Registers the account, opportunity and quotation drawer views. */

import { registerRecordView } from "../store";
import MyDay from "./sales/MyDay";
import Pipeline from "./sales/Pipeline";
import Accounts from "./sales/Accounts";
import Followups from "./sales/Followups";
import Planner from "./sales/Planner";
import Team from "./sales/Team";
import { AccountRecord, OppRecord, QuoteRecord } from "./sales/records";

registerRecordView("account", AccountRecord, "Account");
registerRecordView("opp", OppRecord, "Opportunity");
registerRecordView("quote", QuoteRecord, "Quotation");

export default function Sales({ tab }: { tab: string }) {
  switch (tab) {
    case "pipeline": return <Pipeline />;
    case "accounts": return <Accounts />;
    case "followups": return <Followups />;
    case "planner": return <Planner />;
    case "team": return <Team />;
    default: return <MyDay />;
  }
}
