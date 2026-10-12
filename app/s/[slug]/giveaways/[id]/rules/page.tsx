import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Container from "@/components/layout/Container";
import OfficialRules from "@/components/giveaways/OfficialRules";
import PrintButton from "@/components/giveaways/PrintButton";
import { getPublicRules } from "@/lib/data/giveaways";
import { longDate } from "@/lib/giveaways/format";

type Props = { params: Promise<{ slug: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  const rules = await getPublicRules(slug, id);
  return rules ? { title: rules.document.title } : {};
}

/** The Rules exactly as frozen at go-live — never re-rendered from settings. */
export default async function RulesPage({ params }: Props) {
  const { slug, id } = await params;
  const rules = await getPublicRules(slug, id);
  if (!rules) notFound();

  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/s/${slug}/giveaways/${id}`}
          className="text-sm text-warm-600 hover:text-pink-700"
        >
          ← Back to the giveaway
        </Link>
        <PrintButton />
      </div>
      <div className="mt-6">
        <OfficialRules
          document={rules.document}
          footer={
            <>
              Rules template {rules.document.version}, locked{" "}
              {longDate(rules.liveAt, rules.timezone)}. Fingerprint (SHA-256):{" "}
              <span className="break-all font-mono text-xs">{rules.hash}</span>
            </>
          }
        />
      </div>
    </Container>
  );
}
