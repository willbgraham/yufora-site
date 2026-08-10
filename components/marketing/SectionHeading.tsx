import Eyebrow from "./Eyebrow";

type Props = {
  id?: string;
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  align?: "left" | "center";
  tone?: "default" | "dark";
  /** Use "h1" when this is the page's primary heading. Defaults to "h2". */
  as?: "h1" | "h2";
};

export default function SectionHeading({
  id,
  eyebrow,
  title,
  lead,
  align = "left",
  tone = "default",
  as: Heading = "h2",
}: Props) {
  return (
    <div
      className={[
        "max-w-2xl",
        align === "center" ? "mx-auto text-center" : "",
      ].join(" ")}
    >
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <Heading
        id={id}
        className={[
          "text-3xl sm:text-4xl",
          tone === "dark" ? "text-white" : "",
        ].join(" ")}
      >
        {title}
      </Heading>
      {lead && (
        <p
          className={[
            "mt-4 text-lg",
            tone === "dark" ? "text-warm-300" : "text-warm-700",
          ].join(" ")}
        >
          {lead}
        </p>
      )}
    </div>
  );
}
