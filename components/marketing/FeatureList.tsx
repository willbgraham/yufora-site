type Item = { title: string; body: string };

function Check() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mt-0.5 size-6 flex-none text-teal-700"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function FeatureList({ items }: { items: Item[] }) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item.title} className="flex gap-3">
          <Check />
          <div>
            <p className="font-medium text-warm-900">{item.title}</p>
            <p className="mt-1 text-warm-700">{item.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
