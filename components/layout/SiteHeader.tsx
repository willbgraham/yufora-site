"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import Container from "./Container";
import Logo from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";
import {
  navGroups,
  CTA_LABEL,
  CTA_HREF,
  type NavItem,
} from "@/lib/site";

/** Bare path without hash, for active-state matching. */
const basePath = (href: string) => href.split("#")[0];

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function NavDropdown({
  label,
  items,
  pathname,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const active = items.some((i) => basePath(i.href) === pathname);

  // Close on Escape or a click outside. Subscriptions only — the setState
  // lives in the callbacks, not the effect body.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={panelId}
        // Open-only on click so it never fights the hover-open below (a mouse
        // user hovers → open, then a click would otherwise toggle it shut).
        // Keyboard: Enter opens, Escape closes. Mouse: hover-leave / outside
        // click / picking an item all close it.
        onClick={() => setOpen(true)}
        className={[
          "inline-flex items-center gap-1 rounded-md px-3 py-2 text-base transition-colors",
          active
            ? "text-pink-700"
            : "text-warm-700 hover:bg-warm-50 hover:text-warm-900",
        ].join(" ")}
      >
        {label}
        <Chevron open={open} />
      </button>

      {open && (
        // pt-2 bridges the gap so the panel doesn't close mid-hover.
        <div className="absolute left-0 top-full z-50 pt-2">
          <div
            id={panelId}
            className="w-72 rounded-xl border border-warm-200 bg-white p-2 shadow-lg"
          >
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 hover:bg-warm-50"
              >
                <span className="block font-medium text-warm-900">
                  {item.label}
                </span>
                {item.desc && (
                  <span className="mt-0.5 block text-sm text-warm-600">
                    {item.desc}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-warm-200 bg-white/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {navGroups.map((entry) =>
            "items" in entry ? (
              <NavDropdown
                key={entry.label}
                label={entry.label}
                items={entry.items}
                pathname={pathname}
              />
            ) : (
              <Link
                key={entry.href}
                href={entry.href}
                aria-current={pathname === entry.href ? "page" : undefined}
                className={[
                  "rounded-md px-3 py-2 text-base transition-colors",
                  pathname === entry.href
                    ? "text-pink-700"
                    : "text-warm-700 hover:bg-warm-50 hover:text-warm-900",
                ].join(" ")}
              >
                {entry.label}
              </Link>
            ),
          )}
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
            {navGroups.map((entry) =>
              "items" in entry ? (
                <div key={entry.label} className="py-1">
                  <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-warm-500">
                    {entry.label}
                  </p>
                  {entry.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={close}
                      className="block rounded-md px-3 py-2.5 text-lg text-warm-800 hover:bg-warm-50"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  key={entry.href}
                  href={entry.href}
                  onClick={close}
                  className="rounded-md px-3 py-3 text-lg text-warm-800 hover:bg-warm-50"
                >
                  {entry.label}
                </Link>
              ),
            )}
            <ButtonLink href={CTA_HREF} size="lg" className="mt-2" onClick={close}>
              {CTA_LABEL}
            </ButtonLink>
          </Container>
        </div>
      )}
    </header>
  );
}
