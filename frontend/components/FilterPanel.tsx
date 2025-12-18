'use client';

import { FilterOptions } from '@/types/house';

interface FilterPanelProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
}

export default function FilterPanel({ filters, onFilterChange }: FilterPanelProps) {
  const updateFilter = (key: keyof FilterOptions, value: number | string | null) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  const resetFilters = () => {
    onFilterChange({
      minPrice: 0,
      maxPrice: 10000000,
      bedrooms: null,
      bathrooms: null,
      propertyType: 'all',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Filters</h2>
        <button
          onClick={resetFilters}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Reset All
        </button>
      </div>

      <div className="space-y-6">
        {/* Price Range */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Price Range
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Min Price</label>
              <input
                type="number"
                value={filters.minPrice}
                onChange={(e) => updateFilter('minPrice', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Min"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Max Price</label>
              <input
                type="number"
                value={filters.maxPrice}
                onChange={(e) => updateFilter('maxPrice', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Max"
              />
            </div>
          </div>
        </div>

        {/* Bedrooms */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Bedrooms
          </label>
          <div className="flex gap-2 flex-wrap">
            {[null, 1, 2, 3, 4, 5].map((num) => (
              <button
                key={num?.toString() || 'any'}
                onClick={() => updateFilter('bedrooms', num)}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  filters.bedrooms === num
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {num === null ? 'Any' : `${num}+`}
              </button>
            ))}
          </div>
        </div>

        {/* Bathrooms */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Bathrooms
          </label>
          <div className="flex gap-2 flex-wrap">
            {[null, 1, 2, 3, 4].map((num) => (
              <button
                key={num?.toString() || 'any'}
                onClick={() => updateFilter('bathrooms', num)}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  filters.bathrooms === num
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {num === null ? 'Any' : `${num}+`}
              </button>
            ))}
          </div>
        </div>

        {/* Property Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Property Type
          </label>
          <select
            value={filters.propertyType}
            onChange={(e) => updateFilter('propertyType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="Residential">Residential</option>
            <option value="SingleFamilyResidence">Single Family Residence</option>
            <option value="Condominium">Condominium</option>
            <option value="Townhouse">Townhouse</option>
            <option value="Duplex">Duplex</option>
            <option value="Triplex">Triplex</option>
            <option value="Cabin">Cabin</option>
            <option value="ManufacturedHome">Manufactured Home</option>
            <option value="ManufacturedOnLand">Manufactured On Land</option>
            <option value="MobileHome">Mobile Home</option>
            <option value="MixedUse">Mixed Use</option>
            <option value="StockCooperative">Stock Cooperative</option>
          </select>
        </div>

      </div>
    </div>
  );
}
