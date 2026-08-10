import ReactMarkdown from "react-markdown";

/**
 * Locked-down Markdown renderer. react-markdown is safe by default (no raw
 * HTML unless rehype-raw is added — it isn't), so scripts in the source never
 * execute. On top of that we allow only a curated element set, force links to
 * safe protocols with rel/target hardening, and open external links in a new
 * tab. Used for staff-authored article bodies and (later) sanitized excerpts.
 */
const ALLOWED = [
  "p",
  "br",
  "strong",
  "em",
  "a",
  "ul",
  "ol",
  "li",
  "blockquote",
  "h2",
  "h3",
  "h4",
  "code",
  "pre",
  "hr",
];

export default function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-4 leading-relaxed text-warm-700 [&_a]:text-pink-700 [&_a:hover]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-pink-200 [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:rounded [&_code]:bg-warm-100 [&_code]:px-1 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-warm-900 [&_h3]:mt-6 [&_h3]:font-display [&_h3]:text-xl [&_h3]:text-warm-900 [&_li]:ml-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-warm-950 [&_pre]:p-4 [&_pre]:text-warm-100 [&_strong]:text-warm-900 [&_ul]:list-disc [&_ul]:pl-6">
      <ReactMarkdown
        allowedElements={ALLOWED}
        unwrapDisallowed
        urlTransform={(url) => {
          // Only http(s) and mailto survive; javascript:/data: are dropped.
          try {
            const u = new URL(url, "https://yufora.com");
            return ["https:", "http:", "mailto:"].includes(u.protocol)
              ? url
              : "";
          } catch {
            return "";
          }
        }}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow">
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
