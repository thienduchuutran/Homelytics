/**
 * parseFiltersFromQuery.ts
 * Helper function to parse filter parameters from URL query string
 */

export interface ParsedFilters {
  city: string | null;
  zip: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  minBeds: number | null;
}

export function parseFiltersFromQuery(searchParams: URLSearchParams): ParsedFilters {
  return {
    city: searchParams.get('city') || null,
    zip: searchParams.get('zip') || null,
    minPrice: searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!, 10) : null,
    maxPrice: searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!, 10) : null,
    minBeds: searchParams.get('minBeds') ? parseInt(searchParams.get('minBeds')!, 10) : null,
  };
}

export function buildInsightsUrl(filters: {
  city?: string | null;
  zip?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  bedrooms?: number | null;
}): string {
  const params = new URLSearchParams();
  
  if (filters.city) params.append('city', filters.city);
  if (filters.zip) params.append('zip', filters.zip);
  if (filters.minPrice && filters.minPrice > 0) params.append('minPrice', filters.minPrice.toString());
  if (filters.maxPrice && filters.maxPrice < 10000000) params.append('maxPrice', filters.maxPrice.toString());
  // Map bedrooms to minBeds for insights API
  if (filters.bedrooms && filters.bedrooms > 0) params.append('minBeds', filters.bedrooms.toString());
  
  return `/insights${params.toString() ? '?' + params.toString() : ''}`;
}

