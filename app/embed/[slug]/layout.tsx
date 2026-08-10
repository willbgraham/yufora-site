import type { Metadata } from "next";
import EmbedResizer from "@/components/embed/EmbedResizer";

export const metadata: Metadata = {
  // Embed pages are fragments of other people's sites — never index them.
  robots: { index: false, follow: false },
};

/**
 * Layout for pages served inside the charity's iframe: no chrome at all,
 * just the content and the height reporter.
 */
export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white p-1">
      {children}
      <EmbedResizer />
    </div>
  );
}
