import Image from "next/image";
import ProductCard from "@/components/shop/ProductCard";
import type { ProductWithPhotos } from "@/lib/data/products";

/**
 * The real shop cards rendered with example data — same principle as
 * DonorWallDemo: marketing shows the actual product, so it can't drift.
 * Example org is the MELBA Foundation (music education), used with
 * their blessing; the caption keeps it honest.
 *
 * The grid is intentionally inert (pointer-events-none): it's an
 * illustration, not a working shop — cards would otherwise navigate.
 */
const built = new Date("2026-08-01T12:00:00Z");

const demoProduct = (
  id: string,
  title: string,
  goalCents: number,
  fundedCents: number,
  photo: string,
): ProductWithPhotos => ({
  id,
  charityId: "demo",
  title,
  description: "",
  goalCents,
  fundedCents,
  videoUrl: null,
  status: "published",
  sortOrder: 0,
  createdAt: built,
  updatedAt: built,
  photos: [{ id: `${id}-photo`, productId: id, url: photo, sortOrder: 0 }],
});

const DEMO_ITEMS: ProductWithPhotos[] = [
  demoProduct("kb", "Digital keyboard", 60_000, 42_500, "/demo-shop-keyboard.webp"),
  demoProduct("dr", "5-piece drum kit", 85_000, 85_000, "/demo-shop-drums.webp"),
  demoProduct("tp", "Student trumpet", 37_500, 9_000, "/demo-shop-trumpet.webp"),
  demoProduct("gt", "Acoustic guitar", 45_000, 21_000, "/demo-shop-guitar.webp"),
];

export default function ShopDemo({ className }: { className?: string }) {
  return (
    <div
      className={[
        "rounded-xl border border-warm-200 bg-warm-50 p-5 sm:p-6",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-center gap-3 border-b border-warm-200 pb-4">
        <Image
          src="/demo-melba-logo.png"
          alt="MELBA Foundation"
          width={2086}
          height={826}
          className="h-8 w-auto"
        />
        <p className="text-sm text-warm-600">
          Instruments for our students — fund one, or chip in.
        </p>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none mt-5 grid select-none gap-4 sm:grid-cols-2"
      >
        {DEMO_ITEMS.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            href="#"
            charityName="MELBA Foundation"
          />
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-warm-500">
        an example shop — yours shows your real items, on your website
      </p>
    </div>
  );
}
