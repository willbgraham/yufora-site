import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { getCharityForUser } from "@/lib/data/charity";
import { getProductsForCharity } from "@/lib/data/products";
import { formatCents } from "@/lib/money";
import { requireSession } from "@/lib/session";

export default async function ProductsPage() {
  const session = await requireSession();
  const charity = await getCharityForUser(session.user.id);
  if (!charity) redirect("/admin");

  const items = await getProductsForCharity(charity.id);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl">Products</h1>
          <p className="mt-1 text-sm text-warm-600">
            The things your organization needs, as donors will see them.
          </p>
        </div>
        <ButtonLink href="/admin/products/new">New product</ButtonLink>
      </div>

      {items.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-warm-300 bg-white p-10 text-center">
          <p className="text-lg text-warm-900">No products yet.</p>
          <p className="mx-auto mt-2 max-w-md text-warm-700">
            Start with the thing you need most — a real item with a real
            price converts better than a general appeal.
          </p>
          <ButtonLink href="/admin/products/new" className="mt-6">
            Add your first product
          </ButtonLink>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((product) => (
            <li key={product.id}>
              <Link
                href={`/admin/products/${product.id}`}
                className="block overflow-hidden rounded-xl border border-warm-200 bg-white transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-[4/3] bg-warm-100">
                  {product.photos[0] ? (
                    <Image
                      src={product.photos[0].url}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 350px, (min-width: 640px) 45vw, 90vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-warm-500">
                      No photo yet
                    </div>
                  )}
                  <span
                    className={`absolute left-2 top-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      product.status === "published"
                        ? "bg-teal-100 text-teal-700"
                        : "bg-white/90 text-warm-600"
                    }`}
                  >
                    {product.status === "published" ? "Live" : "Draft"}
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="truncate text-lg text-warm-900">
                      {product.title}
                    </h2>
                    <span className="whitespace-nowrap text-sm font-medium text-warm-700">
                      {formatCents(product.goalCents)}
                    </span>
                  </div>
                  <div className="mt-3">
                    <ProgressBar
                      fundedCents={product.fundedCents}
                      goalCents={product.goalCents}
                    />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
