import { ButtonLink } from "@/components/ui/Button";
import { CTA_LABEL, CTA_HREF } from "@/lib/site";

export default function CTABand({
  title,
  body,
  label = CTA_LABEL,
  href = CTA_HREF,
}: {
  title: string;
  body?: string;
  label?: string;
  href?: string;
}) {
  return (
    <div className="rounded-xl bg-pink-50 px-6 py-10 text-center sm:px-12 sm:py-14">
      <h2 className="text-2xl sm:text-3xl">{title}</h2>
      {body && (
        <p className="mx-auto mt-3 max-w-xl text-warm-700">{body}</p>
      )}
      <ButtonLink href={href} size="lg" className="mt-6">
        {label}
      </ButtonLink>
    </div>
  );
}
