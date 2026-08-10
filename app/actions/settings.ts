"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { charities } from "@/lib/db/schema";
import { getCharityForUser } from "@/lib/data/charity";
import { requireSession } from "@/lib/session";

export type SettingsState = { status: "idle" | "error"; message?: string };

const urlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => {
      if (v === "") return true;
      try {
        const u = new URL(v);
        return u.protocol === "https:" || u.protocol === "http:";
      } catch {
        return false;
      }
    },
    { message: "Enter the full address, like https://yoursite.org/wishlist" },
  );

/** Saves the page on the charity's site where the shop is embedded. */
export async function saveEmbedPageUrl(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const session = await requireSession();
  const charity = await getCharityForUser(session.user.id);
  if (!charity) return { status: "error", message: "No shop found." };

  const parsed = urlSchema.safeParse(formData.get("embedPageUrl"));
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Please check the address",
    };
  }

  await db
    .update(charities)
    .set({ embedPageUrl: parsed.data === "" ? null : parsed.data })
    .where(eq(charities.id, charity.id));

  revalidatePath("/admin");
  return { status: "idle", message: "Saved." };
}
