import Link from "next/link";

/**
 * Public shop chrome: deliberately minimal. This is the charity's page,
 * not Yufora's — just a quiet "powered by" underneath.
 */
export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <main className="flex-1">{children}</main>
      <footer className="border-t border-warm-100 py-6 text-center">
        <Link
          href="/"
          className="text-sm text-warm-500 hover:text-pink-700"
        >
          Powered by <span className="font-medium">Yufora</span>
        </Link>
      </footer>
    </div>
  );
}
