export default function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl space-y-4 text-warm-700 [&_a]:text-pink-700 [&_a:hover]:underline [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:text-warm-900 [&_strong]:text-warm-900">
      {children}
    </div>
  );
}
