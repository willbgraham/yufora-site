"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Container from "./Container";
import Logo from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { navLinks, CTA_LABEL, CTA_HREF } from "@/lib/site";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-warm-200 bg-white/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "rounded-md px-3 py-2 text-base transition-colors",
                  active
                    ? "text-pink-700"
                    : "text-warm-700 hover:bg-warm-50 hover:text-warm-900",
                ].join(" ")}
              >
                {link.label}
              </Link>
            );
          })}
          <ButtonLink href={CTA_HREF} className="ml-2">
            {CTA_LABEL}
          </ButtonLink>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-md text-warm-800 hover:bg-warm-50 md:hidden"
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            {open ? (
              <>
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </>
            ) : (
              <>
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </>
            )}
          </svg>
        </button>
      </Container>

      {open && (
        <div id="mobile-nav" className="border-t border-warm-200 md:hidden">
          <Container className="flex flex-col gap-1 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className="rounded-md px-3 py-3 text-lg text-warm-800 hover:bg-warm-50"
              >
                {link.label}
              </Link>
            ))}
            <ButtonLink href={CTA_HREF} size="lg" className="mt-2" onClick={close}>
              {CTA_LABEL}
            </ButtonLink>
          </Container>
        </div>
      )}
    </header>
  );
}
