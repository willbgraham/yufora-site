import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateProduct } from "@/app/actions/products";
import PhotoManager from "@/components/admin/PhotoManager";
import ProductForm from "@/components/admin/ProductForm";
import StatusControls from "@/components/admin/StatusControls";
import { getCharityForUser } from "@/lib/data/charity";
import { getProductForCharity } from "@/lib/data/products";
import { MAX_PHOTOS_PER_PRODUCT } from "@/lib/storage";
import { requireSession } from "@/lib/session";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const charity = await getCharityForUser(session.user.id);
  if (!charity) redirect("/admin");

  const product = await getProductForCharity(id, charity.id);
  if (!product || product.status === "archived") notFound();

  const boundUpdate = updateProduct.bind(null, product.id);

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/admin/products"
        className="text-sm text-warm-600 hover:text-pink-700"
      >
        ← Products
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl">{product.title}</h1>
        {product.status === "published" && (
          <Link
            href={`/s/${charity.slug}/p/${product.id}`}
            className="text-sm text-pink-700 hover:underline"
          >
            View live →
          </Link>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-warm-200 bg-white p-6">
        <StatusControls productId={product.id} status={product.status} />
      </div>

      <section
        aria-labelledby="photos-heading"
        className="mt-6 rounded-xl border border-warm-200 bg-white p-6"
      >
        <h2 id="photos-heading" className="text-xl">
          Photos
        </h2>
        <div className="mt-4">
          <PhotoManager
            productId={product.id}
            photos={product.photos.map((p) => ({ id: p.id, url: p.url }))}
            maxPhotos={MAX_PHOTOS_PER_PRODUCT}
          />
        </div>
      </section>

      <section
        aria-labelledby="details-heading"
        className="mt-6 rounded-xl border border-warm-200 bg-white p-6 sm:p-8"
      >
        <h2 id="details-heading" className="text-xl">
          Details
        </h2>
        <div className="mt-4">
          <ProductForm
            action={boundUpdate}
            submitLabel="Save changes"
            defaults={{
              title: product.title,
              description: product.description,
              price: (product.goalCents / 100).toString(),
              videoUrl: product.videoUrl ?? "",
            }}
          />
        </div>
      </section>
    </div>
  );
}
