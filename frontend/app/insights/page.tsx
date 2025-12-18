'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { parseFiltersFromQuery, buildInsightsUrl } from '@/app/lib/parseFiltersFromQuery';
import FavoritesLink from '@/components/FavoritesLink';

interface InsightsSummary {
  count: number;
  medianPrice: number | null;
  medianPricePerSqft: number | null;
  avgBeds: number | null;
  avgDom: number | null;
}

interface ZipData {
  zip: string;
  count: number;
  medianPrice: number | null;
  medianPricePerSqft: number | null;
}

interface HistogramBucket {
  bucketMin: number;
  bucketMax: number;
  count: number;
}

export default function InsightsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [summary, setSummary] = useState<InsightsSummary | null>(null);
  const [zipData, setZipData] = useState<ZipData[]>([]);
  const [histogram, setHistogram] = useState<HistogramBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter form state
  const [filters, setFilters] = useState({
    city: '',
    zip: '',
    minPrice: '',
    maxPrice: '',
    minBeds: '',
    minBaths: '',
    propertyType: 'all',
  });
  
  // Parse filters from URL on mount and when URL changes
  const parsedFilters = useMemo(() => {
    return parseFiltersFromQuery(searchParams);
  }, [searchParams]);
  
  // Initialize form from URL params
  useEffect(() => {
    setFilters({
      city: parsedFilters.city || '',
      zip: parsedFilters.zip || '',
      minPrice: parsedFilters.minPrice?.toString() || '',
      maxPrice: parsedFilters.maxPrice?.toString() || '',
      minBeds: parsedFilters.minBeds?.toString() || '',
      minBaths: parsedFilters.minBaths?.toString() || '',
      propertyType: parsedFilters.propertyType || 'all',
    });
  }, [parsedFilters]);
  
  // Fetch insights data
  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const params = new URLSearchParams();
        if (parsedFilters.city) params.append('city', parsedFilters.city);
        if (parsedFilters.zip) params.append('zip', parsedFilters.zip);
        if (parsedFilters.minPrice) params.append('minPrice', parsedFilters.minPrice.toString());
        if (parsedFilters.maxPrice) params.append('maxPrice', parsedFilters.maxPrice.toString());
        if (parsedFilters.minBeds) params.append('minBeds', parsedFilters.minBeds.toString());
        if (parsedFilters.minBaths) params.append('minBaths', parsedFilters.minBaths.toString());
        if (parsedFilters.propertyType && parsedFilters.propertyType !== 'all') params.append('propertyType', parsedFilters.propertyType);
        
        const baseUrl = 'https://titus-duc.calisearch.org/api';
        const queryString = params.toString() ? '?' + params.toString() : '';
        
        // Fetch all three endpoints in parallel
        const [summaryRes, zipRes, histRes] = await Promise.all([
          fetch(`${baseUrl}/insights_summary.php${queryString}`, {
            headers: { 'Accept': 'application/json' },
            mode: 'cors',
            credentials: 'omit',
          }),
          fetch(`${baseUrl}/insights_median_by_zip.php${queryString}`, {
            headers: { 'Accept': 'application/json' },
            mode: 'cors',
            credentials: 'omit',
          }),
          fetch(`${baseUrl}/insights_price_histogram.php${queryString}`, {
            headers: { 'Accept': 'application/json' },
            mode: 'cors',
            credentials: 'omit',
          }),
        ]);
        
        if (!summaryRes.ok || !zipRes.ok || !histRes.ok) {
          throw new Error('Failed to fetch insights data');
        }
        
        const [summaryData, zipData, histData] = await Promise.all([
          summaryRes.json(),
          zipRes.json(),
          histRes.json(),
        ]);
        
        setSummary(summaryData);
        setZipData(Array.isArray(zipData) ? zipData : []);
        setHistogram(Array.isArray(histData) ? histData : []);
      } catch (err) {
        console.error('Error fetching insights:', err);
        setError(err instanceof Error ? err.message : 'Failed to load insights');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInsights();
  }, [parsedFilters]);
  
  // Handle filter form submission
  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const params = new URLSearchParams();
    if (filters.city.trim()) params.append('city', filters.city.trim());
    if (filters.zip.trim()) params.append('zip', filters.zip.trim());
    if (filters.minPrice.trim()) params.append('minPrice', filters.minPrice.trim());
    if (filters.maxPrice.trim()) params.append('maxPrice', filters.maxPrice.trim());
    if (filters.minBeds.trim()) params.append('minBeds', filters.minBeds.trim());
    if (filters.minBaths.trim()) params.append('minBaths', filters.minBaths.trim());
    if (filters.propertyType && filters.propertyType !== 'all') params.append('propertyType', filters.propertyType);
    
    router.push(`/insights${params.toString() ? '?' + params.toString() : ''}`);
  };
  
  // Generate filter summary text
  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (parsedFilters.city) parts.push(parsedFilters.city);
    if (parsedFilters.zip) parts.push(`ZIP ${parsedFilters.zip}`);
    if (parsedFilters.minPrice || parsedFilters.maxPrice) {
      const min = parsedFilters.minPrice ? `$${(parsedFilters.minPrice / 1000).toFixed(0)}k` : '';
      const max = parsedFilters.maxPrice ? `$${(parsedFilters.maxPrice / 1000).toFixed(0)}k` : '';
      if (min && max) parts.push(`${min}–${max}`);
      else if (min) parts.push(`${min}+`);
      else if (max) parts.push(`up to ${max}`);
    }
    if (parsedFilters.minBeds) parts.push(`${parsedFilters.minBeds}+ beds`);
    if (parsedFilters.minBaths) parts.push(`${parsedFilters.minBaths}+ baths`);
    if (parsedFilters.propertyType && parsedFilters.propertyType !== 'all') {
      const typeLabels: Record<string, string> = {
        'Residential': 'Residential',
        'SingleFamilyResidence': 'Single Family',
        'Condominium': 'Condominium',
        'Townhouse': 'Townhouse',
        'Duplex': 'Duplex',
        'Triplex': 'Triplex',
        'Cabin': 'Cabin',
        'ManufacturedHome': 'Manufactured',
        'ManufacturedOnLand': 'Manufactured on Land',
        'MobileHome': 'Mobile',
        'MixedUse': 'Mixed Use',
        'StockCooperative': 'Stock Cooperative',
      };
      parts.push(typeLabels[parsedFilters.propertyType] || parsedFilters.propertyType);
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'All properties';
  }, [parsedFilters]);
  
  // Generate insights callouts
  const insights = useMemo(() => {
    const callouts: string[] = [];
    
    if (summary && summary.count > 0) {
      // Price range insight
      if (histogram.length > 0) {
        const maxBucket = histogram.reduce((max, b) => b.count > max.count ? b : max, histogram[0]);
        if (maxBucket.count > 0) {
          const min = (maxBucket.bucketMin / 1000).toFixed(0);
          const max = (maxBucket.bucketMax / 1000).toFixed(0);
          callouts.push(`Most listings fall in $${min}k–$${max}k`);
        }
      }
      
      // ZIP insight
      if (zipData.length > 0 && summary.medianPricePerSqft) {
        const lowestPpsfZip = zipData
          .filter(z => z.medianPricePerSqft !== null)
          .sort((a, b) => (a.medianPricePerSqft || 0) - (b.medianPricePerSqft || 0))[0];
        
        if (lowestPpsfZip && lowestPpsfZip.medianPricePerSqft && lowestPpsfZip.medianPricePerSqft < summary.medianPricePerSqft!) {
          callouts.push(`ZIP ${lowestPpsfZip.zip} has the lowest median $/sqft ($${lowestPpsfZip.medianPricePerSqft.toFixed(0)}) among the selected area`);
        }
      }
      
      // DOM insight
      if (summary.avgDom !== null && summary.avgDom > 0) {
        callouts.push(`Listings in this selection average ${Math.round(summary.avgDom)} days on market`);
      }
    }
    
    return callouts;
  }, [summary, zipData, histogram]);
  
  // Format currency
  const formatCurrency = (value: number | null) => {
    if (value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  // Chart helpers
  const maxZipCount = zipData.length > 0 ? Math.max(...zipData.map(z => z.count)) : 1;
  const maxHistCount = histogram.length > 0 ? Math.max(...histogram.map(h => h.count)) : 1;
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Market Insights</h1>
              <p className="mt-2 text-gray-600">{filterSummary}</p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/houses"
                className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium rounded-lg hover:bg-blue-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Listings
              </Link>
              <Link
                href="/map"
                className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium rounded-lg hover:bg-blue-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Map
              </Link>
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
      </header>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Apply Different Filters</h2>
          <form onSubmit={handleFilterSubmit} className="space-y-6">
            {/* Price Range */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Price Range</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Min Price</label>
                  <input
                    type="number"
                    value={filters.minPrice}
                    onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Min"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Max Price</label>
                  <input
                    type="number"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Max"
                  />
                </div>
              </div>
            </div>

            {/* Bedrooms */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Bedrooms</label>
              <div className="flex gap-2 flex-wrap">
                {[null, 1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num?.toString() || 'any'}
                    type="button"
                    onClick={() => setFilters({ ...filters, minBeds: num === null ? '' : num.toString() })}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                      (num === null && filters.minBeds === '') || filters.minBeds === num?.toString()
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
              <label className="block text-sm font-semibold text-gray-700 mb-3">Bathrooms</label>
              <div className="flex gap-2 flex-wrap">
                {[null, 1, 2, 3, 4].map((num) => (
                  <button
                    key={num?.toString() || 'any'}
                    type="button"
                    onClick={() => setFilters({ ...filters, minBaths: num === null ? '' : num.toString() })}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                      (num === null && filters.minBaths === '') || filters.minBaths === num?.toString()
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
              <label className="block text-sm font-semibold text-gray-700 mb-3">Property Type</label>
              <select
                value={filters.propertyType}
                onChange={(e) => setFilters({ ...filters, propertyType: e.target.value })}
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

            {/* City and ZIP (optional additional filters) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">City (Optional)</label>
                <input
                  type="text"
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any city"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">ZIP (Optional)</label>
                <input
                  type="text"
                  value={filters.zip}
                  onChange={(e) => setFilters({ ...filters, zip: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any ZIP"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Update Insights
              </button>
            </div>
          </form>
        </div>
        
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading insights...</p>
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
            <h3 className="mt-4 text-lg font-medium text-gray-900">Error loading insights</h3>
            <p className="mt-2 text-gray-600">{error}</p>
          </div>
        ) : summary && summary.count > 0 ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Median List Price</h3>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(summary.medianPrice)}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Median $/sqft</h3>
                <p className="text-3xl font-bold text-gray-900">
                  {summary.medianPricePerSqft ? `$${summary.medianPricePerSqft.toFixed(0)}` : 'N/A'}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Average Beds</h3>
                <p className="text-3xl font-bold text-gray-900">
                  {summary.avgBeds ? summary.avgBeds.toFixed(1) : 'N/A'}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Listing Count</h3>
                <p className="text-3xl font-bold text-gray-900">{summary.count.toLocaleString()}</p>
              </div>
            </div>
            
            {/* Insight Callouts */}
            {insights.length > 0 && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-8 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Insights</h3>
                <ul className="space-y-2">
                  {insights.map((insight, idx) => (
                    <li key={idx} className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-gray-700">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Median Price by ZIP */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Median Price by ZIP</h3>
                {zipData.length > 0 ? (
                  <div className="space-y-3">
                    {zipData.map((zip) => (
                      <div key={zip.zip} className="flex items-center gap-4">
                        <div className="w-20 text-sm font-medium text-gray-700">{zip.zip}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="bg-blue-600 h-8 rounded flex items-center justify-end pr-2"
                              style={{
                                width: `${(zip.count / maxZipCount) * 100}%`,
                                minWidth: '40px',
                              }}
                            >
                              {zip.medianPrice && (
                                <span className="text-white text-xs font-medium">
                                  {formatCurrency(zip.medianPrice)}
                                </span>
                              )}
                            </div>
                            <span className="text-sm text-gray-500">({zip.count})</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No ZIP data available</p>
                )}
              </div>
              
              {/* Price Distribution Histogram */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Price Distribution</h3>
                {histogram.length > 0 ? (
                  <div className="space-y-2">
                    {histogram.map((bucket, idx) => (
                      <div key={idx} className="flex items-center gap-4">
                        <div className="w-32 text-xs text-gray-600">
                          ${(bucket.bucketMin / 1000).toFixed(0)}k–${(bucket.bucketMax / 1000).toFixed(0)}k
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="bg-green-600 h-6 rounded flex items-center justify-end pr-2"
                              style={{
                                width: `${(bucket.count / maxHistCount) * 100}%`,
                                minWidth: '30px',
                              }}
                            >
                              <span className="text-white text-xs font-medium">{bucket.count}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No histogram data available</p>
                )}
              </div>
            </div>
            
            {/* Average $/bedroom by ZIP */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Average $/sqft by ZIP</h3>
              {zipData.length > 0 ? (
                <div className="space-y-3">
                  {zipData
                    .filter(z => z.medianPricePerSqft !== null)
                    .sort((a, b) => (b.medianPricePerSqft || 0) - (a.medianPricePerSqft || 0))
                    .map((zip) => (
                      <div key={zip.zip} className="flex items-center gap-4">
                        <div className="w-20 text-sm font-medium text-gray-700">{zip.zip}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="bg-purple-600 h-8 rounded flex items-center justify-end pr-2"
                              style={{
                                width: `${((zip.medianPricePerSqft || 0) / Math.max(...zipData.filter(z => z.medianPricePerSqft !== null).map(z => z.medianPricePerSqft || 0))) * 100}%`,
                                minWidth: '40px',
                              }}
                            >
                              <span className="text-white text-xs font-medium">
                                ${zip.medianPricePerSqft?.toFixed(0)}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500">({zip.count})</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500">No ZIP data available</p>
              )}
            </div>
          </>
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
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No data available</h3>
            <p className="mt-2 text-gray-600">
              Try adjusting your filters to see insights.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

