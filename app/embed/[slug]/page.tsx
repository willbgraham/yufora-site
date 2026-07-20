import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/shop/ProductCard";
import { getPublicShop } from "@/lib/data/products";

type Props = { params: Promise<{ slug: string }> };

/** The shop grid as it appears inside the charity's own website. */
export default async function EmbedShopPage({ params }: Props) {
  const { slug } = await params;
  const shop = await getPublicShop(slug);
  if (!shop) notFound();

  const { charity, products } = shop;

  return (
    <div>
      {products.length === 0 ? (
        <p className="rounded-xl border border-dashed border-warm-300 p-10 text-center text-warm-600">
          Nothing here yet — check back soon.
        </p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard
                product={product}
                href={`/embed/${charity.slug}/p/${product.id}`}
                charityName={charity.name}
              />
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-right">
        <Link
          href="/"
          target="_blank"
          rel="noopener"
          className="text-xs text-warm-400 hover:text-pink-700"
        >
          Powered by Yufora
        </Link>
      </p>
    </div>
  );
}
