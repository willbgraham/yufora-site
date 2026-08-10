import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Container from "@/components/layout/Container";
import ProductView from "@/components/shop/ProductView";
import { getPublicProduct } from "@/lib/data/products";
import { formatCents } from "@/lib/money";
import { isStripeConfigured } from "@/lib/stripe";

type Props = {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ donated?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  const data = await getPublicProduct(slug, id);
  if (!data || data.paused) return {};
  return {
    title: `${data.product.title} — ${data.charity.name}`,
    description: `Help fund this for ${data.charity.name}: ${formatCents(data.product.goalCents)}.`,
  };
}

export default async function PublicProductPage({ params, searchParams }: Props) {
  const { slug, id } = await params;
  const { donated } = await searchParams;
  const data = await getPublicProduct(slug, id);
  if (!data) notFound();

  // A lapsed shop pauses rather than 404s — same contract as its index.
  if (data.paused) {
    return (
      <Container className="py-12">
        <p className="rounded-xl border border-dashed border-warm-300 p-10 text-center text-warm-600">
          This shop is temporarily unavailable — check back soon.
        </p>
      </Container>
    );
  }

  const { charity, product } = data;
  const donationsOpen =
    isStripeConfigured() &&
    Boolean(charity.stripeAccountId) &&
    charity.stripeChargesEnabled;

  return (
    <Container className="py-12">
      <ProductView
        charity={charity}
        product={product}
        donationsOpen={donationsOpen}
        donated={donated === "1"}
        backHref={`/s/${charity.slug}`}
      />
    </Container>
  );
}
