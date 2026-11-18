import clsx from "clsx";
const tones = { direct: "bg-direct text-white", preorder: "bg-preorder text-white", ok: "bg-jade text-white", wait: "bg-crust text-paper", neutral: "bg-steam text-soy" };
export function Badge({ tone = "neutral", children }: { tone?: keyof typeof tones; children: React.ReactNode }) {
  return <span className={clsx("rounded-pill px-3 py-1 text-xs font-semibold", tones[tone])}>{children}</span>;
}
