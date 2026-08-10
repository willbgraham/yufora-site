"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { charities } from "@/lib/db/schema";
import { getCharityForUser, slugify } from "@/lib/data/charity";
import { requireSession } from "@/lib/session";

export type CharityFormState = {
  status: "idle" | "error";
  message?: string;
};

const createCharitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your organization's name")
    .max(120),
});

export async function createCharity(
  _prev: CharityFormState,
  formData: FormData,
): Promise<CharityFormState> {
  const session = await requireSession();

  const parsed = createCharitySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Please check the name",
    };
  }

  // v1: one charity per account.
  const existing = await getCharityForUser(session.user.id);
  if (existing) {
    return { status: "error", message: "You already have a shop set up." };
  }

  const base = slugify(parsed.data.name) || "shop";

  // Find a free slug: base, base-2, base-3, …
  let slug = base;
  for (let n = 2; ; n++) {
    const taken = await db
      .select({ id: charities.id })
      .from(charities)
      .where(eq(charities.slug, slug))
      .limit(1);
    if (taken.length === 0) break;
    slug = `${base}-${n}`;
  }

  await db.insert(charities).values({
    name: parsed.data.name,
    slug,
    ownerUserId: session.user.id,
  });

  revalidatePath("/admin");
  return { status: "idle" };
}
