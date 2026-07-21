import Link from "next/link";
import Container from "./Container";
import { footerLinks, siteConfig } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="border-t border-warm-200 bg-warm-50">
      <Container className="py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <p className="font-display text-xl text-warm-900">Yufora</p>
            <p className="mt-2 text-sm text-warm-600">
              Fundraising tools that run on your own website.
            </p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-warm-700 hover:text-pink-700"
              >
                {link.label}
              </Link>
            ))}
            <Link href="/start" className="text-warm-700 hover:text-pink-700">
              Get started
            </Link>
          </nav>

          <div className="flex flex-col gap-2 text-sm">
            <a
              href={`mailto:${siteConfig.email}`}
              className="text-warm-700 hover:text-pink-700"
            >
              {siteConfig.email}
            </a>
            <Link href="/privacy" className="text-warm-700 hover:text-pink-700">
              Privacy
            </Link>
            <Link href="/terms" className="text-warm-700 hover:text-pink-700">
              Terms
            </Link>
          </div>
        </div>

        {/* TODO: add registered address when provided. */}
        <p className="mt-10 border-t border-warm-200 pt-6 text-sm text-warm-600">
          © {new Date().getFullYear()} Yufora, LLC. We don&rsquo;t track you —
          this site runs no analytics or advertising cookies.
        </p>
      </Container>
    </footer>
  );
}
