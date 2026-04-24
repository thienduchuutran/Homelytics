'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  LabelList,
} from 'recharts';

export interface ZipChartDatum {
  zip: string;
  count: number;
  medianPrice: number | null;
  medianPricePerSqft: number | null;
}

interface ZipMedianBarChartProps {
  data: ZipChartDatum[];
  overallMedianPrice: number | null;
  title?: string;
  subtitle?: string;
}

// Palette (Tailwind tokens)
const PRICE_COLOR = '#0F766E';       // teal-700  — primary metric
const PPSF_COLOR = '#E11D48';        // rose-600  — secondary metric
const REFERENCE_COLOR = '#475569';   // slate-600 — market median line
const TITLE_COLOR = '#1E293B';       // slate-800
const MUTED_COLOR = '#64748B';       // slate-500
const GRID_COLOR = '#E2E8F0';        // slate-200
const AXIS_COLOR = '#CBD5E1';        // slate-300

// -------- Formatters --------

function formatDollarsAbbrev(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const m = value / 1_000_000;
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (abs >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${Math.round(value)}`;
}

function formatPpsf(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  return `$${Math.round(value)}`;
}

// Recharts LabelList formatter accepts its internal `RenderableText` union
// (string | number | null | undefined | false | ...). We accept the widest
// input (unknown) and coerce numerically.
function coerceNumber(label: unknown): number | null {
  if (label === null || label === undefined || label === false) return null;
  const n = typeof label === 'number' ? label : Number(label);
  return Number.isFinite(n) ? n : null;
}
function labelPriceFormatter(label: unknown): string {
  const n = coerceNumber(label);
  return n === null ? '' : formatDollarsAbbrev(n);
}
function labelPpsfFormatter(label: unknown): string {
  const n = coerceNumber(label);
  return n === null ? '' : formatPpsf(n);
}

function formatFullCurrency(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// -------- Tooltips (one per chart so only the relevant metric shows) --------

interface TooltipPayloadEntry {
  payload: ZipChartDatum;
}
interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

function TooltipShell({ row, children }: { row: ZipChartDatum; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-lg px-3 py-2 text-sm min-w-[180px]">
      <div className="font-semibold text-slate-900">ZIP {row.zip}</div>
      <div className="text-xs text-slate-500 mb-2">
        {row.count.toLocaleString()} listing{row.count === 1 ? '' : 's'}
      </div>
      {children}
    </div>
  );
}

function PriceTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  return (
    <TooltipShell row={row}>
      <div className="flex items-center justify-between gap-6">
        <span className="flex items-center gap-2 text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PRICE_COLOR }} />
          Median price
        </span>
        <span className="font-semibold text-slate-900">{formatFullCurrency(row.medianPrice)}</span>
      </div>
    </TooltipShell>
  );
}

function PpsfTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  return (
    <TooltipShell row={row}>
      <div className="flex items-center justify-between gap-6">
        <span className="flex items-center gap-2 text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PPSF_COLOR }} />
          Median $/sqft
        </span>
        <span className="font-semibold text-slate-900">
          {row.medianPricePerSqft !== null ? `$${Math.round(row.medianPricePerSqft)}/sqft` : 'N/A'}
        </span>
      </div>
    </TooltipShell>
  );
}

// -------- Market median reference-line label --------
// Rendered as a small "pill" sitting in the chart's top-margin band, centered
// on the reference line's x-coordinate. If centering would clip the pill on
// the left or right plot edge, we clamp it inward so the text is always fully
// visible.

interface MarketMedianLabelProps {
  viewBox: { x: number; y: number; width: number; height: number };
  value: number;
}

function MarketMedianLabel({ viewBox, value }: MarketMedianLabelProps) {
  if (!viewBox || typeof viewBox.x !== 'number') return null;
  // For a vertical ReferenceLine in a horizontal BarChart, Recharts passes
  // viewBox = { x: lineX, y: plotTop, width: 0, height: plotHeight }.
  const { x: lineX, y: plotTop } = viewBox;

  const text = `Market Median · ${formatDollarsAbbrev(value)}`;
  const padX = 6;
  const approxCharWidth = 5.6;
  const pillWidth = Math.ceil(text.length * approxCharWidth + padX * 2);
  const pillHeight = 16;

  // Center the pill on the line. Clamp the left edge so the pill never leaves
  // the chart's visible area — the common case is the line sitting near the
  // left side of the plot, which would otherwise clip the label.
  let pillX = lineX - pillWidth / 2;
  if (pillX < 2) pillX = 2;
  const pillY = Math.max(2, plotTop - pillHeight - 4);

  return (
    <g>
      {/* short connector from the pill down to the dashed line */}
      <line
        x1={lineX}
        x2={lineX}
        y1={pillY + pillHeight}
        y2={plotTop}
        stroke={REFERENCE_COLOR}
        strokeDasharray="2 2"
        strokeWidth={1}
      />
      <rect
        x={pillX}
        y={pillY}
        width={pillWidth}
        height={pillHeight}
        rx={3}
        ry={3}
        fill="#ffffff"
        stroke={REFERENCE_COLOR}
        strokeWidth={1}
      />
      <text
        x={pillX + pillWidth / 2}
        y={pillY + pillHeight / 2 + 3}
        textAnchor="middle"
        fill={REFERENCE_COLOR}
        fontSize={10}
        fontWeight={600}
      >
        {text}
      </text>
    </g>
  );
}

// -------- Legend --------

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-slate-600">
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function SubtitleBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-center text-[10px] font-semibold mt-1"
      style={{ color: MUTED_COLOR, letterSpacing: '0.14em' }}
    >
      {children}
    </div>
  );
}

export default function ZipMedianBarChart({
  data,
  overallMedianPrice,
  title = 'Median Price by ZIP',
  subtitle,
}: ZipMedianBarChartProps) {
  const filtered = data
    .filter((d) => d.medianPrice !== null || d.medianPricePerSqft !== null)
    .sort((a, b) => (b.medianPrice ?? 0) - (a.medianPrice ?? 0));

  if (filtered.length === 0) {
    return (
      <div>
        <h3 className="text-xl font-bold mb-1" style={{ color: TITLE_COLOR }}>
          {title}
        </h3>
        <p className="text-slate-500 text-sm">No ZIP data available</p>
      </div>
    );
  }

  // Shared-spine geometry. Chart top/bottom margins MUST match the center
  // spine column's header/footer spacers so ZIP labels sit at the exact same
  // y-position as the bar rows in both charts.
  const MARGIN_TOP = 32;      // room above the plot area for the "ZIP CODE" header
  const MARGIN_BOTTOM = 28;   // room below the plot area for X-axis tick labels
  const rowHeight = 36;
  const chartHeight = Math.max(
    280,
    filtered.length * rowHeight + MARGIN_TOP + MARGIN_BOTTOM,
  );

  // Shared chart tweaks: hidden Y-axis (removes any axis-line artifact), 
  // consistent top/bottom margins so bar rows align with the ZIP spine.
  const sharedBarChartProps = {
    data: filtered,
    layout: 'vertical' as const,
    barCategoryGap: '25%',
  };

  return (
    <div>
      {/* Header: title (top-left) + legend (top-right) */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h3 className="text-xl font-bold leading-tight" style={{ color: TITLE_COLOR }}>
            {title}
          </h3>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-5 pt-1">
          <LegendDot color={PRICE_COLOR} label="Median Price" />
          <LegendDot color={PPSF_COLOR} label="Median $/sqft" />
        </div>
      </div>

      {/* Shared-spine layout: [Left chart] · [ZIP spine] · [Right chart].
          Row 1 holds the three columns at the same height; row 2 holds the
          two X-axis subtitles centered under their own charts only. */}
      <div
        className="grid gap-x-4 md:gap-x-6"
        style={{ gridTemplateColumns: '1fr 80px 1fr' }}
      >
        {/* ---- Row 1, Col 1: Total Median Price chart ---- */}
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              {...sharedBarChartProps}
              margin={{ top: MARGIN_TOP, right: 8, left: 8, bottom: MARGIN_BOTTOM }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={formatDollarsAbbrev}
                tick={{ fontSize: 11, fill: MUTED_COLOR }}
                axisLine={{ stroke: AXIS_COLOR }}
                tickLine={{ stroke: AXIS_COLOR }}
              />
              {/* Hidden Y-axis — prevents any phantom axis line/border. */}
              <YAxis type="category" dataKey="zip" hide />
              <Tooltip
                content={<PriceTooltip />}
                cursor={{ fill: 'rgba(15, 118, 110, 0.06)' }}
              />
              {overallMedianPrice !== null && Number.isFinite(overallMedianPrice) && (
                <ReferenceLine
                  x={overallMedianPrice}
                  stroke={REFERENCE_COLOR}
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  ifOverflow="extendDomain"
                  label={(props) => (
                    <MarketMedianLabel
                      viewBox={props.viewBox as { x: number; y: number; width: number; height: number }}
                      value={overallMedianPrice}
                    />
                  )}
                />
              )}
              <Bar
                dataKey="medianPrice"
                fill={PRICE_COLOR}
                radius={[0, 4, 4, 0]}
                animationDuration={600}
                maxBarSize={22}
              >
                {/* Values live INSIDE the bar so they don't crash into the
                    center ZIP spine. White text on teal keeps strong contrast. */}
                <LabelList
                  dataKey="medianPrice"
                  position="insideRight"
                  formatter={labelPriceFormatter}
                  style={{ fill: '#ffffff', fontSize: 11, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ---- Row 1, Col 2: ZIP spine (shared Y-axis) ---- */}
        <div
          className="flex flex-col items-stretch"
          style={{ height: chartHeight }}
        >
          {/* Header band — height matches chart top margin so the word
              "ZIP CODE" sits above the plot area cleanly. */}
          <div
            className="flex items-end justify-center"
            style={{ height: MARGIN_TOP, paddingBottom: 6 }}
          >
            <span
              className="text-[10px] font-semibold uppercase"
              style={{ color: MUTED_COLOR, letterSpacing: '0.14em' }}
            >
              ZIP Code
            </span>
          </div>

          {/* Label column — `justify-around` places each label at the exact
              same y-center that Recharts uses to center each bar
              (H · (i + 0.5) / N), so rows align perfectly across both charts. */}
          <div className="flex-1 flex flex-col justify-around items-center">
            {filtered.map((d) => (
              <div
                key={d.zip}
                className="text-sm font-semibold tabular-nums"
                style={{ color: TITLE_COLOR }}
              >
                {d.zip}
              </div>
            ))}
          </div>

          {/* Footer spacer — height matches chart bottom margin. */}
          <div style={{ height: MARGIN_BOTTOM }} />
        </div>

        {/* ---- Row 1, Col 3: Median $/sqft chart ---- */}
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              {...sharedBarChartProps}
              margin={{ top: MARGIN_TOP, right: 56, left: 8, bottom: MARGIN_BOTTOM }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={formatPpsf}
                tick={{ fontSize: 11, fill: MUTED_COLOR }}
                axisLine={{ stroke: AXIS_COLOR }}
                tickLine={{ stroke: AXIS_COLOR }}
              />
              {/* Hidden Y-axis — kills the stray axis line that looked like a
                  black border on this side. */}
              <YAxis type="category" dataKey="zip" hide />
              <Tooltip
                content={<PpsfTooltip />}
                cursor={{ fill: 'rgba(225, 29, 72, 0.06)' }}
              />
              <Bar
                dataKey="medianPricePerSqft"
                fill={PPSF_COLOR}
                radius={[0, 4, 4, 0]}
                animationDuration={600}
                maxBarSize={22}
              >
                {/* Outside the bar on the right — plenty of room, no spine to
                    collide with on this side. */}
                <LabelList
                  dataKey="medianPricePerSqft"
                  position="right"
                  formatter={labelPpsfFormatter}
                  style={{ fill: TITLE_COLOR, fontSize: 11, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ---- Row 2: X-axis subtitles, centered under charts only ---- */}
        <div style={{ gridColumn: '1 / 2' }}>
          <SubtitleBar>TOTAL MEDIAN PRICE</SubtitleBar>
        </div>
        <div style={{ gridColumn: '2 / 3' }} />
        <div style={{ gridColumn: '3 / 4' }}>
          <SubtitleBar>MEDIAN $ PER SQFT</SubtitleBar>
        </div>
      </div>
    </div>
  );
}
