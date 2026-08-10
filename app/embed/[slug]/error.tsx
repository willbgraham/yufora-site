"use client";

/**
 * The embed renders inside the CHARITY's own website. Whatever goes wrong
 * on our side — a schema/code skew, a database blip — their visitors must
 * never see a stack trace or a raw 500. Degrade to the same quiet
 * "unavailable" state the pause path uses.
 */
export default function EmbedError({ error }: { error: Error }) {
  console.error("[embed] render failed", error);
  return (
    <p className="rounded-xl border border-dashed border-warm-300 p-10 text-center text-warm-600">
      This is temporarily unavailable — check back soon.
    </p>
  );
}
