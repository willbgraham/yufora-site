type Step = { title: string; body: string };

export default function Steps({ steps }: { steps: Step[] }) {
  return (
    <ol className="grid gap-8 md:grid-cols-3">
      {steps.map((step, i) => (
        <li key={step.title} className="relative">
          <span
            aria-hidden="true"
            className="font-display text-5xl text-pink-200"
          >
            {i + 1}
          </span>
          <h3 className="mt-2 text-xl">{step.title}</h3>
          <p className="mt-2 text-warm-700">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}
