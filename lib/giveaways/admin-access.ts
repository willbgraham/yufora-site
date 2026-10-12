import "server-only";
import { redirect } from "next/navigation";
import { getCharityForUser } from "../data/charity";
import { requireSession } from "../session";
import { canUseGiveaways } from "./flags";

/** Session → Giveaways access → charity, for every admin giveaway page/route. */
export async function requireGiveawayAdmin() {
  const session = await requireSession();
  if (!canUseGiveaways(session.user.email)) redirect("/admin");
  const charity = await getCharityForUser(session.user.id);
  if (!charity) redirect("/admin");
  return { session, charity };
}
