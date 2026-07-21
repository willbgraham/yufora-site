import { sanitizeExcerptHtml } from "@/lib/news/sanitize";

/**
 * Server component: re-sanitizes stored excerpt HTML and renders it. Content
 * is sanitized at ingest too — this is the render-side half of the
 * "sanitize at both ends" rule. dangerouslySetInnerHTML is safe here precisely
 * because the string is DOMPurify output.
 */
export default function SanitizedExcerpt({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const clean = sanitizeExcerptHtml(html);
  if (!clean) return null;
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
