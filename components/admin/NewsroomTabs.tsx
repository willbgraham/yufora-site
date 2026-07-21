import Link from "next/link";

const tabs = [
  { href: "/admin/news", label: "Review queue" },
  { href: "/admin/news/sources", label: "Sources" },
  { href: "/admin/news/articles", label: "Articles" },
];

/** Sub-navigation across the newsroom sections. `active` is the current href. */
export default function NewsroomTabs({ active }: { active: string }) {
  return (
    <nav aria-label="Newsroom" className="mt-4 flex flex-wrap gap-1 border-b border-warm-200">
      {tabs.map((t) => {
        const isActive = t.href === active;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={isActive ? "page" : undefined}
            className={[
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              isActive
                ? "border-pink-600 text-pink-700"
                : "border-transparent text-warm-600 hover:text-warm-900",
            ].join(" ")}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
