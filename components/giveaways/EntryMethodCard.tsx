/**
 * Both entry methods render through this one card — same size, same
 * heading level, same button treatment — so equal prominence comes from
 * the component, not from discipline.
 */
export default function EntryMethodCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-warm-200 bg-white p-5">
      <h2 className="font-sans text-lg font-semibold text-warm-900">{title}</h2>
      <div className="mt-2 flex flex-1 flex-col gap-3 text-warm-700">{children}</div>
    </section>
  );
}
