import "server-only";
import sanitizeHtml from "sanitize-html";

/**
 * Sanitizes untrusted feed HTML for a news excerpt. Text-formatting only —
 * no images, iframes, or scripts. Links are forced to safe schemes and
 * hardened (new tab, noopener/nofollow). Run at BOTH ingest and render.
 *
 * Uses sanitize-html (htmlparser2, no jsdom) — jsdom-based sanitizers hit an
 * ESM/CJS incompatibility in the Vercel serverless runtime.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "em",
    "b",
    "i",
    "u",
    "a",
    "blockquote",
    "q",
    "cite",
    "ul",
    "ol",
    "li",
    "h3",
    "h4",
    "code",
  ],
  // target/rel must be allow-listed too, or transformTags' additions get
  // stripped after they're applied.
  allowedAttributes: { a: ["href", "title", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto"],
  // Drop unknown schemes entirely (no javascript:/data:).
  disallowedTagsMode: "discard",
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      target: "_blank",
      rel: "noopener noreferrer nofollow ugc",
    }),
  },
};

const MAX_EXCERPT_CHARS = 600;

export function sanitizeExcerptHtml(dirty: string | null | undefined): string {
  if (!dirty) return "";
  const clean = sanitizeHtml(dirty, OPTIONS);
  if (clean.length <= MAX_EXCERPT_CHARS) return clean;
  // Over the cap → plain-text truncation, escaped, to avoid broken markup.
  const text = clean.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return escapeText(text.slice(0, MAX_EXCERPT_CHARS).trim()) + "…";
}

function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
