'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Label,
  ResponsiveContainer,
} from 'recharts';

// ---------- Public types ----------

export interface HistogramBucket {
  bucketMin: number;
  bucketMax: number;
  count: number;
}

interface PriceHistogramChartProps {
  data: HistogramBucket[];
  medianPrice: number | null;
  title?: string;
  subtitle?: string;
  height?: number;
  /**
   * Number of buckets per page. Defaults to 20 — enough to show distribution
   * shape without crushing the rotated X-axis labels.
   */
  pageSize?: number;
  /**
   * Drop trailing buckets that have 0 listings so empty space at the top of
   * the range doesn't eat a whole page. Defaults to true.
   */
  trimEmptyTail?: boolean;
}

// ---------- Palette ----------
//
// A quiet editorial palette. Dusty indigo does the heavy lifting, with a
// deeper shade reserved for the median bucket so it feels "called out"
// rather than highlighted with a neon mark. No bright tech-blue here —
// we want the chart to read as journalism, not a dashboard.

const BAR_COLOR = '#5B6F97';            // dusty indigo
const BAR_MEDIAN_COLOR = '#3D4E75';     // deeper indigo for the median bucket
const GRID_COLOR = '#E2E8F0';           // slate-200, used at low opacity
const MUTED_COLOR = '#64748B';          // slate-500, axis ticks
const ANNOTATION_COLOR = '#334155';     // slate-700, journalist's note
const REFERENCE_LINE_COLOR = '#94A3B8'; // slate-400, a hair of a guideline

const SERIF_STACK =
  'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif';

// ---------- Formatters ----------

function formatMoneyAbbrev(value: number): string {
  if (!Number.isFinite(value)) return '';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const m = value / 1_000_000;
    return m % 1 === 0 ? `$${m.toFixed(0)}M` : `$${m.toFixed(1)}M`;
  }
  // Uppercase K is the editorial convention ($750K, not $750k).
  return `$${Math.round(value / 1000)}K`;
}

function formatBucketLabel(b: HistogramBucket): string {
  return `${formatMoneyAbbrev(b.bucketMin)}–${formatMoneyAbbrev(b.bucketMax)}`;
}

// ---------- Tooltip ----------

interface ChartDatum {
  label: string;
  count: number;
  percent: number;        // Share of the GLOBAL total, not the page total
  bucketMin: number;
  bucketMax: number;
  isMedian: boolean;
}

interface TooltipPayloadEntry {
  payload: ChartDatum;
}
interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

/**
 * Conversational tooltip. Reads like a sentence a journalist might write —
 * numbers are bolded, the range sits at the end like the subject of the
 * sentence — rather than a two-column table of stats.
 */
function HistogramTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;

  // Gentle singular/plural handling so we don't ship copy like "1 homes".
  const isZero = row.count === 0;
  const isOne = row.count === 1;
  const countText = isZero ? 'No' : row.count.toLocaleString();
  const verb = isOne ? 'home is' : 'homes are';

  return (
    <div
      className="bg-white rounded-md px-4 py-3 text-[13px] max-w-[280px]"
      style={{
        boxShadow:
          '0 2px 14px rgba(15, 23, 42, 0.10), 0 0 1px rgba(15, 23, 42, 0.06)',
        fontFamily: SERIF_STACK,
      }}
    >
      <p className="text-slate-700 leading-relaxed">
        <span className="font-bold text-slate-900 tabular-nums">
          {countText}
        </span>{' '}
        {verb}
        {!isZero && (
          <>
            {' ('}
            <span className="font-bold text-slate-900 tabular-nums">
              {row.percent.toFixed(1)}%
            </span>
            {')'}
          </>
        )}
        {' listed between '}
        <span className="font-bold text-slate-900 tabular-nums">
          {row.label}
        </span>
        .
      </p>
    </div>
  );
}

// ---------- Pagination helpers ----------

/**
 * Drop trailing buckets whose count is 0. We keep internal zero-count buckets
 * (those represent real "gaps" in the distribution between populated ranges)
 * but there's no value in reserving page space for the empty high-end tail.
 */
function trimTrailingZeros(data: HistogramBucket[]): HistogramBucket[] {
  let end = data.length;
  while (end > 0 && data[end - 1].count === 0) end -= 1;
  return data.slice(0, end);
}

/** Locate the bucket index that contains `price` (inclusive at the top edge). */
function findBucketIndex(buckets: HistogramBucket[], price: number): number {
  return buckets.findIndex(
    (b, i) => price >= b.bucketMin && (price < b.bucketMax || i === buckets.length - 1),
  );
}

// ---------- Component ----------

export default function PriceHistogramChart({
  data,
  medianPrice,
  title = 'Price Distribution',
  subtitle,
  height = 340,
  pageSize = 20,
  trimEmptyTail = true,
}: PriceHistogramChartProps) {
  // ---- Derive everything that only depends on data once per data change ----
  const {
    buckets,
    globalTotal,
    totalPages,
    medianPageIdx,
    medianBucketIdx,
  } = useMemo(() => {
    const trimmed = trimEmptyTail ? trimTrailingZeros(data) : data.slice();
    const total = trimmed.reduce((s, b) => s + b.count, 0);
    const pages = Math.max(1, Math.ceil(trimmed.length / pageSize));

    let mBucketIdx = -1;
    if (medianPrice !== null && Number.isFinite(medianPrice) && trimmed.length > 0) {
      mBucketIdx = findBucketIndex(trimmed, medianPrice);
    }
    const mPageIdx = mBucketIdx >= 0 ? Math.floor(mBucketIdx / pageSize) : -1;

    return {
      buckets: trimmed,
      globalTotal: total,
      totalPages: pages,
      medianPageIdx: mPageIdx,
      medianBucketIdx: mBucketIdx,
    };
  }, [data, medianPrice, pageSize, trimEmptyTail]);

  // ---- Page state ----
  //
  // Default to the page containing the median — that's almost always where
  // users want to start because it's the densest part of the distribution.
  // Reset whenever the underlying data changes (new filters applied).
  const initialPage = medianPageIdx >= 0 ? medianPageIdx : 0;
  const [page, setPage] = useState(initialPage);

  useEffect(() => {
    setPage(medianPageIdx >= 0 ? medianPageIdx : 0);
  }, [medianPageIdx, totalPages]);

  // Clamp the page index defensively in case props change.
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);

  // ---- Derive the rows for the current page ----
  const { pageRows, pageRange, medianLabel } = useMemo(() => {
    const start = safePage * pageSize;
    const end = Math.min(start + pageSize, buckets.length);
    const slice = buckets.slice(start, end);

    const rows: ChartDatum[] = slice.map((b, i) => ({
      label: formatBucketLabel(b),
      count: b.count,
      // Percent is computed against the GLOBAL total — paging through the
      // chart shouldn't change what each bar represents.
      percent: globalTotal > 0 ? (b.count / globalTotal) * 100 : 0,
      bucketMin: b.bucketMin,
      bucketMax: b.bucketMax,
      isMedian: medianBucketIdx === start + i,
    }));

    const rangeText =
      slice.length > 0
        ? `${formatMoneyAbbrev(slice[0].bucketMin)} – ${formatMoneyAbbrev(
            slice[slice.length - 1].bucketMax,
          )}`
        : '';

    // Only show the median reference line on the page that actually contains
    // the median bucket.
    const mLabel =
      medianBucketIdx >= start && medianBucketIdx < end
        ? rows[medianBucketIdx - start]?.label ?? null
        : null;

    return { pageRows: rows, pageRange: rangeText, medianLabel: mLabel };
  }, [safePage, pageSize, buckets, globalTotal, medianBucketIdx]);

  if (buckets.length === 0) {
    return (
      <div>
        <h3
          className="text-slate-900 leading-tight tracking-tight"
          style={{ fontFamily: SERIF_STACK, fontSize: 28, fontWeight: 600 }}
        >
          {title}
        </h3>
        <p className="mt-3 text-slate-500 text-sm italic">
          No histogram data available
        </p>
      </div>
    );
  }

  const canPrev = safePage > 0;
  const canNext = safePage < totalPages - 1;
  const showPagination = totalPages > 1;
  const onMedianPage = medianPageIdx === safePage;

  return (
    <div>
      {/* Editorial title block — sits above the chart like a standfirst.
          Serif heading, italic subhead, small uppercase meta line below. */}
      <div className="mb-6">
        <h3
          className="text-slate-900 leading-tight tracking-tight"
          style={{ fontFamily: SERIF_STACK, fontSize: 28, fontWeight: 600 }}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            className="mt-2 italic text-slate-500 text-[15px] leading-relaxed max-w-prose"
            style={{ fontFamily: SERIF_STACK }}
          >
            {subtitle}
          </p>
        )}
        {showPagination && (
          <div className="mt-3 text-[11px] uppercase tracking-[0.14em] text-slate-400 font-medium tabular-nums">
            Showing <span className="text-slate-600">{pageRange}</span>
            <span className="mx-2 text-slate-300">·</span>
            Page {safePage + 1} of {totalPages}
          </div>
        )}
      </div>

      {/* Chart */}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={pageRows}
            margin={{ top: 36, right: 16, left: 8, bottom: 72 }}
            barCategoryGap="22%"
          >
            {/* A whisper of a horizontal grid — gives the eye a ruler without
                shouting. Vertical and axis lines are deliberately off. */}
            <CartesianGrid
              vertical={false}
              stroke={GRID_COLOR}
              strokeDasharray="3 6"
              strokeOpacity={0.7}
            />
            <XAxis
              dataKey="label"
              tick={{
                fontSize: 10,
                fill: MUTED_COLOR,
                letterSpacing: '0.08em',
              }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={20}
              angle={-45}
              textAnchor="end"
              height={70}
            />
            <YAxis
              allowDecimals={false}
              tick={{
                fontSize: 10,
                fill: MUTED_COLOR,
                letterSpacing: '0.08em',
              }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              content={<HistogramTooltip />}
              cursor={{ fill: 'rgba(91, 111, 151, 0.08)' }}
            />
            {medianLabel && (
              <ReferenceLine
                x={medianLabel}
                stroke={REFERENCE_LINE_COLOR}
                strokeDasharray="2 5"
                strokeWidth={1}
                ifOverflow="extendDomain"
                label={
                  <Label
                    value="the median listing sits here"
                    position="top"
                    offset={14}
                    style={{
                      fill: ANNOTATION_COLOR,
                      fontSize: 12,
                      fontStyle: 'italic',
                      fontFamily: SERIF_STACK,
                      letterSpacing: '0.01em',
                    }}
                  />
                }
              />
            )}
            <Bar
              dataKey="count"
              fill={BAR_COLOR}
              fillOpacity={0.85}
              radius={[2, 2, 0, 0]}
              animationBegin={200}
              animationDuration={700}
              activeBar={{ fillOpacity: 1 }}
            >
              {/* Cell override: the median bucket gets a slightly deeper
                  shade so the eye lands on it first, in concert with the
                  italic annotation above. */}
              {pageRows.map((row, i) => (
                <Cell
                  key={i}
                  fill={row.isMedian ? BAR_MEDIAN_COLOR : BAR_COLOR}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pagination controls */}
      {showPagination && (
        <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <PagerButton
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              label="Previous"
              direction="prev"
            />
            <PagerButton
              disabled={!canNext}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              label="Next"
              direction="next"
            />
          </div>

          <div className="flex items-center gap-4">
            {medianPageIdx >= 0 && !onMedianPage && (
              <button
                type="button"
                onClick={() => setPage(medianPageIdx)}
                className="text-[13px] italic text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline"
                style={{ fontFamily: SERIF_STACK }}
              >
                Jump to the median page
              </button>
            )}
            <PageDots current={safePage} total={totalPages} onSelect={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Small subcomponents ----------

function PagerButton({
  disabled,
  onClick,
  label,
  direction,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
  direction: 'prev' | 'next';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm',
        'text-[11px] uppercase tracking-[0.14em] font-medium',
        'border transition-colors',
        disabled
          ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-white'
          : 'border-slate-300 text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-400 hover:text-slate-800',
      ].join(' ')}
    >
      {direction === 'prev' && <span aria-hidden>←</span>}
      {label}
      {direction === 'next' && <span aria-hidden>→</span>}
    </button>
  );
}

/**
 * Compact dot indicator. Caps at 10 dots so long tails (e.g. 30 pages) don't
 * blow up the footer — past that threshold we fall back to the "page N of M"
 * text in the header, which is always present.
 */
function PageDots({
  current,
  total,
  onSelect,
}: {
  current: number;
  total: number;
  onSelect: (p: number) => void;
}) {
  if (total > 10) return null;
  return (
    <div className="flex items-center gap-1.5" role="tablist" aria-label="Chart page">
      {Array.from({ length: total }, (_, i) => {
        const active = i === current;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`Page ${i + 1}`}
            aria-current={active ? 'page' : undefined}
            className={[
              'h-2 rounded-full transition-all',
              active ? 'w-5' : 'w-2 bg-slate-300 hover:bg-slate-400',
            ].join(' ')}
            style={active ? { backgroundColor: BAR_COLOR } : undefined}
          />
        );
      })}
    </div>
  );
}
