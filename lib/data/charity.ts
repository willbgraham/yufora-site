import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { charities } from "@/lib/db/schema";

export async function getCharityForUser(userId: string) {
  const rows = await db
    .select()
    .from(charities)
    .where(eq(charities.ownerUserId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
