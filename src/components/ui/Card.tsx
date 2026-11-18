import clsx from "clsx";
export function Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={clsx("rounded-card border border-steam bg-surface p-4", className)} />;
}
