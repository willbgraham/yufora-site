import "server-only";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { charities, productPhotos, products } from "@/lib/db/schema";

export type ProductWithPhotos = typeof products.$inferSelect & {
  photos: (typeof productPhotos.$inferSelect)[];
};

async function attachPhotos(
  rows: (typeof products.$inferSelect)[],
): Promise<ProductWithPhotos[]> {
  if (rows.length === 0) return [];
  const photos = await db
    .select()
    .from(productPhotos)
    .where(
      inArray(
        productPhotos.productId,
        rows.map((p) => p.id),
      ),
    )
    .orderBy(asc(productPhotos.sortOrder));
  return rows.map((p) => ({
    ...p,
    photos: photos.filter((ph) => ph.productId === p.id),
  }));
}

/** All non-archived products for the admin list. */
export async function getProductsForCharity(charityId: string) {
  const rows = await db
    .select()
    .from(products)
    .where(
      and(eq(products.charityId, charityId), ne(products.status, "archived")),
    )
    .orderBy(desc(products.createdAt));
  return attachPhotos(rows);
}

/** One product, only if it belongs to the given charity (ownership check). */
export async function getProductForCharity(
  productId: string,
  charityId: string,
) {
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.charityId, charityId)))
    .limit(1);
  const product = rows[0];
  if (!product) return null;
  const [withPhotos] = await attachPhotos([product]);
  return withPhotos;
}

/** Public shop: charity by slug plus its published products. */
export async function getPublicShop(slug: string) {
  const rows = await db
    .select()
    .from(charities)
    .where(eq(charities.slug, slug))
    .limit(1);
  const charity = rows[0];
  if (!charity) return null;

  const items = await db
    .select()
    .from(products)
    .where(
      and(eq(products.charityId, charity.id), eq(products.status, "published")),
    )
    .orderBy(asc(products.sortOrder), desc(products.createdAt));

  return { charity, products: await attachPhotos(items) };
}

/** Public product page: only if published and under this slug. */
export async function getPublicProduct(slug: string, productId: string) {
  const shop = await getPublicShop(slug);
  if (!shop) return null;
  const product = shop.products.find((p) => p.id === productId);
  if (!product) return null;
  return { charity: shop.charity, product };
}
