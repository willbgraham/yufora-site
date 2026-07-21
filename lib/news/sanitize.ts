import "server-only";
import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitizes untrusted feed HTML for a news excerpt. Text-formatting only —
 * no images, no iframes, no scripts. Links are forced to safe protocols and
 * hardened (new tab, noopener/nofollow). Run at BOTH ingest and render.
 */
const ALLOWED_TAGS = [
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
];
const ALLOWED_ATTR = ["href", "title"];

// Force external-link hardening on every anchor. Registered once; setAttribute
// is idempotent so a duplicate registration under HMR is harmless.
let hookAdded = false;
function ensureHook() {
  if (hookAdded) return;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if ((node as Element).tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer nofollow ugc");
    }
  });
  hookAdded = true;
}

const MAX_EXCERPT_CHARS = 600;

export function sanitizeExcerptHtml(dirty: string | null | undefined): string {
  if (!dirty) return "";
  ensureHook();
  const clean = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
    ADD_ATTR: ["target", "rel"],
  });
  // Hard length cap on the rendered text — keeps excerpts short (legal
  // substitution guardrail) without cutting inside a tag. If we exceed the
  // cap, fall back to a plain-text truncation to avoid broken markup.
  if (clean.length <= MAX_EXCERPT_CHARS) return clean;
  const text = clean.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return escapeText(text.slice(0, MAX_EXCERPT_CHARS).trim()) + "…";
}

function escapeText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
