"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md px-3 py-2 text-sm font-medium text-pink-700 ring-1 ring-warm-300 hover:bg-warm-50 print:hidden"
    >
      Print or save as PDF
    </button>
  );
}
