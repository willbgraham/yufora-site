import Link from "next/link";
import { notFound } from "next/navigation";
import { RecentWall, TopWall } from "@/components/shop/DonorWall";
import { getRecentWall, getTopWall } from "@/lib/data/wall";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mode?: string }>;
};

/** The donor wall as embedded on the charity's own site. */
export default async function EmbedWallPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { mode } = await searchParams;

  if (mode === "top") {
    const supporters = await getTopWall(slug);
    if (!supporters) notFound();
    return <Wrapper title="Top supporters"><TopWall supporters={supporters} /></Wrapper>;
  }

  const entries = await getRecentWall(slug);
  if (!entries) notFound();
  return <Wrapper title="Recent supporters"><RecentWall entries={entries} /></Wrapper>;
}

function Wrapper({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-3 font-display text-xl text-warm-900">{title}</h2>
      {children}
      <p className="mt-3 text-right">
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
