export default function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-pink-700">
      {children}
    </p>
  );
}
