"use client";

import { useState } from "react";

export default function EmbedSnippet({ snippet }: { snippet: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div>
      <pre className="overflow-x-auto rounded-md bg-warm-950 p-3 text-xs leading-relaxed text-warm-100">
        <code>{snippet}</code>
      </pre>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(snippet);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="mt-2 rounded-md bg-pink-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-pink-700"
      >
        {copied ? "Copied!" : "Copy snippet"}
      </button>
      <span role="status" className="sr-only">
        {copied ? "Snippet copied to clipboard" : ""}
      </span>
    </div>
  );
}
