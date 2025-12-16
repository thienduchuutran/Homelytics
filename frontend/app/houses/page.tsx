'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { House, FilterOptions } from '@/types/house';
import HouseCard from '@/components/HouseCard';
import SearchBar from '@/components/SearchBar';
import FilterPanel from '@/components/FilterPanel';
import FavoritesLink from '@/components/FavoritesLink';
import PropertyQuickViewDrawer from '@/components/PropertyQuickViewDrawer';

export default function HousesPage() {
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    minPrice: 0,
    maxPrice: 10000000,
    bedrooms: null,
    bathrooms: null,
    propertyType: 'all',
    status: 'all',
  });
  const [sortBy, setSortBy] = useState<string>('newest');
  const [quickViewId, setQuickViewId] = useState<string | null>(null);
  const scrollRestoredRef = useRef(false);

  const SCROLL_STORAGE_KEY = 'pnc:scroll:home:v1';

  // Use houses directly from API (API handles all filtering)
  const filteredHouses = houses;

  // Restore scroll position AFTER content is loaded and rendered
  useEffect(() => {
    // Only restore once, and only after loading is complete and we have content
    if (scrollRestoredRef.current || loading || filteredHouses.length === 0) return;

    try {
      const savedScroll = sessionStorage.getItem(SCROLL_STORAGE_KEY);
      if (savedScroll !== null) {
        const scrollY = parseInt(savedScroll, 10);
        if (!isNaN(scrollY) && scrollY > 0) {
          // Wait for DOM to be fully rendered with all content
          const restoreScroll = () => {
            // Use setTimeout to ensure all React updates are flushed
            setTimeout(() => {
              window.scrollTo({
                top: scrollY,
                behavior: 'auto' as ScrollBehavior
              });
              scrollRestoredRef.current = true;
            }, 0);
          };

          // Double RAF to ensure layout is complete
          requestAnimationFrame(() => {
            requestAnimationFrame(restoreScroll);
          });
        } else {
          scrollRestoredRef.current = true;
        }
      } else {
        scrollRestoredRef.current = true;
      }
    } catch (error) {
      console.error('Error restoring scroll position:', error);
      scrollRestoredRef.current = true;
    }
  }, [loading, filteredHouses.length]); // Restore when loading completes and content is ready

  // Save scroll position with debounce
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        try {
          sessionStorage.setItem(SCROLL_STORAGE_KEY, window.scrollY.toString());
        } catch (error) {
          console.error('Error saving scroll position:', error);
        }
      }, 150); // 150ms debounce
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearTimeout(scrollTimeout);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Debounce search term (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch houses from API
  useEffect(() => {
    const fetchHouses = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Build query parameters
        const params = new URLSearchParams();
        if (filters.minPrice > 0) params.append('minPrice', filters.minPrice.toString());
        if (filters.maxPrice < 10000000) params.append('maxPrice', filters.maxPrice.toString());
        if (filters.bedrooms !== null) params.append('bedrooms', filters.bedrooms.toString());
        if (filters.bathrooms !== null) params.append('bathrooms', filters.bathrooms.toString());
        if (filters.propertyType !== 'all') params.append('propertyType', filters.propertyType);
        if (filters.status !== 'all') params.append('status', filters.status);
        if (debouncedSearchTerm.trim()) params.append('search', debouncedSearchTerm.trim());
        // Add sorting parameters
        if (sortBy) params.append('sortBy', sortBy);

        // Use relative path - works in both development (if PHP server running) and production
        // In production (static export), this resolves to: https://titus-duc.calisearch.org/api/get_properties.php
        // In local dev with PHP server, this resolves to: http://localhost:PORT/api/get_properties.php
        const apiUrl = `https://titus-duc.calisearch.org/api/get_properties.php${params.toString() ? '?' + params.toString() : ''}`;
        
        let response: Response;
        try {
          console.log('Attempting to fetch from:', apiUrl);
          response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
            // Add mode to handle CORS
            mode: 'cors',
            credentials: 'omit',
          });
        } catch (fetchError) {
          // Network error (CORS, connection refused, etc.)
          const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
          const errorName = fetchError instanceof Error ? fetchError.name : 'Unknown';
          
          console.error('Fetch error:', {
            error: fetchError,
            message: errorMessage,
            name: errorName,
            apiUrl: apiUrl,
          });
          
          // Provide more specific error messages
          if (errorName === 'TypeError' && errorMessage.includes('Failed to fetch')) {
            throw new Error(
              `Network error: Unable to reach API endpoint.\n\n` +
              `URL: ${apiUrl}\n\n` +
              `Possible causes:\n` +
              `1. CORS issue - Check that the server allows requests from ${typeof window !== 'undefined' ? window.location.origin : 'your domain'}\n` +
              `2. API endpoint not accessible - Verify the URL is correct\n` +
              `3. Server is down or unreachable\n\n` +
              `To test: Open ${apiUrl} directly in your browser.`
            );
          }
          
          throw new Error(
            `Unable to connect to API endpoint. ` +
            `Error: ${errorMessage} (${errorName}). ` +
            `URL: ${apiUrl}`
          );
        }
        
        if (!response.ok) {
          // Log the full URL for debugging
          console.error(`API request failed: ${response.status} ${response.statusText}`, {
            url: apiUrl,
            status: response.status,
            statusText: response.statusText,
          });
          
          if (response.status === 404) {
            throw new Error(
              `API endpoint not found (404). ` +
              `The file /api/get_properties.php does not exist on the server. ` +
              `Please upload the PHP file to the /api/ folder in your web root. ` +
              `See DEPLOYMENT_FIX.md for detailed instructions.`
            );
          }
          
          // Try to get error message from response body (for non-404 errors)
          let errorDetail = '';
          try {
            const errorData = await response.clone().text();
            if (errorData) {
              // Check if response is HTML (PHP error) instead of JSON
              if (errorData.trim().startsWith('<')) {
                errorDetail = 'Server returned HTML instead of JSON. This usually means a PHP error occurred. Check server error logs.';
                console.error('HTML Response (likely PHP error):', errorData.substring(0, 500));
              } else {
                try {
                  const parsed = JSON.parse(errorData);
                  errorDetail = parsed.error || errorData;
                } catch {
                  errorDetail = errorData.substring(0, 200); // Limit length
                }
              }
            }
          } catch {
            // Ignore parse errors
          }
          
          throw new Error(
            `Failed to fetch properties: ${response.status} ${response.statusText}` +
            (errorDetail ? ` - ${errorDetail}` : '')
          );
        }
        
        // Try to parse JSON response
        let data;
        try {
          const text = await response.text();
          
          // Check if response is HTML (PHP error) instead of JSON
          if (text.trim().startsWith('<')) {
            // Extract error message from HTML if possible
            const errorMatch = text.match(/<b>(.*?)<\/b>/i) || text.match(/Fatal error: (.*?)(?:\n|<)/i) || text.match(/Parse error: (.*?)(?:\n|<)/i);
            const errorMsg = errorMatch ? errorMatch[1] : 'PHP error (see full response in console)';
            console.error('Server returned HTML instead of JSON. Full response:', text);
            throw new Error(
              `PHP Error: ${errorMsg}. ` +
              `Full error details are in the browser console. ` +
              `Common causes: database connection failure, missing PHP extension, or syntax error.`
            );
          }
          
          data = JSON.parse(text);
          // ALWAYS log what we got - this will show in console
          console.log('=== API RESPONSE DEBUG ===');
          console.log('Full response:', data);
          console.log('Is array?', Array.isArray(data));
          console.log('Has _debug?', data && typeof data === 'object' && '_debug' in data);
          console.log('Has data property?', data && typeof data === 'object' && 'data' in data);
          if (data && typeof data === 'object' && '_debug' in data) {
            console.log('DEBUG OBJECT:', data._debug);
          }
          if (Array.isArray(data) && data.length > 0) {
            console.log('First item price:', data[0].price);
            console.log('Last item price:', data[data.length - 1].price);
          }
          if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
            console.log('First item price (from data.data):', data.data[0]?.price);
            console.log('Last item price (from data.data):', data.data[data.data.length - 1]?.price);
          }
          console.log('=== END DEBUG ===');
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          throw new Error(
            'Failed to parse server response. The server may have returned an error. ' +
            'Check browser console for details.'
          );
        }
        
        // Handle error response from PHP
        if (data && typeof data === 'object' && 'error' in data) {
          throw new Error(data.error);
        }
        
        // Handle debug response format (temporary - for debugging sorting)
        if (data && typeof data === 'object' && 'data' in data && '_debug' in data) {
          console.log('🔍 Debug info from API:', data._debug);
          console.log('First property price:', data.data[0]?.price);
          console.log('Last property price:', data.data[data.data.length - 1]?.price);
          setHouses(data.data);
          return;
        }
        
        // Ensure data is an array
        if (!Array.isArray(data)) {
          console.warn('API returned non-array data:', data);
          setHouses([]);
          return;
        }
        
        setHouses(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load properties');
        console.error('Error fetching houses:', err);
        setHouses([]); // Clear houses on error
      } finally {
        setLoading(false);
      }
    };

    fetchHouses();
  }, [filters, debouncedSearchTerm, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Find Your Dream Home</h1>
              <p className="mt-2 text-gray-600">Browse through our collection of properties</p>
            </div>
            <FavoritesLink />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
          <div className="flex gap-4">
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-4 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors font-medium text-gray-700 appearance-none pr-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="bedrooms-high">Bedrooms: Most</option>
                <option value="bedrooms-low">Bedrooms: Fewest</option>
                <option value="bathrooms-high">Bathrooms: Most</option>
                <option value="bathrooms-low">Bathrooms: Fewest</option>
                <option value="sqft-high">Square Feet: Largest</option>
                <option value="sqft-low">Square Feet: Smallest</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-4 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors font-medium text-gray-700 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filters
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-700">
            <span className="font-semibold">{filteredHouses.length}</span> properties found
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filter Panel */}
          {showFilters && (
            <aside className="lg:w-80 flex-shrink-0">
              <div className="sticky top-8">
                <FilterPanel filters={filters} onFilterChange={setFilters} />
              </div>
            </aside>
          )}

          {/* House Grid */}
          <main className="flex-1">
            {loading ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading properties...</p>
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <svg
                  className="mx-auto h-24 w-24 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">Error loading properties</h3>
                <p className="mt-2 text-gray-600">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : filteredHouses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredHouses.map((house) => (
                  <HouseCard 
                    key={house.id} 
                    house={house} 
                    onQuickView={(id) => setQuickViewId(id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <svg
                  className="mx-auto h-24 w-24 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No properties found</h3>
                <p className="mt-2 text-gray-600">
                  Try adjusting your search or filters to find more properties.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Quick View Drawer */}
      <PropertyQuickViewDrawer
        open={quickViewId !== null}
        propertyId={quickViewId}
        onClose={() => setQuickViewId(null)}
      />
    </div>
  );
}
