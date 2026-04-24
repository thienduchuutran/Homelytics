'use client';

import { useMemo, useState } from 'react';

interface MapProperty {
  id: string;
  lat: number;
  lng: number;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  photo: string;
  status: string;
  dom: number | null;
}

interface MapListProps {
  properties: MapProperty[];
  onPropertyClick: (property: MapProperty) => void;
  selectedPropertyId?: string | null;
  isLoading?: boolean;
  onPropertyHover?: (propertyId: string | null) => void;
}

// Compact price formatting: $210k, $875k, $2.4M
// Listing prices span a huge range, so a fixed $XXX,XXX format eats horizontal
// space in the narrow sidebar. Compact form keeps the stats strip scannable.
function formatCompactPrice(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const m = value / 1_000_000;
    // Show one decimal for values like $2.4M, but drop it for clean millions ($3M not $3.0M)
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (abs >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${Math.round(value)}`;
}

// Median is more representative than mean for price distributions — one
// $20M listing shouldn't drag the "typical" price upward.
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export default function MapList({ properties, onPropertyClick, selectedPropertyId, isLoading, onPropertyHover }: MapListProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Recomputes whenever the viewport's property set changes — e.g. as the
  // user pans from Beverly Hills to East LA, these numbers update live.
  const stats = useMemo(() => {
    if (properties.length === 0) {
      return { count: 0, medianPrice: null as number | null, avgBeds: null as number | null, minPrice: null as number | null, maxPrice: null as number | null };
    }
    const prices: number[] = [];
    const beds: number[] = [];
    let min = Infinity;
    let max = -Infinity;
    for (const p of properties) {
      if (Number.isFinite(p.price) && p.price > 0) {
        prices.push(p.price);
        if (p.price < min) min = p.price;
        if (p.price > max) max = p.price;
      }
      if (Number.isFinite(p.beds) && p.beds > 0) beds.push(p.beds);
    }
    const avgBeds = beds.length > 0 ? beds.reduce((sum, b) => sum + b, 0) / beds.length : null;
    return {
      count: properties.length,
      medianPrice: median(prices),
      avgBeds,
      minPrice: min === Infinity ? null : min,
      maxPrice: max === -Infinity ? null : max,
    };
  }, [properties]);

  const handleMouseEnter = (propertyId: string) => {
    setHoveredId(propertyId);
    onPropertyHover?.(propertyId);
  };

  const handleMouseLeave = () => {
    setHoveredId(null);
    onPropertyHover?.(null);
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b border-gray-200 bg-white flex-shrink-0">
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-baseline gap-2">
              <div className="skeleton h-7 w-10 rounded"></div>
              <span className="text-sm text-gray-400">properties in view</span>
            </div>
          </div>
          <div className="px-4 pb-3 border-t border-gray-100 pt-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Median</span>
                <div className="skeleton h-3 w-12 rounded"></div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Avg</span>
                <div className="skeleton h-3 w-10 rounded"></div>
              </div>
              <div className="col-span-2 flex items-center justify-between">
                <span className="text-gray-400">Range</span>
                <div className="skeleton h-3 w-24 rounded"></div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
              <div className="skeleton h-40 w-full rounded-lg mb-3"></div>
              <div className="skeleton h-4 w-3/4 mb-2"></div>
              <div className="skeleton h-4 w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasStats = stats.count > 0 && stats.medianPrice !== null;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header + live stats strip */}
      <div className="border-b border-gray-200 bg-white flex-shrink-0">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 tabular-nums">
              {stats.count.toLocaleString()}
            </span>
            <span className="text-sm text-gray-600">
              {stats.count === 1 ? 'property' : 'properties'} in view
            </span>
          </div>
        </div>
        {hasStats && (
          <div className="px-4 pb-3 border-t border-gray-100 pt-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Median</span>
                <span className="font-semibold text-gray-900 tabular-nums">
                  {formatCompactPrice(stats.medianPrice as number)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Avg</span>
                <span className="font-semibold text-gray-900 tabular-nums">
                  {stats.avgBeds !== null ? `${stats.avgBeds.toFixed(1)} bd` : '—'}
                </span>
              </div>
              <div className="col-span-2 flex items-center justify-between">
                <span className="text-gray-500">Range</span>
                <span className="font-semibold text-gray-900 tabular-nums">
                  {stats.minPrice !== null && stats.maxPrice !== null
                    ? `${formatCompactPrice(stats.minPrice)} – ${formatCompactPrice(stats.maxPrice)}`
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {properties.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <p className="text-lg font-medium mb-2">No properties found</p>
            <p className="text-sm">Try adjusting the map view or filters</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {properties.map((property) => {
              const isSelected = selectedPropertyId === property.id;
              const isHovered = hoveredId === property.id;

              return (
                <div
                  key={property.id}
                  onClick={() => onPropertyClick(property)}
                  onMouseEnter={() => handleMouseEnter(property.id)}
                  onMouseLeave={handleMouseLeave}
                  className={`p-4 cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-blue-50 border-l-4 border-l-blue-600' 
                      : isHovered 
                        ? 'bg-gray-50' 
                        : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Image */}
                    <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-gray-200">
                      <img
                        src={property.photo?.replace(/^http:\/\//i, 'https://')}
                        alt={property.address}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800';
                        }}
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm mb-1 truncate">
                        {property.address || 'Address not available'}
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        {property.city}, {property.state} {property.zip}
                      </div>
                      <div className="text-lg font-bold text-blue-600 mb-1">
                        ${property.price.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">
                        {property.beds} bed{property.beds !== 1 ? 's' : ''} • {property.baths} bath{property.baths !== 1 ? 's' : ''}
                        {property.sqft ? ` • ${property.sqft.toLocaleString()} sqft` : ''}
                        {property.dom !== null ? ` • ${property.dom} DOM` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

