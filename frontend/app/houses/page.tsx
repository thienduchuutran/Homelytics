'use client';

import { useState, useMemo } from 'react';
import { FilterOptions } from '@/types/house';
import { mockHouses } from '@/data/mockHouses';
import HouseCard from '@/components/HouseCard';
import SearchBar from '@/components/SearchBar';
import FilterPanel from '@/components/FilterPanel';

export default function HousesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    minPrice: 0,
    maxPrice: 10000000,
    bedrooms: null,
    bathrooms: null,
    propertyType: 'all',
    status: 'all',
  });

  // Filter and search logic
  const filteredHouses = useMemo(() => {
    return mockHouses.filter((house) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        house.title.toLowerCase().includes(searchLower) ||
        house.address.toLowerCase().includes(searchLower) ||
        house.city.toLowerCase().includes(searchLower) ||
        house.state.toLowerCase().includes(searchLower) ||
        house.description.toLowerCase().includes(searchLower);

      // Price filter
      const matchesPrice = house.price >= filters.minPrice && house.price <= filters.maxPrice;

      // Bedrooms filter
      const matchesBedrooms =
        filters.bedrooms === null || house.bedrooms >= filters.bedrooms;

      // Bathrooms filter
      const matchesBathrooms =
        filters.bathrooms === null || house.bathrooms >= filters.bathrooms;

      // Property type filter
      const matchesPropertyType =
        filters.propertyType === 'all' || house.propertyType === filters.propertyType;

      // Status filter
      const matchesStatus =
        filters.status === 'all' || house.status === filters.status;

      return (
        matchesSearch &&
        matchesPrice &&
        matchesBedrooms &&
        matchesBathrooms &&
        matchesPropertyType &&
        matchesStatus
      );
    });
  }, [searchTerm, filters]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Find Your Dream Home</h1>
          <p className="mt-2 text-gray-600">Browse through our collection of properties</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
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
            {filteredHouses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredHouses.map((house) => (
                  <HouseCard key={house.id} house={house} />
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
    </div>
  );
}
