type Align = "left" | "center";
type Tone = "dark" | "light";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  tone = "dark",
  className = "",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: Align;
  tone?: Tone;
  className?: string;
}) {
  const alignClass = align === "center" ? "text-center items-center mx-auto" : "text-left items-start";
  const titleColor = tone === "dark" ? "text-navy-deep" : "text-ivory";
  const descColor = tone === "dark" ? "text-charcoal/70" : "text-ivory/75";

  return (
    <div className={`flex max-w-2xl flex-col gap-4 ${alignClass} ${className}`}>
      {eyebrow ? (
        <div className="flex items-center gap-3">
          <span className="h-px w-8 bg-gold" aria-hidden />
          <span className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            {eyebrow}
          </span>
        </div>
      ) : null}
      <h2 className={`font-serif text-3xl leading-tight sm:text-4xl ${titleColor}`}>
        {title}
      </h2>
      {description ? (
        <p className={`font-sans text-base leading-relaxed sm:text-lg ${descColor}`}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
