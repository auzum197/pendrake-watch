// Area line chart for the dashboard's "Balance over time" card. Hand-drawn SVG to
// match the sync visualizations already in the project and skip a chart dep.

type Point = { label: string; value: number };

const DATA: Point[] = [
  { label: "Jun 10", value: 11.7 },
  { label: "Jun 11", value: 12.7 },
  { label: "Jun 12", value: 11.9 },
  { label: "Jun 13", value: 13.5 },
  { label: "Jun 14", value: 13.7 },
  { label: "Jun 15", value: 14.8 },
  { label: "Jun 16", value: 15.96 },
];

const W = 900;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 44 };
const Y_TICKS = [10.74, 12.74, 14.74, 16.96];

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function BalanceChart() {
  const min = Y_TICKS[0];
  const max = Y_TICKS[Y_TICKS.length - 1];
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / (DATA.length - 1)) * plotW;
  const y = (v: number) =>
    PAD.top + plotH - ((v - min) / (max - min)) * plotH;

  const pts = DATA.map((d, i) => ({ x: x(i), y: y(d.value) }));
  const line = smoothPath(pts);
  const area = `${line} L ${pts[pts.length - 1].x} ${PAD.top + plotH} L ${pts[0].x} ${PAD.top + plotH} Z`;
  const last = pts[pts.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label="Balance over time"
    >
      <defs>
        <linearGradient id="balance-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {Y_TICKS.map((t) => (
        <g key={t}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(t)}
            y2={y(t)}
            stroke="currentColor"
            strokeOpacity="0.12"
            strokeDasharray="4 6"
          />
          <text
            x={PAD.left - 10}
            y={y(t) + 4}
            textAnchor="end"
            className="text-[11px]"
            fill="currentColor"
            fillOpacity="0.45"
          >
            {t.toFixed(2)}
          </text>
        </g>
      ))}

      {DATA.map((d, i) => (
        <text
          key={d.label}
          x={x(i)}
          y={H - 8}
          textAnchor="middle"
          fill="currentColor"
          fillOpacity="0.45"
          className="text-[11px]"
        >
          {d.label}
        </text>
      ))}

      <path d={area} fill="url(#balance-fill)" />
      <path
        d={line}
        fill="none"
        stroke="var(--color-brand)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx={last.x} cy={last.y} r="5" fill="var(--color-brand)" />
    </svg>
  );
}
