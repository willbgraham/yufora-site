"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { contributions, wallEntries } from "@/lib/db/schema";
import { getCharityForUser } from "@/lib/data/charity";
import { parseDollarsToCents } from "@/lib/money";
import { requireSession } from "@/lib/session";

export type WallFormState = { status: "idle" | "error"; message?: string };

const entrySchema = z.object({
  name: z.string().trim().min(2, "Please enter a name").max(80),
  amount: z.string().trim().max(20).default(""),
  /** The charity must attest it has the supporter's permission. */
  permission: z.literal("on", {
    message: "Please confirm you have their permission",
  }),
});

export async function addWallEntry(
  _prev: WallFormState,
  formData: FormData,
): Promise<WallFormState> {
  const session = await requireSession();
  const charity = await getCharityForUser(session.user.id);
  if (!charity) return { status: "error", message: "No organization found." };

  const parsed = entrySchema.safeParse({
    name: formData.get("name"),
    amount: formData.get("amount"),
    permission: formData.get("permission"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Please check the form",
    };
  }

  let amountCents: number | null = null;
  if (parsed.data.amount !== "") {
    amountCents = parseDollarsToCents(parsed.data.amount);
    if (amountCents === null) {
      return { status: "error", message: "Enter an amount like 250, or leave it empty" };
    }
  }

  await db.insert(wallEntries).values({
    charityId: charity.id,
    name: parsed.data.name,
    amountCents,
  });

  revalidatePath("/admin/wall");
  return { status: "idle", message: "Added." };
}

/**
 * Revokes a gift's public display — e.g. when a donor emails the charity
 * asking to come off the wall. One-way to anonymous by design: consent is
 * opt-in at checkout and revocable forever after, never re-grantable by
 * anyone but the donor.
 */
export async function hideContributionFromWall(contributionId: string) {
  const session = await requireSession();
  const charity = await getCharityForUser(session.user.id);
  if (!charity) return;

  await db
    .update(contributions)
    .set({ displayPreference: "anonymous" })
    .where(
      and(
        eq(contributions.id, contributionId),
        eq(contributions.charityId, charity.id),
      ),
    );

  revalidatePath("/admin/contributions");
}

export async function deleteWallEntry(entryId: string) {
  const session = await requireSession();
  const charity = await getCharityForUser(session.user.id);
  if (!charity) return;

  await db
    .delete(wallEntries)
    .where(and(eq(wallEntries.id, entryId), eq(wallEntries.charityId, charity.id)));

  revalidatePath("/admin/wall");
}
