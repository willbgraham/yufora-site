import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Container from "@/components/layout/Container";
import ProgressBar from "@/components/ui/ProgressBar";
import { getPublicShop } from "@/lib/data/products";
import { formatCents } from "@/lib/money";

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
          {products.map((product) => {
            const funded = product.fundedCents >= product.goalCents;
            return (
              <li key={product.id}>
                <Link
                  href={`/s/${charity.slug}/p/${product.id}`}
                  className="block overflow-hidden rounded-xl border border-warm-200 bg-white transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] bg-warm-100">
                    {product.photos[0] ? (
                      <Image
                        src={product.photos[0].url}
                        alt={product.title}
                        fill
                        sizes="(min-width: 1024px) 350px, (min-width: 640px) 45vw, 90vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-warm-500">
                        {charity.name}
                      </div>
                    )}
                    {funded && (
                      <span className="absolute left-2 top-2 rounded-full bg-teal-600 px-2.5 py-0.5 text-xs font-medium text-white">
                        Fully funded
                      </span>
                    )}
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
            );
          })}
        </ul>
      )}
    </Container>
  );
}
