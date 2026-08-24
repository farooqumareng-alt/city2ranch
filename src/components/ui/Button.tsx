import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "gold" | "navy" | "outline-light" | "outline-dark";
type Size = "md" | "lg";

const variantClasses: Record<Variant, string> = {
  // Gold-on-navy: the primary CTA look, used on dark/navy backgrounds.
  gold: "bg-gold text-navy-deep hover:bg-gold-light",
  // Navy-on-ivory: primary CTA on light backgrounds.
  navy: "bg-navy text-ivory hover:bg-navy-deep",
  // Outline for use on dark backgrounds (light text/border).
  "outline-light":
    "border border-ivory/40 text-ivory hover:border-gold hover:text-gold",
  // Outline for use on light backgrounds (navy text/border).
  "outline-dark":
    "border border-navy/30 text-navy hover:border-gold hover:text-navy",
};

const sizeClasses: Record<Size, string> = {
  md: "px-6 py-2.5 text-sm",
  lg: "px-8 py-3.5 text-base",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-sm font-sans font-medium tracking-wide transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps & {
  href: string;
  target?: string;
  rel?: string;
};

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button(props: ButtonProps) {
  const { variant = "gold", size = "md", className = "", children } = props;
  const classes = `${base} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  if ("href" in props && props.href) {
    const { href, target, rel } = props;
    return (
      <Link href={href} target={target} rel={rel} className={classes}>
        {children}
      </Link>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- stripped from `rest` before spreading onto <button>
  const { variant: _variant, size: _size, className: _className, children: _children, ...rest } =
    props as ButtonAsButton;
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
