type QA = { q: string; a: React.ReactNode };

export default function FAQ({ items }: { items: QA[] }) {
  return (
    <div className="mx-auto max-w-3xl divide-y divide-warm-200 border-y border-warm-200">
      {items.map((item) => (
        <details key={item.q} className="group py-2">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 text-lg font-medium text-warm-900 marker:content-none">
            {item.q}
            <svg
              viewBox="0 0 24 24"
              className="size-5 flex-none text-warm-500 transition-transform group-open:rotate-45"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </summary>
          <div className="pb-4 pr-8 text-warm-700">{item.a}</div>
        </details>
      ))}
    </div>
  );
}
