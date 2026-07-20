import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Container from "@/components/layout/Container";
import SignOutButton from "@/components/admin/SignOutButton";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen flex-col bg-warm-50">
      <a
        href="#main"
        className="sr-only rounded-md focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:font-medium focus:text-pink-700 focus:shadow-lg"
      >
        Skip to content
      </a>
      <header className="border-b border-warm-200 bg-white">
        <Container className="flex h-14 items-center justify-between">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2"
            aria-label="Yufora admin home"
          >
            <Image
              src="/yufora-wordmark.png"
              alt="Yufora"
              width={1105}
              height={262}
              className="h-5 w-auto"
            />
            <span className="rounded-sm bg-warm-100 px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide text-warm-600">
              Admin
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-warm-600 sm:block">
              {session.user.email}
            </span>
            <SignOutButton />
          </div>
        </Container>
      </header>
      <main id="main" className="flex-1 py-10">
        <Container>{children}</Container>
      </main>
    </div>
  );
}
