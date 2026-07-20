import Image from "next/image";
import Link from "next/link";
import ProgressBar from "@/components/ui/ProgressBar";
import type { ProductWithPhotos } from "@/lib/data/products";
import { formatCents } from "@/lib/money";

/** One wishlist item card — shared by the hosted shop and the embed. */
export default function ProductCard({
  product,
  href,
  charityName,
}: {
  product: ProductWithPhotos;
  href: string;
  charityName: string;
}) {
  const funded = product.fundedCents >= product.goalCents;

  return (
    <Link
      href={href}
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
            {charityName}
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
          <h2 className="truncate text-lg text-warm-900">{product.title}</h2>
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
  );
}
