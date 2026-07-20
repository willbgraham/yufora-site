"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { productPhotos, products } from "@/lib/db/schema";
import { getCharityForUser } from "@/lib/data/charity";
import { getProductForCharity } from "@/lib/data/products";
import { parseDollarsToCents } from "@/lib/money";
import { parseVideoUrl } from "@/lib/video";
import {
  MAX_PHOTOS_PER_PRODUCT,
  deletePhotoBlob,
  photoValidationError,
  savePhoto,
} from "@/lib/storage";
import { requireSession } from "@/lib/session";

export type ProductFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

/** Every product action runs through this: session → charity → ownership. */
async function requireCharity() {
  const session = await requireSession();
  const charity = await getCharityForUser(session.user.id);
  if (!charity) redirect("/admin");
  return charity;
}

const productSchema = z.object({
  title: z.string().trim().min(2, "Please give the item a name").max(140),
  description: z.string().trim().max(5000).default(""),
  price: z.string().trim().min(1, "Please enter a price"),
  videoUrl: z.string().trim().max(500).default(""),
});

function validateProductForm(formData: FormData):
  | { ok: true; values: { title: string; description: string; goalCents: number; videoUrl: string | null } }
  | { ok: false; state: ProductFormState } {
  const parsed = productSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    price: formData.get("price"),
    videoUrl: formData.get("videoUrl"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return {
      ok: false,
      state: { status: "error", message: "Please check the highlighted fields.", fieldErrors },
    };
  }

  const goalCents = parseDollarsToCents(parsed.data.price);
  if (goalCents === null) {
    return {
      ok: false,
      state: {
        status: "error",
        message: "Please check the highlighted fields.",
        fieldErrors: { price: "Enter a price like 1200 or 1,200.50 (up to $1,000,000)" },
      },
    };
  }

  let videoUrl: string | null = null;
  if (parsed.data.videoUrl) {
    if (!parseVideoUrl(parsed.data.videoUrl)) {
      return {
        ok: false,
        state: {
          status: "error",
          message: "Please check the highlighted fields.",
          fieldErrors: { videoUrl: "Paste a YouTube or Vimeo link (or leave it empty)" },
        },
      };
    }
    videoUrl = parsed.data.videoUrl;
  }

  return {
    ok: true,
    values: {
      title: parsed.data.title,
      description: parsed.data.description,
      goalCents,
      videoUrl,
    },
  };
}

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const charity = await requireCharity();

  const result = validateProductForm(formData);
  if (!result.ok) return result.state;

  const [row] = await db
    .insert(products)
    .values({ charityId: charity.id, ...result.values })
    .returning({ id: products.id });

  revalidatePath("/admin/products");
  // Straight to the edit page so photos can be added.
  redirect(`/admin/products/${row.id}`);
}

export async function updateProduct(
  productId: string,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const charity = await requireCharity();
  const product = await getProductForCharity(productId, charity.id);
  if (!product) return { status: "error", message: "Product not found." };

  const result = validateProductForm(formData);
  if (!result.ok) return result.state;

  await db
    .update(products)
    .set(result.values)
    .where(and(eq(products.id, productId), eq(products.charityId, charity.id)));

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath(`/s/${charity.slug}`);
  return { status: "idle", message: "Saved." };
}

const statusSchema = z.enum(["draft", "published", "archived"]);

export async function setProductStatus(productId: string, status: string) {
  const charity = await requireCharity();
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return;

  await db
    .update(products)
    .set({ status: parsed.data })
    .where(and(eq(products.id, productId), eq(products.charityId, charity.id)));

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath(`/s/${charity.slug}`);
  if (parsed.data === "archived") redirect("/admin/products");
}

export type PhotoFormState = { status: "idle" | "error"; message?: string };

export async function addProductPhotos(
  productId: string,
  _prev: PhotoFormState,
  formData: FormData,
): Promise<PhotoFormState> {
  const charity = await requireCharity();
  const product = await getProductForCharity(productId, charity.id);
  if (!product) return { status: "error", message: "Product not found." };

  const files = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) {
    return { status: "error", message: "Choose at least one photo." };
  }
  if (product.photos.length + files.length > MAX_PHOTOS_PER_PRODUCT) {
    return {
      status: "error",
      message: `A product can have up to ${MAX_PHOTOS_PER_PRODUCT} photos.`,
    };
  }
  for (const file of files) {
    const error = photoValidationError(file);
    if (error) return { status: "error", message: error };
  }

  let sortOrder =
    product.photos.length === 0
      ? 0
      : Math.max(...product.photos.map((p) => p.sortOrder)) + 1;

  try {
    for (const file of files) {
      const url = await savePhoto(file, productId);
      await db
        .insert(productPhotos)
        .values({ productId, url, sortOrder: sortOrder++ });
    }
  } catch (err) {
    console.error("[products] photo upload failed", err);
    return {
      status: "error",
      message:
        err instanceof Error && /BLOB_READ_WRITE_TOKEN/.test(err.message)
          ? "Photo storage isn't configured yet."
          : "Upload failed. Please try again.",
    };
  }

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath(`/s/${charity.slug}`);
  return { status: "idle" };
}

export async function deleteProductPhoto(photoId: string) {
  const charity = await requireCharity();

  // Ownership check via join: the photo's product must belong to this charity.
  const rows = await db
    .select({ photo: productPhotos, charityId: products.charityId })
    .from(productPhotos)
    .innerJoin(products, eq(productPhotos.productId, products.id))
    .where(eq(productPhotos.id, photoId))
    .limit(1);

  const row = rows[0];
  if (!row || row.charityId !== charity.id) return;

  await db.delete(productPhotos).where(eq(productPhotos.id, photoId));
  await deletePhotoBlob(row.photo.url);

  revalidatePath(`/admin/products/${row.photo.productId}`);
  revalidatePath(`/s/${charity.slug}`);
}
