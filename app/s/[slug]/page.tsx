import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Container from "@/components/layout/Container";
import ProductCard from "@/components/shop/ProductCard";
import { getPublicShop } from "@/lib/data/products";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getPublicShop(slug);
  if (!shop) return {};
  return {
    title: `${shop.charity.name} — Wishlist`,
    description: `Fund the things ${shop.charity.name} actually needs — fully, or chip in.`,
  };
}

export default async function ShopPage({ params }: Props) {
  const { slug } = await params;
  const shop = await getPublicShop(slug);
  if (!shop) notFound();

  const { charity, products } = shop;

  return (
    <Container className="py-12">
      <header className="max-w-2xl">
        <h1 className="text-3xl sm:text-4xl">{charity.name}</h1>
        <p className="mt-2 text-warm-700">
          These are the things we actually need. Fund one outright, or chip in
          toward it — every dollar goes directly to us.
        </p>
      </header>

      {products.length === 0 ? (
        <p className="mt-12 rounded-xl border border-dashed border-warm-300 p-10 text-center text-warm-600">
          Nothing here yet — check back soon.
        </p>
      ) : (
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard
                product={product}
                href={`/s/${charity.slug}/p/${product.id}`}
                charityName={charity.name}
              />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
