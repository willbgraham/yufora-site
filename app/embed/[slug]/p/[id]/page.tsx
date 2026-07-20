import { notFound } from "next/navigation";
import ProductView from "@/components/shop/ProductView";
import { getPublicProduct } from "@/lib/data/products";
import { isStripeConfigured } from "@/lib/stripe";

type Props = {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ donated?: string }>;
};

/** Product detail inside the iframe — same view, embed-local back link. */
export default async function EmbedProductPage({ params, searchParams }: Props) {
  const { slug, id } = await params;
  const { donated } = await searchParams;
  const data = await getPublicProduct(slug, id);
  if (!data) notFound();

  const { charity, product } = data;
  const donationsOpen =
    isStripeConfigured() &&
    Boolean(charity.stripeAccountId) &&
    charity.stripeChargesEnabled;

  return (
    <ProductView
      charity={charity}
      product={product}
      donationsOpen={donationsOpen}
      donated={donated === "1"}
      backHref={`/embed/${charity.slug}`}
      context="embed"
    />
  );
}
