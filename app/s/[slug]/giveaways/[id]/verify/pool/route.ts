import { getPoolText, getPublicGiveaway } from "@/lib/data/giveaways";

/**
 * The anonymous, canonical entry list of a locked draw — one
 * "<entryId>,<entrantId>" line per entry, sorted, no names or emails.
 * Anyone can hash it and recompute the result. Immutable once locked.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await ctx.params;
  const data = await getPublicGiveaway(slug, id);
  const text = data ? await getPoolText(data.giveaway.id) : null;
  if (text === null) return new Response("Not found", { status: 404 });
  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `inline; filename="giveaway-${id}-entries.txt"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
