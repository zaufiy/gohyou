// Ilustrasi gohyong (SVG). `tint` = warna isian yang terlihat di ujung potongan.
type RollProps = { x: number; y: number; tint: string };
const H = 36, L = 142;

function Roll({ x, y, tint }: RollProps) {
  const body = `M ${x + 18} ${y} H ${x + L} V ${y + H} H ${x + 18} A 18 18 0 0 1 ${x + 18} ${y} Z`;
  return (
    <g>
      <path d={body} fill="url(#gh-body)" />
      <rect x={x + 14} y={y + 5} width={108} height={5} rx={2.5} fill="#FFE0A0" opacity={0.75} />
      <rect x={x + 10} y={y + 27} width={120} height={5} rx={2.5} fill="#A85F14" opacity={0.3} />
      {[34, 62, 90, 118].map((d) => (
        <path key={d} d={`M ${x + d} ${y + 3} Q ${x + d - 5} ${y + 18} ${x + d} ${y + 33}`} stroke="#A85F14" strokeWidth={2.2} fill="none" opacity={0.45} strokeLinecap="round" />
      ))}
      <ellipse cx={x + L} cy={y + H / 2} rx={9} ry={H / 2} fill="#F8E3BC" />
      <ellipse cx={x + L} cy={y + H / 2} rx={5.5} ry={12} fill={tint} />
      <circle cx={x + L - 1} cy={y + H / 2 - 3} r={1.4} fill="#fff" opacity={0.5} />
    </g>
  );
}

export const TINTS = ["#EFC08F", "#F08A6B", "#8FBF5A", "#E9B44C"];

export function GohyongArt({ tint = TINTS[0], className }: { tint?: string; className?: string }) {
  return (
    <svg viewBox="0 0 300 190" className={className} role="img" aria-label="Ilustrasi gohyong">
      <defs>
        <linearGradient id="gh-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F4B548" />
          <stop offset="0.55" stopColor="#E39A2E" />
          <stop offset="1" stopColor="#C97F1E" />
        </linearGradient>
      </defs>
      <ellipse cx={140} cy={168} rx={105} ry={9} fill="#000" opacity={0.28} />
      <g transform="rotate(-9 140 95)">
        <Roll x={34} y={34} tint={tint} />
        <Roll x={58} y={74} tint={tint} />
        <Roll x={40} y={114} tint={tint} />
      </g>
      <ellipse cx={246} cy={150} rx={38} ry={12} fill="#F6E9D2" />
      <ellipse cx={246} cy={148} rx={28} ry={8} fill="#D9453B" />
      <ellipse cx={238} cy={146} rx={9} ry={2.5} fill="#fff" opacity={0.35} />
    </svg>
  );
}
