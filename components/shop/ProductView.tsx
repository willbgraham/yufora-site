import Image from "next/image";
import Link from "next/link";
import ProgressBar from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import FundButtons from "@/components/shop/FundButtons";
import type { ProductWithPhotos } from "@/lib/data/products";
import type { charities } from "@/lib/db/schema";
import { formatCents } from "@/lib/money";
import { parseVideoUrl } from "@/lib/video";

type Charity = typeof charities.$inferSelect;

/**
 * Full product view — gallery, video, progress, fund buttons.
 * Shared by the hosted page (/s/...) and the embed (/embed/...); only the
 * back link differs.
 */
export default function ProductView({
  charity,
  product,
  donationsOpen,
  donated,
  backHref,
  context = "hosted",
}: {
  charity: Charity;
  product: ProductWithPhotos;
  donationsOpen: boolean;
  donated: boolean;
  backHref: string;
  context?: "hosted" | "embed";
}) {
  const video = product.videoUrl ? parseVideoUrl(product.videoUrl) : null;
  const funded = product.fundedCents >= product.goalCents;
  const remaining = Math.max(0, product.goalCents - product.fundedCents);

  return (
    <>
      <Link
        href={backHref}
        className="text-sm text-warm-600 hover:text-pink-700"
      >
        ← {charity.name}
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[3fr_2fr]">
        <div>
          {product.photos.length > 0 ? (
            <div className="space-y-3">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-warm-100">
                <Image
                  src={product.photos[0].url}
                  alt={product.title}
                  fill
                  priority
                  sizes="(min-width: 1024px) 60vw, 100vw"
                  className="object-cover"
                />
              </div>
              {product.photos.length > 1 && (
                <div className="grid grid-cols-4 gap-3">
                  {product.photos.slice(1).map((photo, i) => (
                    <div
                      key={photo.id}
                      className="relative aspect-[4/3] overflow-hidden rounded-md bg-warm-100"
                    >
                      <Image
                        src={photo.url}
                        alt={`${product.title} — photo ${i + 2}`}
                        fill
                        sizes="(min-width: 1024px) 15vw, 25vw"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-warm-100 text-warm-500">
              {charity.name}
            </div>
          )}

          {video && (
            <div className="mt-6 overflow-hidden rounded-xl">
              <iframe
                src={video.embedUrl}
                title={`Video: ${product.title}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="aspect-video w-full border-0"
              />
            </div>
          )}
        </div>

        <div>
          <h1 className="text-3xl">{product.title}</h1>
          <p className="mt-2 text-2xl font-medium text-warm-900">
            {formatCents(product.goalCents)}
          </p>

          <div className="mt-6">
            <ProgressBar
              fundedCents={product.fundedCents}
              goalCents={product.goalCents}
            />
          </div>

          {donated && (
            <div
              role="status"
              className="mt-6 rounded-lg border border-teal-100 bg-teal-50 p-4 text-teal-900"
            >
              <p className="font-medium">Thank you!</p>
              <p className="mt-1 text-sm">
                Your donation is processing — the progress bar updates in a
                moment, and your receipt is on its way by email.
              </p>
            </div>
          )}

          <div className="mt-6 space-y-3">
            {funded ? (
              <p className="rounded-lg bg-teal-50 p-4 text-teal-900">
                This item is fully funded. Thank you!
              </p>
            ) : donationsOpen ? (
              <FundButtons
                productId={product.id}
                remainingCents={remaining}
                context={context}
              />
            ) : (
              <>
                <Button size="lg" className="w-full" disabled>
                  Fund this — {formatCents(remaining)}
                </Button>
                <Button size="lg" variant="secondary" className="w-full" disabled>
                  Chip in
                </Button>
                <p className="text-center text-sm text-warm-500">
                  Donations open soon.
                </p>
              </>
            )}
          </div>

          {product.description && (
            <div className="mt-8 whitespace-pre-line text-warm-700">
              {product.description}
            </div>
          )}

          <p className="mt-8 border-t border-warm-100 pt-4 text-sm text-warm-600">
            Every dollar goes directly to {charity.name} — Yufora never holds
            the money.
          </p>
        </div>
      </div>
    </>
  );
}
