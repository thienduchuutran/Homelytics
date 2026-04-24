'use client';

import { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

// ---------- Palette ----------
//
// Matches the editorial palette used in PriceHistogramChart. The goal is "ink
// on paper, not neon on a dashboard" — so the accent color is a quiet dusty
// indigo, and the trend colors are muted emerald/rose rather than the usual
// saturated stock-ticker green and red.

const ACCENT = '#5B6F97';      // dusty indigo — the house color
const TEXT = '#0F172A';         // slate-900
const TREND_UP = '#047857';     // muted emerald
const TREND_DOWN = '#BE123C';   // muted rose
const TREND_FLAT = '#64748B';   // slate-500

const SERIF_STACK =
  'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif';

// ---------- Public types ----------

export interface TrendPoint {
  month: string;             // "YYYY-MM"
  avgPrice: number | null;
}

export interface KpiCardsData {
  count: number;
  medianPrice: number | null;
  medianPricePerSqft: number | null;
  avgDom: number | null;
  /** Up to 6 ascending monthly points. Less than 2 hides the sparkline. */
  trend: TrendPoint[];
  /** The ZIP with the lowest median $/sqft among filtered ZIPs, if it beats
   *  the overall median $/sqft — otherwise pass null. */
  bestValueZip: { zip: string; pricePerSqft: number } | null;
}

interface InsightsKpiCardsProps {
  data: KpiCardsData;
}

// ---------- Formatters ----------

function formatCurrency(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ---------- Sparkline ----------
//
// A tiny 80×24 line chart — no axes, no dots, no animation. Its whole job is
// to give the median price card a second dimension: "here's the number, and
// here's its shape over time." Color signals direction.

function PriceSparkline({
  data,
  color,
}: {
  data: TrendPoint[];
  color: string;
}) {
  const chartData = useMemo(
    () =>
      data
        .filter((d) => d.avgPrice !== null && Number.isFinite(d.avgPrice as number))
        .map((d) => ({ v: d.avgPrice as number })),
    [data],
  );

  if (chartData.length < 2) return null;

  return (
    <div
      style={{ width: 80, height: 24 }}
      aria-hidden="true"
      title="6-month trend"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 3, right: 1, bottom: 3, left: 1 }}
        >
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------- Trend math ----------

interface TrendInfo {
  direction: 'up' | 'down' | 'flat';
  color: string;
  pctChange: number | null;
  points: number;
}

/**
 * Simple first-to-last % change. Anything under ~0.5% we treat as flat so the
 * copy doesn't scream "up 0.1%" — that's noise, not a story.
 */
function computeTrend(points: TrendPoint[]): TrendInfo {
  const valid = points.filter(
    (p) => p.avgPrice !== null && Number.isFinite(p.avgPrice as number),
  );
  if (valid.length < 2) {
    return { direction: 'flat', color: ACCENT, pctChange: null, points: valid.length };
  }
  const first = valid[0].avgPrice as number;
  const last = valid[valid.length - 1].avgPrice as number;
  const pctChange = first > 0 ? ((last - first) / first) * 100 : 0;

  if (Math.abs(pctChange) < 0.5) {
    return { direction: 'flat', color: TREND_FLAT, pctChange, points: valid.length };
  }
  return {
    direction: pctChange > 0 ? 'up' : 'down',
    color: pctChange > 0 ? TREND_UP : TREND_DOWN,
    pctChange,
    points: valid.length,
  };
}

// ---------- Card shell ----------

interface KpiCardProps {
  label: string;
  value: string;
  /** Small unit noun rendered just after the value (e.g., "days"). */
  suffix?: string;
  /** Right-aligned element rendered on the same line as the label
   *  (e.g., the sparkline). */
  inline?: React.ReactNode;
  caption?: React.ReactNode;
}

function KpiCard({ label, value, suffix, inline, caption }: KpiCardProps) {
  return (
    <div
      className="bg-white rounded-md border border-slate-100 p-6 transition-shadow hover:shadow-md"
      style={{ boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)' }}
    >
      {/* Row 1: label left, sparkline right (sparkline may be absent) */}
      <div className="flex items-center justify-between gap-3 mb-4 min-h-[24px]">
        <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500 font-semibold">
          {label}
        </span>
        {inline && <div className="flex-shrink-0">{inline}</div>}
      </div>

      {/* Row 2: the big number (serif, tabular) and optional small suffix. */}
      <div className="flex items-baseline gap-2">
        <span
          className="text-slate-900 tabular-nums leading-none"
          style={{ fontFamily: SERIF_STACK, fontSize: 32, fontWeight: 600 }}
        >
          {value}
        </span>
        {suffix && (
          <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400 font-medium">
            {suffix}
          </span>
        )}
      </div>

      {/* Row 3: caption in italic serif — reads like a photo caption below
                  a broadsheet data graphic. Optional. */}
      {caption && (
        <p
          className="mt-3 text-[13px] italic text-slate-500 leading-snug"
          style={{ fontFamily: SERIF_STACK }}
        >
          {caption}
        </p>
      )}
    </div>
  );
}

// ---------- Captions ----------
//
// Pulled out of the main component so each card's "voice" is easy to tweak
// without threading render props through the tree.

function renderMedianPriceCaption(trend: TrendInfo): React.ReactNode {
  if (trend.points === 0) {
    return <>trend data not available for this slice</>;
  }
  if (trend.pctChange === null) {
    return <>a single snapshot, not yet a trend</>;
  }
  if (trend.direction === 'flat') {
    return <>holding steady across the last {trend.points} months</>;
  }
  const verb = trend.direction === 'up' ? 'up' : 'down';
  const pct = Math.abs(trend.pctChange).toFixed(1);
  return (
    <>
      —{' '}
      <span
        className="tabular-nums not-italic font-semibold"
        style={{ color: trend.color }}
      >
        {verb} {pct}%
      </span>{' '}
      over the last {trend.points} months
    </>
  );
}

function renderListingsCaption(avgDom: number | null): React.ReactNode {
  if (avgDom === null || avgDom <= 0) {
    return <>— days-on-market data not available for this slice</>;
  }
  return (
    <>
      averaging{' '}
      <span className="tabular-nums not-italic font-semibold text-slate-700">
        {Math.round(avgDom)} days
      </span>{' '}
      on market
    </>
  );
}

function renderPpsfCaption(
  medianPpsf: number | null,
  bestValueZip: KpiCardsData['bestValueZip'],
): React.ReactNode {
  if (medianPpsf === null) {
    return <>— not enough square-footage data for a median</>;
  }
  if (bestValueZip && bestValueZip.pricePerSqft < medianPpsf) {
    return (
      <>
        best value in{' '}
        <span className="not-italic font-semibold text-slate-700">
          ZIP {bestValueZip.zip}
        </span>{' '}
        at{' '}
        <span className="tabular-nums not-italic font-semibold text-slate-700">
          ${Math.round(bestValueZip.pricePerSqft)}/sqft
        </span>
      </>
    );
  }
  return <>— remarkably even across the filtered area</>;
}

function renderDomCaption(avgDom: number | null): React.ReactNode {
  if (avgDom === null || avgDom <= 0) return null;
  const days = Math.round(avgDom);
  if (days <= 14) return <>a quick market, listings turn over fast</>;
  if (days <= 45) return <>a healthy, balanced pace</>;
  if (days <= 90) return <>listings are taking their time</>;
  return <>a slow market, buyers have the leverage</>;
}

// ---------- Composite: the 4-card row ----------

export default function InsightsKpiCards({ data }: InsightsKpiCardsProps) {
  const trend = useMemo(() => computeTrend(data.trend), [data.trend]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
      <KpiCard
        label="Median List Price"
        value={formatCurrency(data.medianPrice)}
        inline={<PriceSparkline data={data.trend} color={trend.color} />}
        caption={renderMedianPriceCaption(trend)}
      />

      <KpiCard
        label="Listings"
        value={data.count.toLocaleString()}
        caption={renderListingsCaption(data.avgDom)}
      />

      <KpiCard
        label="Median $ per Sqft"
        value={
          data.medianPricePerSqft !== null
            ? `$${Math.round(data.medianPricePerSqft).toLocaleString()}`
            : '—'
        }
        caption={renderPpsfCaption(data.medianPricePerSqft, data.bestValueZip)}
      />

      <KpiCard
        label="Avg Days on Market"
        value={
          data.avgDom !== null && data.avgDom > 0
            ? Math.round(data.avgDom).toLocaleString()
            : '—'
        }
        suffix={data.avgDom !== null && data.avgDom > 0 ? 'days' : undefined}
        caption={renderDomCaption(data.avgDom)}
      />
    </div>
  );
}
