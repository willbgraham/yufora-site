import type { NextRequest } from "next/server";
import { entrantsToCsv, getEntrantsExport } from "@/lib/data/giveaways";
import { requireGiveawayAdmin } from "@/lib/giveaways/admin-access";

/** Entrant CSV. ?list=1 → only people who opted in to the charity's list. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { charity } = await requireGiveawayAdmin();
  const { id } = await ctx.params;
  const onlyList = req.nextUrl.searchParams.get("list") === "1";
  const data = await getEntrantsExport(id, charity.id, onlyList);
  if (!data) return new Response("Not found", { status: 404 });
  const date = new Date().toISOString().slice(0, 10);
  const name = `giveaway-${onlyList ? "mailing-list" : "entrants"}-${date}.csv`;
  return new Response(entrantsToCsv(data.rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
