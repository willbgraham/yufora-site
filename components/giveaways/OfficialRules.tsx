import type { RulesDocument } from "@/lib/giveaways/types";

/** Renders a frozen (or draft-preview) Rules document. Print-friendly. */
export default function OfficialRules({
  document: doc,
  footer,
}: {
  document: RulesDocument;
  footer?: React.ReactNode;
}) {
  return (
    <article className="text-warm-800">
      <h1 className="text-3xl leading-tight text-warm-900 sm:text-4xl">{doc.title}</h1>
      <div className="mt-6 space-y-2 rounded-lg border border-warm-300 bg-warm-50 p-5 print:border-black print:bg-white">
        {doc.headline.map((line) => (
          <p key={line} className="font-semibold uppercase leading-snug tracking-wide text-warm-900">
            {line}
          </p>
        ))}
      </div>
      {doc.sections.map((s) => (
        <section key={s.id} id={s.id} className="mt-8 break-inside-avoid-page">
          <h2 className="font-sans text-lg font-semibold text-warm-900">{s.heading}</h2>
          {s.paragraphs.map((p, i) => (
            <p key={i} className="mt-2 leading-relaxed [overflow-wrap:anywhere]">
              {p}
            </p>
          ))}
        </section>
      ))}
      {footer && <footer className="mt-10 border-t border-warm-200 pt-4 text-sm text-warm-600">{footer}</footer>}
    </article>
  );
}
