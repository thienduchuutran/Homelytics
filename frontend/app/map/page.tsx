'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import FavoritesLink from '@/components/FavoritesLink';
import PropertyQuickViewDrawer from '@/components/PropertyQuickViewDrawer';
import MapList from '@/components/map/MapList';

// Dynamically import MapView to avoid SSR issues with Leaflet
const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false });

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

interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export default function MapPage() {
  const [properties, setProperties] = useState<MapProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [quickViewId, setQuickViewId] = useState<string | null>(null);
  const [currentBounds, setCurrentBounds] = useState<MapBounds | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Simple filters (minimal implementation)
  const [filters, setFilters] = useState({
    minPrice: 0,
    maxPrice: 10000000,
    minBeds: 0,
    minBaths: 0,
    city: '',
    zip: '',
  });

  const fetchAbortControllerRef = useRef<AbortController | null>(null);

  // Fetch properties for current bounds
  const fetchProperties = useCallback(async (bounds: MapBounds) => {
    // Cancel previous request
    if (fetchAbortControllerRef.current) {
      fetchAbortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    fetchAbortControllerRef.current = abortController;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('minLat', bounds.minLat.toString());
      params.append('maxLat', bounds.maxLat.toString());
      params.append('minLng', bounds.minLng.toString());
      params.append('maxLng', bounds.maxLng.toString());
      params.append('limit', '200');

      // Add optional filters
      if (filters.minPrice > 0) params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice < 10000000) params.append('maxPrice', filters.maxPrice.toString());
      if (filters.minBeds > 0) params.append('minBeds', filters.minBeds.toString());
      if (filters.minBaths > 0) params.append('minBaths', filters.minBaths.toString());
      if (filters.city) params.append('city', filters.city);
      if (filters.zip) params.append('zip', filters.zip);

      const response = await fetch(
        `https://titus-duc.calisearch.org/api/get_properties_bbox.php?${params.toString()}`,
        {
          signal: abortController.signal,
          headers: { 'Accept': 'application/json' },
          mode: 'cors',
          credentials: 'omit',
        }
      );

      if (abortController.signal.aborted) return;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (abortController.signal.aborted) return;

      if (Array.isArray(data)) {
        setProperties(data);
      } else {
        setProperties([]);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Error fetching properties:', err);
      setError(err.message || 'Failed to fetch properties');
      setProperties([]);
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [filters]);

  // Handle bounds change from map
  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    setCurrentBounds(bounds);
    fetchProperties(bounds);
  }, [fetchProperties]);

  // Handle property click (from marker or list)
  const handlePropertyClick = useCallback((property: MapProperty) => {
    setSelectedPropertyId(property.id);
    setQuickViewId(property.id);
  }, []);

  // Re-fetch when filters change (if we have current bounds)
  useEffect(() => {
    if (currentBounds) {
      fetchProperties(currentBounds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]); // Only re-fetch when filters change, not when fetchProperties changes

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/houses"
                className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Listings
              </Link>
              <h1 className="text-xl font-bold text-gray-900">Map Explorer</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
              </button>
              <button
                onClick={() => window.dispatchEvent(new Event('pnc:open-chat'))}
                className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium rounded-lg hover:bg-blue-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Chat Assistant
              </button>
              <FavoritesLink />
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        {showFilters && (
          <div className="border-t border-gray-200 bg-gray-50 px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Min Price</label>
                <input
                  type="number"
                  value={filters.minPrice || ''}
                  onChange={(e) => setFilters({ ...filters, minPrice: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Max Price</label>
                <input
                  type="number"
                  value={filters.maxPrice === 10000000 ? '' : filters.maxPrice || ''}
                  onChange={(e) => setFilters({ ...filters, maxPrice: parseInt(e.target.value) || 10000000 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="No limit"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Min Beds</label>
                <input
                  type="number"
                  value={filters.minBeds || ''}
                  onChange={(e) => setFilters({ ...filters, minBeds: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Any"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Any city"
                />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-4 mt-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Map + List Container */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden" style={{ minHeight: 0 }}>
        {/* Map - Left side (65% on desktop) */}
        <div 
          className="w-full md:w-[65%] h-[400px] md:h-full relative overflow-hidden"
          style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
        >
          <MapView
            properties={properties}
            onMarkerClick={handlePropertyClick}
            onBoundsChange={handleBoundsChange}
            selectedPropertyId={selectedPropertyId}
            hoveredPropertyId={hoveredPropertyId}
          />
        </div>

        {/* List - Right side (35% on desktop) or bottom sheet (mobile) */}
        <div 
          className="w-full md:w-[35%] h-[300px] md:h-full border-t md:border-t-0 md:border-l border-gray-200 bg-white overflow-hidden flex flex-col"
        >
          <MapList
            properties={properties}
            onPropertyClick={handlePropertyClick}
            selectedPropertyId={selectedPropertyId}
            isLoading={loading}
            onPropertyHover={setHoveredPropertyId}
          />
        </div>
      </div>

      {/* Quick View Drawer */}
      <PropertyQuickViewDrawer
        open={quickViewId !== null}
        propertyId={quickViewId}
        onClose={() => {
          setQuickViewId(null);
          setSelectedPropertyId(null);
        }}
      />
    </div>
  );
}

