import clsx from "clsx";
type Variant = "primary" | "ghost";
export const buttonClass = (variant: Variant = "primary", full = false) =>
  clsx(
    "inline-flex min-h-11 items-center justify-center rounded-pill px-6 font-display font-semibold transition-colors disabled:opacity-50",
    variant === "primary" ? "bg-crust text-paper hover:bg-[#ffc94d] active:bg-[#d99a1f]" : "border border-steam bg-surface text-soy hover:bg-steam",
    full && "w-full"
  );
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; full?: boolean };
export function Button({ variant = "primary", full, className, ...rest }: Props) {
  return <button {...rest} className={clsx(buttonClass(variant, full), className)} />;
}
